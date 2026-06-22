import './env'; // Must be first — loads .env before other modules

import { corsHeaders, handleCors } from './middleware/cors';
import { globalRateLimit } from './middleware/ratelimit';
import { handleAuth } from './routes/auth';
import { handleArticles } from './routes/articles';
import { handleTags } from './routes/tags';
import { handleSearch } from './routes/search';
import { handleLikes } from './routes/likes';
import { handleMedia } from './routes/media';
import { handleSEO } from './routes/seo';
import { handleSettings } from './routes/settings';
import { handleCarouselAPI } from './routes/carousel-api';
import { handleTracking } from './routes/tracking';
import { handleStatsAPI } from './routes/stats-api';
import { handleProfile } from './routes/profile';

const PORT = parseInt(process.env.PORT || '3000');

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    // Health check (no rate limit)
    if (url.pathname === '/api/health') {
      return addSecurityHeaders(Response.json({ success: true, data: { status: 'ok', timestamp: Date.now() } }));
    }

    // Global rate limit
    const rateLimitResponse = globalRateLimit(req);
    if (rateLimitResponse) return addSecurityHeaders(rateLimitResponse);

    // CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse; // Already has headers from handleCors

    try {
      // Route matching
      if (url.pathname.startsWith('/api/auth/')) {
        return addSecurityHeaders(await handleAuth(req, server));
      }
      if (url.pathname.startsWith('/api/settings')) {
        return addSecurityHeaders(await handleSettings(req));
      }
      if (url.pathname.includes('/carousel')) {
        return addSecurityHeaders(await handleCarouselAPI(req));
      }
      // Likes must be BEFORE /api/articles/ to avoid being eaten by articles handler
      if (url.pathname.includes('/likes')) {
        return addSecurityHeaders(await handleLikes(req));
      }
      if (url.pathname.startsWith('/api/articles/') || url.pathname === '/api/articles') {
        return addSecurityHeaders(await handleArticles(req));
      }
      if (url.pathname.startsWith('/api/tags')) {
        return addSecurityHeaders(await handleTags(req));
      }
      if (url.pathname.startsWith('/api/search')) {
        return addSecurityHeaders(await handleSearch(req));
      }
      if (url.pathname.startsWith('/api/media') || url.pathname.startsWith('/media/')) {
        return addSecurityHeaders(await handleMedia(req));
      }
      if (url.pathname === '/sitemap.xml') {
        return addSecurityHeaders(await handleSEO(req));
      }
      if (url.pathname.startsWith('/api/admin/stats')) {
        return addSecurityHeaders(await handleStatsAPI(req));
      }
      if (
        url.pathname.startsWith('/api/admin/profile') ||
        url.pathname === '/api/admin/password' ||
        url.pathname === '/api/profile' ||
        url.pathname.startsWith('/api/admin/security')
      ) {
        return addSecurityHeaders(await handleProfile(req, server));
      }
      if (url.pathname.startsWith('/api/track')) {
        return addSecurityHeaders(await handleTracking(req));
      }

      // 404
      return addSecurityHeaders(Response.json(
        { success: false, error: 'Not found' },
        { status: 404, headers: corsHeaders() }
      ));
    } catch (err) {
      console.error('Unhandled error:', err);
      return addSecurityHeaders(Response.json(
        { success: false, error: 'Internal server error' },
        { status: 500, headers: corsHeaders() }
      ));
    }
  },
});

console.log(`BubbleBlog server running on http://localhost:${PORT}`);
