import sql from '../connection';
import type { Tag } from '@bubbleblog/shared';

export async function getAllTags(): Promise<Tag[]> {
  return await sql`
    SELECT t.id, t.name, t.slug, COUNT(at2.article_id)::int as article_count
    FROM tags t
    LEFT JOIN article_tags at2 ON t.id = at2.tag_id
    LEFT JOIN articles a ON a.id = at2.article_id AND a.status = 'published'
    GROUP BY t.id, t.name, t.slug
    ORDER BY article_count DESC`;
}

export async function getOrCreateTags(tagNames: string[]): Promise<Tag[]> {
  const tags: Tag[] = [];
  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').replace(/^-+|-+$/g, '');
    let rows = await sql`SELECT * FROM tags WHERE slug = ${slug}`;
    if (rows.length === 0) {
      rows = await sql`INSERT INTO tags (name, slug) VALUES (${trimmed}, ${slug}) RETURNING *`;
    }
    tags.push(rows[0] as Tag);
  }
  return tags;
}

export async function setArticleTags(articleId: number, tagIds: number[]): Promise<void> {
  await sql`DELETE FROM article_tags WHERE article_id = ${articleId}`;
  if (tagIds.length > 0) {
    const values = tagIds.map(tid => `(${articleId}, ${tid})`).join(', ');
    await sql.unsafe(`INSERT INTO article_tags (article_id, tag_id) VALUES ${values}`);
  }
}
