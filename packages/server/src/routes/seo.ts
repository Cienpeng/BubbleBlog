import { corsHeaders } from '../middleware/cors';
import sql from '../db/connection';

export async function handleSEO(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === '/sitemap.xml' && req.method === 'GET') {
    const rows = await sql`
      SELECT slug, published_at FROM articles
      WHERE status = 'published'
      ORDER BY published_at DESC`;

    const baseUrl = `https://${req.headers.get('Host') || 'localhost'}`;

    const urls = rows.map((r: any) =>
      `  <url>\n    <loc>${baseUrl}/article/${r.slug}</loc>\n    <lastmod>${new Date(r.published_at).toISOString().split('T')[0]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${baseUrl}</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n${urls}\n</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        ...corsHeaders(),
      },
    });
  }

  return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders() });
}
