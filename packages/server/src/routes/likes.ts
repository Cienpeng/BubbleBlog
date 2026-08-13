import { corsHeaders, handleCors } from '../middleware/cors';
import { likeRateLimit } from '../middleware/ratelimit';
import { toggleLike, getLikeInfo } from '../db/queries/likes';
import sql from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { readJson } from '../middleware/body';
import { getVisitorId } from '../services/visitor-id';

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
      const auth = await requireAuth(req);
      if (!auth.authorized) {
        return Response.json({ success: false, error: 'Article not found' }, { status: 404, headers: corsHeaders() });
      }
    }

    const fingerprint = await getVisitorId(req, 'likes');
    const info = await getLikeInfo(article.id, fingerprint);
    return Response.json({ success: true, data: info }, { headers: corsHeaders() });
  }

  if (likesMatch && req.method === 'POST') {
    await readJson(req, 4 * 1024);
    const rateLimitResponse = likeRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const slug = decodeURIComponent(likesMatch[1]);
    
    // Security check: cannot like/unlike a draft unless you are an authenticated admin
    const articleRows = await sql`SELECT id, status FROM articles WHERE slug = ${slug}`;
    if (articleRows.length === 0) {
      return Response.json({ success: false, error: 'Article not found' }, { status: 404, headers: corsHeaders() });
    }
    const article = articleRows[0];
    if (article.status === 'draft') {
      const auth = await requireAuth(req);
      if (!auth.authorized) {
        return Response.json({ success: false, error: 'Article not found' }, { status: 404, headers: corsHeaders() });
      }
    }

    const fingerprint = await getVisitorId(req, 'likes');
    const info = await toggleLike(article.id, fingerprint);
    return Response.json({ success: true, data: info }, { headers: corsHeaders() });
  }

  return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders() });
}
