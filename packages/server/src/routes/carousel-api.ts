import { corsHeaders, handleCors } from '../middleware/cors';
import { getCarouselForArticle } from '../db/queries/carousel';

export async function handleCarouselAPI(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // GET /api/articles/:slug/carousel
  const match = url.pathname.match(/^\/api\/articles\/([a-zA-Z0-9一-鿿\-]+)\/carousel$/);
  if (match && req.method === 'GET') {
    const images = await getCarouselForArticle(match[1]);

    // Transform sentinel markers to indicate client-side gradients
    const result = images.map(img => ({
      id: img.id,
      image_url: img.image_url.startsWith('__DEFAULT_GRADIENT_')
        ? null  // null signals client to use default gradient
        : img.image_url,
      gradient_key: img.image_url.startsWith('__DEFAULT_GRADIENT_')
        ? img.image_url  // client uses this to pick the gradient
        : null,
      sort_order: img.sort_order,
    }));

    return Response.json({ success: true, data: result }, { headers: corsHeaders() });
  }

  // POST / DELETE — protected (admin only, future)

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}
