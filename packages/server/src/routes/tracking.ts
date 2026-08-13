import { corsHeaders, handleCors } from '../middleware/cors';
import { recordPageView, recordReadingSession } from '../db/queries/stats';
import { readJson, RequestBodyError } from '../middleware/body';
import { trackingRateLimit } from '../middleware/ratelimit';
import { getVisitorId } from '../services/visitor-id';

export async function handleTracking(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // POST /api/track/view
  if (url.pathname === '/api/track/view' && req.method === 'POST') {
    const limited = trackingRateLimit(req);
    if (limited) return limited;
    try {
      const body = await readJson(req, 4 * 1024);
      const articleId = Number(body.article_id);
      if (!Number.isInteger(articleId) || articleId <= 0) {
        return Response.json({ success: false, error: 'Invalid tracking payload' }, { status: 400, headers: corsHeaders() });
      }
      const fp = await getVisitorId(req, 'tracking');

      await recordPageView(articleId, fp);

      return Response.json({ success: true, data: { ok: true } }, { headers: corsHeaders() });
    } catch (error) {
      if (error instanceof RequestBodyError) throw error;
      console.error('Failed to record page view:', error);
      return Response.json(
        { success: false, error: 'Failed to record page view' },
        { status: 500, headers: corsHeaders() }
      );
    }
  }

  // POST /api/track/reading
  if (url.pathname === '/api/track/reading' && req.method === 'POST') {
    const limited = trackingRateLimit(req);
    if (limited) return limited;
    try {
      const body = await readJson(req, 4 * 1024);
      const articleId = Number(body.article_id);
      const duration = Number(body.duration_seconds);
      if (
        !Number.isInteger(articleId) || articleId <= 0 ||
        !Number.isFinite(duration) || duration < 1 || duration > 7200
      ) {
        return Response.json({ success: false, error: 'Invalid tracking payload' }, { status: 400, headers: corsHeaders() });
      }
      const fp = await getVisitorId(req, 'tracking');

      await recordReadingSession(articleId, fp, duration);

      return Response.json({ success: true, data: { ok: true } }, { headers: corsHeaders() });
    } catch (error) {
      if (error instanceof RequestBodyError) throw error;
      console.error('Failed to record reading session:', error);
      return Response.json(
        { success: false, error: 'Failed to record reading session' },
        { status: 500, headers: corsHeaders() }
      );
    }
  }

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}
