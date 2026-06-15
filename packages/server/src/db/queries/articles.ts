import sql from '../connection';
import type { Article, ArticleListItem, ArticleWithTags, CreateArticleInput, PaginatedResponse } from '@bubbleblog/shared';

export async function getPublishedArticles(
  page: number = 1,
  limit: number = 5,
  tag?: string
): Promise<PaginatedResponse<ArticleListItem>> {
  const offset = (page - 1) * limit;

  let countQuery: Promise<[{count: number}]>;
  let itemsQuery: Promise<any[]>;

  if (tag) {
    countQuery = sql`SELECT COUNT(DISTINCT a.id) as count
      FROM articles a
      JOIN article_tags at2 ON a.id = at2.article_id
      JOIN tags t ON t.id = at2.tag_id
      WHERE a.status = 'published' AND t.slug = ${tag}`;
    itemsQuery = sql`
      SELECT a.id, a.title, a.slug, a.excerpt, a.cover_image, a.reading_time, a.published_at
      FROM articles a
      JOIN article_tags at2 ON a.id = at2.article_id
      JOIN tags t ON t.id = at2.tag_id
      WHERE a.status = 'published' AND t.slug = ${tag}
      ORDER BY a.published_at DESC
      LIMIT ${limit} OFFSET ${offset}`;
  } else {
    countQuery = sql`SELECT COUNT(*) as count FROM articles a WHERE a.status = 'published'`;
    itemsQuery = sql`
      SELECT a.id, a.title, a.slug, a.excerpt, a.cover_image, a.reading_time, a.published_at
      FROM articles a
      WHERE a.status = 'published'
      ORDER BY a.published_at DESC
      LIMIT ${limit} OFFSET ${offset}`;
  }

  const [countResult, items] = await Promise.all([countQuery, itemsQuery]);

  // Fetch tags for each article
  const articleIds = items.map((a: any) => a.id);
  let tagMap: Record<number, any[]> = {};
  if (articleIds.length > 0) {
    const tagRows = await sql`
      SELECT at2.article_id, t.id, t.name, t.slug
      FROM article_tags at2
      JOIN tags t ON t.id = at2.tag_id
      WHERE at2.article_id = ANY(${articleIds})`;
    for (const row of tagRows) {
      if (!tagMap[row.article_id]) tagMap[row.article_id] = [];
      tagMap[row.article_id].push({ id: row.id, name: row.name, slug: row.slug });
    }
  }

  return {
    items: items.map((a: any) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      cover_image: a.cover_image,
      reading_time: a.reading_time,
      published_at: a.published_at,
      tags: tagMap[a.id] || [],
    })),
    total: countResult[0].count,
    page,
    limit,
    total_pages: Math.ceil(countResult[0].count / limit),
  };
}

export async function getArticleBySlug(slug: string): Promise<ArticleWithTags | null> {
  const rows = await sql`
    SELECT a.* FROM articles a WHERE a.slug = ${slug}`;
  if (rows.length === 0) return null;

  const article = rows[0];

  const tagRows = await sql`
    SELECT t.id, t.name, t.slug FROM tags t
    JOIN article_tags at2 ON t.id = at2.tag_id
    WHERE at2.article_id = ${article.id}`;

  // Get prev/next slugs
  const prevRow = await sql`
    SELECT slug FROM articles
    WHERE status = 'published' AND published_at < ${article.published_at}
    ORDER BY published_at DESC LIMIT 1`;
  const nextRow = await sql`
    SELECT slug FROM articles
    WHERE status = 'published' AND published_at > ${article.published_at}
    ORDER BY published_at ASC LIMIT 1`;

  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    content_md: article.content_md,
    content_html: article.content_html,
    excerpt: article.excerpt,
    cover_image: article.cover_image,
    status: article.status,
    reading_time: article.reading_time,
    published_at: article.published_at,
    created_at: article.created_at,
    updated_at: article.updated_at,
    tags: tagRows.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug })),
    prev_slug: prevRow.length > 0 ? prevRow[0].slug : null,
    next_slug: nextRow.length > 0 ? nextRow[0].slug : null,
  };
}

export async function createArticle(input: CreateArticleInput): Promise<Article> {
  const slug = generateSlug(input.title);
  const readingTime = Math.max(1, Math.ceil(input.content_md.length / 400));

  const rows = await sql`
    INSERT INTO articles (title, slug, content_md, excerpt, cover_image, reading_time)
    VALUES (${input.title}, ${slug}, ${input.content_md}, ${input.excerpt || null}, ${input.cover_image || null}, ${readingTime})
    RETURNING *`;

  return rows[0] as Article;
}

export async function updateArticle(id: number, input: Partial<CreateArticleInput>): Promise<Article | null> {
  const updates: string[] = [];
  const values: any[] = [];

  if (input.title !== undefined) {
    updates.push(`title = $${updates.length + 1}`);
    values.push(input.title);
    const newSlug = generateSlug(input.title);
    updates.push(`slug = $${updates.length + 1}`);
    values.push(newSlug);
  }
  if (input.content_md !== undefined) {
    updates.push(`content_md = $${updates.length + 1}`);
    values.push(input.content_md);
    const readingTime = Math.max(1, Math.ceil(input.content_md.length / 400));
    updates.push(`reading_time = $${updates.length + 1}`);
    values.push(readingTime);
  }
  if (input.excerpt !== undefined) {
    updates.push(`excerpt = $${updates.length + 1}`);
    values.push(input.excerpt);
  }
  if (input.cover_image !== undefined) {
    updates.push(`cover_image = $${updates.length + 1}`);
    values.push(input.cover_image);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const rows = await sql.unsafe(
    `UPDATE articles SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows.length > 0 ? (rows[0] as Article) : null;
}

export async function setArticleContentHtml(id: number, html: string): Promise<void> {
  await sql`UPDATE articles SET content_html = ${html}, updated_at = NOW() WHERE id = ${id}`;
}

export async function publishArticle(id: number): Promise<Article | null> {
  const rows = await sql`
    UPDATE articles SET status = 'published', published_at = NOW(), updated_at = NOW()
    WHERE id = ${id} AND status = 'draft'
    RETURNING *`;
  return rows.length > 0 ? (rows[0] as Article) : null;
}

export async function unpublishArticle(id: number): Promise<Article | null> {
  const rows = await sql`
    UPDATE articles SET status = 'draft', published_at = NULL, updated_at = NOW()
    WHERE id = ${id} AND status = 'published'
    RETURNING *`;
  return rows.length > 0 ? (rows[0] as Article) : null;
}

export async function deleteArticle(id: number): Promise<boolean> {
  const result = await sql`DELETE FROM articles WHERE id = ${id}`;
  return result.count > 0;
}

export async function getArticleById(id: number): Promise<Article | null> {
  const rows = await sql`SELECT * FROM articles WHERE id = ${id}`;
  return rows.length > 0 ? (rows[0] as Article) : null;
}

export async function getAllArticles(): Promise<Article[]> {
  return await sql`SELECT * FROM articles ORDER BY updated_at DESC`;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Date.now().toString(36);
}
