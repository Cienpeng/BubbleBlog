import { corsHeaders, handleCors } from '../middleware/cors';
import { requireAuth } from '../middleware/auth';
import { getDailyViews, getAllDailyViews, getAllArticlesReadingStats, getLatestArticlesReadingStats, getArticleReadingStats, type DailyViews, type ArticleReadingStats } from '../db/queries/stats';

export async function handleStatsAPI(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const auth = await requireAuth(req);
  if (!auth.authorized) return auth.response!;

  // GET /api/admin/stats/views/export — all historical daily page views
  if (url.pathname === '/api/admin/stats/views/export' && req.method === 'GET') {
    const data = await getAllDailyViews();
    return new Response(buildDailyViewsCSV(data), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="page_views.csv"',
        'Cache-Control': 'no-store',
        ...corsHeaders(),
      },
    });
  }

  // GET /api/admin/stats/articles-reading/export — all published articles
  if (url.pathname === '/api/admin/stats/articles-reading/export' && req.method === 'GET') {
    const data = await getAllArticlesReadingStats();
    return new Response(buildArticlesReadingCSV(data), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="articles_reading.csv"',
        'Cache-Control': 'no-store',
        ...corsHeaders(),
      },
    });
  }

  // GET /api/admin/stats/views?days=30
  if (url.pathname === '/api/admin/stats/views' && req.method === 'GET') {
    const days = parseInt(url.searchParams.get('days') || '30');
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return Response.json({ success: false, error: 'days must be between 1 and 365' }, { status: 400, headers: corsHeaders() });
    }
    const data = await getDailyViews(days);
    return Response.json(
      { success: true, data },
      { headers: corsHeaders() }
    );
  }

  // GET /api/admin/stats/articles-reading
  if (url.pathname === '/api/admin/stats/articles-reading' && req.method === 'GET') {
    const limit = url.searchParams.get('limit');
    const parsedLimit = limit ? parseInt(limit) : undefined;
    if (parsedLimit !== undefined && (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100)) {
      return Response.json({ success: false, error: 'limit must be between 1 and 100' }, { status: 400, headers: corsHeaders() });
    }
    const data = parsedLimit ? await getLatestArticlesReadingStats(parsedLimit) : await getAllArticlesReadingStats();
    return Response.json(
      { success: true, data },
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
      { success: true, data },
      { headers: corsHeaders() }
    );
  }

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}

export function buildDailyViewsCSV(data: DailyViews[]): string {
  const header = '日期,访问量';
  const rows = data.map(item => `${escapeCSVCell(item.date)},${item.count}`);
  return `\ufeff${[header, ...rows].join('\n')}`;
}

export function buildArticlesReadingCSV(data: ArticleReadingStats[]): string {
  const header = '文章ID,文章标题,文章标识,预计阅读分钟,实际平均秒数,实际平均分钟,阅读记录数,点赞数';
  const rows = data.map(item => [
    item.article_id,
    escapeCSVCell(item.title),
    escapeCSVCell(item.slug),
    item.estimated_minutes,
    Number(item.actual_avg_seconds).toFixed(2),
    Number(item.actual_avg_minutes).toFixed(2),
    item.session_count,
    item.likes_count,
  ].join(','));
  return `\ufeff${[header, ...rows].join('\n')}`;
}

function escapeCSVCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
