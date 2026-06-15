import sql from '../connection';
import type { LikeInfo } from '@bubbleblog/shared';

export async function getArticleIdBySlug(slug: string): Promise<number | null> {
  const rows = await sql`SELECT id FROM articles WHERE slug = ${slug}`;
  return rows.length > 0 ? rows[0].id : null;
}

export async function toggleLike(articleId: number, fingerprint: string): Promise<LikeInfo> {
  try {
    await sql`INSERT INTO likes (article_id, fingerprint) VALUES (${articleId}, ${fingerprint})`;
  } catch (e: any) {
    if (!e.message?.includes('duplicate') && !e.message?.includes('unique')) {
      throw e;
    }
  }

  return getLikeInfo(articleId, fingerprint);
}

export async function getLikeInfo(articleId: number, fingerprint: string): Promise<LikeInfo> {
  const countRow = await sql`SELECT COUNT(*)::int as count FROM likes WHERE article_id = ${articleId}`;
  const likedRow = await sql`SELECT COUNT(*)::int as cnt FROM likes WHERE article_id = ${articleId} AND fingerprint = ${fingerprint}`;
  return {
    count: countRow[0].count,
    liked: likedRow[0].cnt > 0,
  };
}
