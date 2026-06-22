import { corsHeaders, handleCors } from '../middleware/cors';
import { likeRateLimit } from '../middleware/ratelimit';
import { getArticleIdBySlug, toggleLike, getLikeInfo } from '../db/queries/likes';

export async function handleLikes(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  const likesMatch = url.pathname.match(/^\/api\/articles\/([^\/]+)\/likes$/);
  if (likesMatch && req.method === 'GET') {
    const slug = decodeURIComponent(likesMatch[1]);
    const articleId = await getArticleIdBySlug(slug);
    if (!articleId) {
      return Response.json({ success: false, error: 'Article not found' }, { status: 404, headers: corsHeaders() });
    }
    const fingerprint = url.searchParams.get('fingerprint') || '';
    const info = await getLikeInfo(articleId, fingerprint);
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
    const articleId = await getArticleIdBySlug(slug);
    if (!articleId) {
      return Response.json({ success: false, error: 'Article not found' }, { status: 404, headers: corsHeaders() });
    }

    const info = await toggleLike(articleId, fingerprint);
    return Response.json({ success: true, data: info }, { headers: corsHeaders() });
  }

  return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders() });
}
