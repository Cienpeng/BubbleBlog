import { corsHeaders } from './cors';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store; cleared periodically
const stores: Record<string, Map<string, RateLimitEntry>> = {
  global: new Map(),
  login: new Map(),
  like: new Map(),
};

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const store of Object.values(stores)) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getIP(req: Request): string {
  const forwarded = req.headers.get('X-Forwarded-For');
  return forwarded?.split(',')[0]?.trim() || '127.0.0.1';
}

function checkLimit(
  storeName: 'global' | 'login' | 'like',
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const store = stores[storeName];
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  existing.count++;
  if (existing.count > maxRequests) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true, retryAfter: 0 };
}

export function globalRateLimit(req: Request): Response | null {
  const ip = getIP(req);
  const result = checkLimit('global', ip, 100, 60_000); // 100 req/min
  if (!result.allowed) {
    return Response.json(
      { success: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter), ...corsHeaders() } }
    );
  }
  return null;
}

export function loginRateLimit(req: Request): Response | null {
  const ip = getIP(req);
  const result = checkLimit('login', ip, 5, 15 * 60_000); // 5 req/15min
  if (!result.allowed) {
    return Response.json(
      { success: false, error: 'Too many login attempts, try again later' },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter), ...corsHeaders() } }
    );
  }
  return null;
}

export function likeRateLimit(fingerprint: string): Response | null {
  const result = checkLimit('like', fingerprint, 10, 60_000); // 10 req/min
  if (!result.allowed) {
    return Response.json(
      { success: false, error: 'Too many like requests' },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter), ...corsHeaders() } }
    );
  }
  return null;
}
