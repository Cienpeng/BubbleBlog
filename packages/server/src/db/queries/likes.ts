import sql from '../connection';
import type { LikeInfo } from '@bubbleblog/shared';

export async function getArticleIdBySlug(slug: string): Promise<number | null> {
  const rows = await sql`SELECT id FROM articles WHERE slug = ${slug}`;
  return rows.length > 0 ? rows[0].id : null;
}

export async function toggleLike(articleId: number, fingerprint: string): Promise<LikeInfo> {
  const existing = await sql`
    SELECT 1 FROM likes WHERE article_id = ${articleId} AND fingerprint = ${fingerprint}
  `;
  if (existing.length > 0) {
    await sql`
      DELETE FROM likes WHERE article_id = ${articleId} AND fingerprint = ${fingerprint}
    `;
  } else {
    await sql`
      INSERT INTO likes (article_id, fingerprint)
      VALUES (${articleId}, ${fingerprint})
    `;
  }
  return getLikeInfo(articleId, fingerprint);
}

export async function getLikeInfo(articleId: number, fingerprint: string): Promise<LikeInfo> {
  const rows = await sql`
    SELECT
      COUNT(*)::int as count,
      COUNT(*) FILTER (WHERE fingerprint = ${fingerprint})::int as liked_count
    FROM likes WHERE article_id = ${articleId}`;
  return {
    count: rows[0].count,
    liked: rows[0].liked_count > 0,
  };
}
