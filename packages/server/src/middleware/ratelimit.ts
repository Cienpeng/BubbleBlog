import { corsHeaders } from './cors';
import { isIP } from 'node:net';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store; cleared periodically
const stores: Record<string, Map<string, RateLimitEntry>> = {
  global: new Map(),
  login: new Map(),
  like: new Map(),
  captcha: new Map(),
  tracking: new Map(),
};
const MAX_STORE_ENTRIES = 10_000;
const clientIPs = new WeakMap<Request, string>();

export function registerClientIP(req: Request, socketIP: string | undefined): void {
  const directIP = socketIP && isIP(socketIP) ? socketIP : '127.0.0.1';
  const isLocalProxy = directIP === '127.0.0.1' || directIP === '::1';
  const forwarded = req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim();
  clientIPs.set(req, isLocalProxy && forwarded && isIP(forwarded) ? forwarded : directIP);
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const store of Object.values(stores)) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function getIP(req: Request): string {
  return clientIPs.get(req) || '127.0.0.1';
}

function checkLimit(
  storeName: 'global' | 'login' | 'like' | 'captcha' | 'tracking',
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const store = stores[storeName];
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    if (!existing && store.size >= MAX_STORE_ENTRIES) {
      const oldestKey = store.keys().next().value;
      if (oldestKey) store.delete(oldestKey);
    }
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

export function likeRateLimit(req: Request): Response | null {
  const result = checkLimit('like', getIP(req), 10, 60_000);
  if (!result.allowed) {
    return Response.json(
      { success: false, error: 'Too many like requests' },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter), ...corsHeaders() } }
    );
  }
  return null;
}

export function captchaRateLimit(req: Request): Response | null {
  const result = checkLimit('captcha', getIP(req), 20, 5 * 60_000);
  if (!result.allowed) {
    return Response.json(
      { success: false, error: 'Too many captcha requests' },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter), ...corsHeaders() } }
    );
  }
  return null;
}

export function trackingRateLimit(req: Request): Response | null {
  const result = checkLimit('tracking', getIP(req), 30, 60_000);
  if (!result.allowed) {
    return Response.json(
      { success: false, error: 'Too many tracking requests' },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter), ...corsHeaders() } }
    );
  }
  return null;
}
