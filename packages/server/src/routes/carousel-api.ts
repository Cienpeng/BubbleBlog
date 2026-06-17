import { corsHeaders, handleCors } from '../middleware/cors';
import { requireAuth } from '../middleware/auth';
import { getCarouselForArticle, addCarouselImage, deleteCarouselImage } from '../db/queries/carousel';
import { getAllDefaultCarousel, addDefaultCarouselImage } from '../db/queries/carousel';

export async function handleCarouselAPI(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // GET /api/articles/:slug/carousel — public
  const match = url.pathname.match(/^\/api\/articles\/([a-zA-Z0-9一-鿿\-]+)\/carousel$/);
  if (match && req.method === 'GET') {
    const images = await getCarouselForArticle(match[1]);

    const result = images.map(img => ({
      id: img.id,
      image_url: img.image_url.startsWith('__DEFAULT_GRADIENT_')
        ? null
        : img.image_url,
      gradient_key: img.image_url.startsWith('__DEFAULT_GRADIENT_')
        ? img.image_url
        : null,
      sort_order: img.sort_order,
    }));

    return Response.json({ success: true, data: result }, { headers: corsHeaders() });
  }

  // GET /api/admin/carousel — admin: list all default carousel images
  if (url.pathname === '/api/admin/carousel' && req.method === 'GET') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const images = await getAllDefaultCarousel();
    return Response.json(
      { success: true, data: images, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  // POST /api/admin/carousel — admin: add default carousel image
  if (url.pathname === '/api/admin/carousel' && req.method === 'POST') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const imageUrl = body.image_url as string;
    if (!imageUrl) {
      return Response.json(
        { success: false, error: 'image_url is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const image = await addDefaultCarouselImage(imageUrl, body.sort_order ?? 0);
    return Response.json(
      { success: true, data: image, newToken: auth.newToken },
      { status: 201, headers: corsHeaders() }
    );
  }

  // DELETE /api/admin/carousel/:id — admin: delete carousel image
  const deleteMatch = url.pathname.match(/^\/api\/admin\/carousel\/(\d+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const deleted = await deleteCarouselImage(parseInt(deleteMatch[1]));
    if (!deleted) {
      return Response.json(
        { success: false, error: 'Image not found' },
        { status: 404, headers: corsHeaders() }
      );
    }
    return Response.json(
      { success: true, data: { deleted: true }, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}
