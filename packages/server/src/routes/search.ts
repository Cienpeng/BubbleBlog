import { corsHeaders, handleCors } from '../middleware/cors';
import { searchArticles } from '../db/queries/search';

export async function handleSearch(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  if (url.pathname === '/api/search' && req.method === 'GET') {
    const q = url.searchParams.get('q') || '';
    if (!q.trim()) {
      return Response.json({ success: false, error: 'Query parameter q is required' }, { status: 400, headers: corsHeaders() });
    }

    const sanitized = q.replace(/[&|!:*()]/g, ' ').trim();
    if (!sanitized) {
      return Response.json({ success: true, data: [] }, { headers: corsHeaders() });
    }

    const results = await searchArticles(sanitized);
    return Response.json({ success: true, data: results }, { headers: corsHeaders() });
  }

  return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders() });
}
