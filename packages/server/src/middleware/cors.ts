export function corsHeaders(origin?: string): HeadersInit {
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}),
    'Access-Control-Allow-Methods': 'GET, POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('Origin');
    const configured = (process.env.PUBLIC_ORIGIN || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
    let allowedOrigin: string | undefined;
    if (origin) {
      const requestHost = req.headers.get('host');
      const originHost = (() => { try { return new URL(origin).host; } catch { return ''; } })();
      if (configured.includes(origin) || (!!requestHost && originHost === requestHost)) {
        allowedOrigin = origin;
      } else {
        return Response.json({ success: false, error: 'Origin not allowed' }, { status: 403 });
      }
    }
    return new Response(null, {
      status: 204,
      headers: corsHeaders(allowedOrigin),
    });
  }
  return null;
}
