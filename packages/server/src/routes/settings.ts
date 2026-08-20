import { corsHeaders, handleCors } from '../middleware/cors';
import { requireAuth } from '../middleware/auth';
import { getAllSettings, getPublicSettings, setSetting, getSetting } from '../db/queries/settings';
import { deleteLocalMedia } from './media';
import { readJson } from '../middleware/body';


export async function handleSettings(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // GET /api/settings — public
  if (url.pathname === '/api/settings' && req.method === 'GET') {
    const settings = await getPublicSettings();
    return Response.json({ success: true, data: settings }, { headers: corsHeaders() });
  }

  // POST /api/settings — admin only
  if (url.pathname === '/api/settings' && req.method === 'POST') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const body = await readJson(req, 8 * 1024);
    const updates: Record<string, string> = {};

    if (typeof body.background_image === 'string' && body.background_image.length <= 1000) {
      const currentBg = await getSetting('background_image');
      if (currentBg && currentBg !== body.background_image) {
        await deleteLocalMedia(currentBg);
      }
      await setSetting('background_image', body.background_image);
      updates.background_image = body.background_image;
    } else if (body.background_image !== undefined) {
      return Response.json({ success: false, error: 'Invalid background image URL' }, { status: 400, headers: corsHeaders() });
    }

    // Extensible: add more settings keys here as needed

    const settings = await getAllSettings();
    return Response.json(
      { success: true, data: settings },
      { headers: corsHeaders() }
    );
  }

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}
