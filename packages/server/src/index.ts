import { corsHeaders, handleCors } from './middleware/cors';
import { globalRateLimit } from './middleware/ratelimit';
import { handleAuth } from './routes/auth';
import { handleArticles } from './routes/articles';
import { handleTags } from './routes/tags';
import { handleSearch } from './routes/search';
import { handleLikes } from './routes/likes';
import { handleMedia } from './routes/media';
import { handleSEO } from './routes/seo';

const PORT = parseInt(process.env.PORT || '3000');

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check (no rate limit)
    if (url.pathname === '/api/health') {
      return Response.json({ success: true, data: { status: 'ok' } });
    }

    // Global rate limit
    const rateLimitResponse = globalRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    // CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Route matching
    if (url.pathname.startsWith('/api/auth/')) {
      return handleAuth(req);
    }
    if (url.pathname.startsWith('/api/articles/') || url.pathname === '/api/articles') {
      return handleArticles(req);
    }
    if (url.pathname.startsWith('/api/tags')) {
      return handleTags(req);
    }
    if (url.pathname.startsWith('/api/search')) {
      return handleSearch(req);
    }
    if (url.pathname.includes('/likes')) {
      return handleLikes(req);
    }
    if (url.pathname.startsWith('/api/media') || url.pathname.startsWith('/media/')) {
      return handleMedia(req);
    }
    if (url.pathname === '/sitemap.xml') {
      return handleSEO(req);
    }

    // 404
    return Response.json(
      { success: false, error: 'Not found' },
      { status: 404, headers: corsHeaders() }
    );
  },
});

console.log(`BubbleBlog server running on http://localhost:${PORT}`);
