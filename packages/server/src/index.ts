import './env'; // Must be first — loads .env before other modules

import { corsHeaders, handleCors } from './middleware/cors';
import { globalRateLimit, registerClientIP } from './middleware/ratelimit';
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
import { RequestBodyError, bodyErrorResponse } from './middleware/body';
import { deleteExpiredCaptchas } from './db/queries/captchas';
import { securityService } from './services/security';
import { takeSessionRefreshCookie } from './middleware/auth';

const PORT = parseInt(process.env.PORT || '3000');

function validateRuntimeConfiguration(): void {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  if (process.env.NODE_ENV === 'development') return;

  const isWeakSecret = (value: string) =>
    value.length < 32 || /change|changeme|dev-secret/i.test(value);
  const jwtSecret = process.env.JWT_SECRET || '';
  const analyticsSecret = process.env.ANALYTICS_HASH_SECRET || '';
  const dbPassword = process.env.DB_PASSWORD || '';
  if (isWeakSecret(jwtSecret)) {
    throw new Error('JWT_SECRET must be a non-placeholder secret of at least 32 characters');
  }
  if (isWeakSecret(analyticsSecret) || analyticsSecret === jwtSecret) {
    throw new Error('ANALYTICS_HASH_SECRET must be a separate non-placeholder secret of at least 32 characters');
  }
  if (!dbPassword || /change|changeme/i.test(dbPassword)) {
    throw new Error('DB_PASSWORD must be configured with a non-placeholder value');
  }
  for (const key of ['PUBLIC_ORIGIN', 'PUBLIC_BASE_URL'] as const) {
    const value = process.env[key] || '';
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`${key} must be a valid HTTPS URL`);
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      throw new Error(`${key} must be an HTTPS URL without embedded credentials`);
    }
  }
  const host = process.env.HOST || '127.0.0.1';
  if (host !== '127.0.0.1' && host !== '::1' && host !== 'localhost') {
    throw new Error('Production HOST must be a loopback address behind Caddy');
  }
}

validateRuntimeConfiguration();

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

function addSecurityHeaders(req: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  const refreshedSessionCookie = takeSessionRefreshCookie(req);
  if (refreshedSessionCookie && !headers.has('Set-Cookie')) {
    headers.append('Set-Cookie', refreshedSessionCookie);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

Bun.serve({
  hostname: process.env.HOST || '127.0.0.1',
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);
    registerClientIP(req, server.requestIP(req)?.address);

    // Health check (no rate limit)
    if (url.pathname === '/api/health') {
      return addSecurityHeaders(req, Response.json({ success: true, data: { status: 'ok', timestamp: Date.now() } }));
    }

    // Global rate limit
    const rateLimitResponse = globalRateLimit(req);
    if (rateLimitResponse) return addSecurityHeaders(req, rateLimitResponse);

    // CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return addSecurityHeaders(req, corsResponse);

    try {
      // Route matching
      if (url.pathname.startsWith('/api/auth/')) {
        return addSecurityHeaders(req, await handleAuth(req, server, server));
      }
      if (url.pathname.startsWith('/api/settings')) {
        return addSecurityHeaders(req, await handleSettings(req));
      }
      if (url.pathname.includes('/carousel')) {
        return addSecurityHeaders(req, await handleCarouselAPI(req));
      }
      // Likes must be BEFORE /api/articles/ to avoid being eaten by articles handler
      if (url.pathname.includes('/likes')) {
        return addSecurityHeaders(req, await handleLikes(req));
      }
      if (url.pathname.startsWith('/api/articles/') || url.pathname === '/api/articles') {
        return addSecurityHeaders(req, await handleArticles(req));
      }
      if (url.pathname.startsWith('/api/tags')) {
        return addSecurityHeaders(req, await handleTags(req));
      }
      if (url.pathname.startsWith('/api/search')) {
        return addSecurityHeaders(req, await handleSearch(req));
      }
      if (url.pathname.startsWith('/api/media') || url.pathname.startsWith('/media/')) {
        return addSecurityHeaders(req, await handleMedia(req));
      }
      if (url.pathname === '/sitemap.xml') {
        return addSecurityHeaders(req, await handleSEO(req));
      }
      if (url.pathname.startsWith('/api/admin/stats')) {
        return addSecurityHeaders(req, await handleStatsAPI(req));
      }
      if (
        url.pathname.startsWith('/api/admin/profile') ||
        url.pathname === '/api/admin/password' ||
        url.pathname === '/api/profile' ||
        url.pathname.startsWith('/api/admin/security')
      ) {
        return addSecurityHeaders(req, await handleProfile(req, server));
      }
      if (url.pathname.startsWith('/api/track')) {
        return addSecurityHeaders(req, await handleTracking(req));
      }

      // 404
      return addSecurityHeaders(req, Response.json(
        { success: false, error: 'Not found' },
        { status: 404, headers: corsHeaders() }
      ));
    } catch (err) {
      if (err instanceof RequestBodyError) {
        return addSecurityHeaders(req, bodyErrorResponse(err));
      }
      console.error('Unhandled error:', err);
      return addSecurityHeaders(req, Response.json(
        { success: false, error: 'Internal server error' },
        { status: 500, headers: corsHeaders() }
      ));
    }
  },
});

console.log(`BubbleBlog server running on http://localhost:${PORT}`);

async function cleanupExpiredData() {
  try {
    await deleteExpiredCaptchas();
    await securityService.cleanupExpiredData();
  } catch (error) {
    console.error('Scheduled data cleanup failed:', error);
  }
}

void cleanupExpiredData();
setInterval(cleanupExpiredData, 6 * 60 * 60 * 1000);
