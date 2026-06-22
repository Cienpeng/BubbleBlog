import { corsHeaders, handleCors } from '../middleware/cors';
import { requireAuth } from '../middleware/auth';
import { getDailyViews, getAllArticlesReadingStats, getLatestArticlesReadingStats, getArticleReadingStats } from '../db/queries/stats';

export async function handleStatsAPI(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const auth = await requireAuth(req);
  if (!auth.authorized) return auth.response!;

  // GET /api/admin/stats/views?days=30
  if (url.pathname === '/api/admin/stats/views' && req.method === 'GET') {
    const days = parseInt(url.searchParams.get('days') || '30');
    const data = await getDailyViews(days);
    return Response.json(
      { success: true, data, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  // GET /api/admin/stats/articles-reading
  if (url.pathname === '/api/admin/stats/articles-reading' && req.method === 'GET') {
    const limit = url.searchParams.get('limit');
    const data = limit ? await getLatestArticlesReadingStats(parseInt(limit)) : await getAllArticlesReadingStats();
    return Response.json(
      { success: true, data, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  // GET /api/admin/stats/reading/:articleId
  const readingMatch = url.pathname.match(/^\/api\/admin\/stats\/reading\/(\d+)$/);
  if (readingMatch && req.method === 'GET') {
    const data = await getArticleReadingStats(parseInt(readingMatch[1]));
    if (!data) {
      return Response.json(
        { success: false, error: 'Article not found' },
        { status: 404, headers: corsHeaders() }
      );
    }
    return Response.json(
      { success: true, data, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}
