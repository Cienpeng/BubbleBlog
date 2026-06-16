import { corsHeaders, handleCors } from '../middleware/cors';
import { getAllSettings } from '../db/queries/settings';

export async function handleSettings(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // GET /api/settings — public
  if (url.pathname === '/api/settings' && req.method === 'GET') {
    const settings = await getAllSettings();
    return Response.json({ success: true, data: settings }, { headers: corsHeaders() });
  }

  // PUT /api/settings — protected (admin only, future)
  // Will be added in admin-panel phase

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}
