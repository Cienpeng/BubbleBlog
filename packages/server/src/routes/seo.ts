import { corsHeaders } from '../middleware/cors';
import sql from '../db/connection';

export async function handleSEO(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === '/sitemap.xml' && req.method === 'GET') {
    const rows = await sql`
      SELECT slug, published_at FROM articles
      WHERE status = 'published'
      ORDER BY published_at DESC`;

    const configuredBaseUrl = process.env.PUBLIC_BASE_URL || process.env.PUBLIC_ORIGIN;
    if (!configuredBaseUrl) {
      return Response.json({ success: false, error: 'PUBLIC_BASE_URL is not configured' }, { status: 503, headers: corsHeaders() });
    }
    const baseUrl = configuredBaseUrl.replace(/\/$/, '');

    const urls = rows.map((r: any) =>
      `  <url>\n    <loc>${escapeXml(`${baseUrl}/article/${encodeURIComponent(r.slug)}`)}</loc>\n    <lastmod>${new Date(r.published_at).toISOString().split('T')[0]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${escapeXml(baseUrl)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n${urls}\n</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        ...corsHeaders(),
      },
    });
  }

  return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders() });
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, character => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[character]!);
}
