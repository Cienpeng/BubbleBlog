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
  const trimmed = tagNames.map(n => n.trim()).filter(Boolean);
  if (trimmed.length === 0) return [];

  // Generate slugs
  const nameSlugPairs = trimmed.map(name => ({
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').replace(/^-+|-+$/g, ''),
  }));

  const slugs = nameSlugPairs.map(p => p.slug);

  // Insert all missing tags in one batch (ignore conflicts)
  await sql`
    INSERT INTO tags ${sql(nameSlugPairs.map(p => [p.name, p.slug]))}
    ON CONFLICT (slug) DO NOTHING
  `;

  // Fetch all tags (existing + newly created)
  const rows = await sql`SELECT * FROM tags WHERE slug = ANY(${slugs})`;
  return rows as Tag[];
}

export async function setArticleTags(articleId: number, tagIds: number[]): Promise<void> {
  await sql`DELETE FROM article_tags WHERE article_id = ${articleId}`;
  if (tagIds.length > 0) {
    await sql`
      INSERT INTO article_tags (article_id, tag_id)
      ${sql(tagIds.map(tid => [articleId, tid]))}
    `;
  }
}
