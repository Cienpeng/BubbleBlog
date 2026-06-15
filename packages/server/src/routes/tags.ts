import { corsHeaders, handleCors } from '../middleware/cors';
import { getAllTags } from '../db/queries/tags';

export async function handleTags(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  if (url.pathname === '/api/tags' && req.method === 'GET') {
    const tags = await getAllTags();
    return Response.json({ success: true, data: tags }, { headers: corsHeaders() });
  }

  return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders() });
}
