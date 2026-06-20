import { corsHeaders, handleCors } from '../middleware/cors';
import { requireAuth } from '../middleware/auth';
import { getAllSettings, setSetting, getSetting } from '../db/queries/settings';
import { deleteLocalMedia } from './media';


export async function handleSettings(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // GET /api/settings — public
  if (url.pathname === '/api/settings' && req.method === 'GET') {
    const settings = await getAllSettings();
    return Response.json({ success: true, data: settings }, { headers: corsHeaders() });
  }

  // PUT /api/settings — admin only
  if (url.pathname === '/api/settings' && req.method === 'PUT') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const updates: Record<string, string> = {};

    if (typeof body.background_image === 'string') {
      const currentBg = await getSetting('background_image');
      if (currentBg && currentBg !== body.background_image) {
        await deleteLocalMedia(currentBg);
      }
      await setSetting('background_image', body.background_image);
      updates.background_image = body.background_image;
    }

    // Extensible: add more settings keys here as needed

    const settings = await getAllSettings();
    return Response.json(
      { success: true, data: settings, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}
