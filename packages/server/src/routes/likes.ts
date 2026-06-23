import { corsHeaders, handleCors } from '../middleware/cors';
import { likeRateLimit } from '../middleware/ratelimit';
import { getArticleIdBySlug, toggleLike, getLikeInfo } from '../db/queries/likes';
import sql from '../db/connection';
import { verifyToken } from '../services/jwt';

async function getUserId(req: Request): Promise<{ userId: number; username: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(authHeader.slice(7));
  } catch (e) {
    return null;
  }
}

export async function handleLikes(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  const likesMatch = url.pathname.match(/^\/api\/articles\/([^\/]+)\/likes$/);
  if (likesMatch && req.method === 'GET') {
    const slug = decodeURIComponent(likesMatch[1]);
    
    // Security check: draft article likes are private and only viewable by authenticated admins
    const articleRows = await sql`SELECT id, status FROM articles WHERE slug = ${slug}`;
    if (articleRows.length === 0) {
      return Response.json({ success: false, error: 'Article not found' }, { status: 404, headers: corsHeaders() });
    }
    const article = articleRows[0];
    if (article.status === 'draft') {
      const user = await getUserId(req);
      if (!user) {
        return Response.json({ success: false, error: 'Article not found' }, { status: 404, headers: corsHeaders() });
      }
    }

    const fingerprint = url.searchParams.get('fingerprint') || '';
    const info = await getLikeInfo(article.id, fingerprint);
    return Response.json({ success: true, data: info }, { headers: corsHeaders() });
  }

  if (likesMatch && req.method === 'POST') {
    const body = await req.json();
    const fingerprint = (body.fingerprint || '').toString();
    if (!fingerprint) {
      return Response.json({ success: false, error: 'fingerprint is required' }, { status: 400, headers: corsHeaders() });
    }

    const rateLimitResponse = likeRateLimit(fingerprint);
    if (rateLimitResponse) return rateLimitResponse;

    const slug = decodeURIComponent(likesMatch[1]);
    
    // Security check: cannot like/unlike a draft unless you are an authenticated admin
    const articleRows = await sql`SELECT id, status FROM articles WHERE slug = ${slug}`;
    if (articleRows.length === 0) {
      return Response.json({ success: false, error: 'Article not found' }, { status: 404, headers: corsHeaders() });
    }
    const article = articleRows[0];
    if (article.status === 'draft') {
      const user = await getUserId(req);
      if (!user) {
        return Response.json({ success: false, error: 'Article not found' }, { status: 404, headers: corsHeaders() });
      }
    }

    const info = await toggleLike(article.id, fingerprint);
    return Response.json({ success: true, data: info }, { headers: corsHeaders() });
  }

  return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders() });
}
