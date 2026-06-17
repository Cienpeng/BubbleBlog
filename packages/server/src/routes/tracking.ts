import { corsHeaders, handleCors } from '../middleware/cors';
import { recordPageView, recordReadingSession } from '../db/queries/stats';

// Simple fingerprint hash for anonymous tracking
function hashFingerprint(raw: string): string {
  // Use a simple hash — in production use crypto
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export async function handleTracking(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // POST /api/track/view
  if (url.pathname === '/api/track/view' && req.method === 'POST') {
    try {
      const body = await req.json();
      const articleId = parseInt(body.article_id);
      const fp = hashFingerprint(body.fingerprint || 'unknown');

      if (articleId && articleId > 0) {
        await recordPageView(articleId, fp);
      }

      return Response.json({ success: true, data: { ok: true } }, { headers: corsHeaders() });
    } catch {
      return Response.json({ success: true, data: { ok: true } }, { headers: corsHeaders() });
    }
  }

  // POST /api/track/reading
  if (url.pathname === '/api/track/reading' && req.method === 'POST') {
    try {
      const body = await req.json();
      const articleId = parseInt(body.article_id);
      const fp = hashFingerprint(body.fingerprint || 'unknown');
      const duration = parseFloat(body.duration_seconds);

      if (articleId > 0 && duration > 0) {
        await recordReadingSession(articleId, fp, duration);
      }

      return Response.json({ success: true, data: { ok: true } }, { headers: corsHeaders() });
    } catch {
      return Response.json({ success: true, data: { ok: true } }, { headers: corsHeaders() });
    }
  }

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}
