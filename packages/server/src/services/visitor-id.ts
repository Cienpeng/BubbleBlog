import { getIP } from '../middleware/ratelimit';

let analyticsKeyPromise: Promise<CryptoKey> | null = null;

function getAnalyticsKey(): Promise<CryptoKey> {
  if (!analyticsKeyPromise) {
    const secret = process.env.ANALYTICS_HASH_SECRET || process.env.JWT_SECRET || '';
    if (secret.length < 32 || /change|dev-secret|changeme/i.test(secret)) {
      throw new Error('ANALYTICS_HASH_SECRET must be a non-placeholder secret of at least 32 characters');
    }
    analyticsKeyPromise = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }
  return analyticsKeyPromise;
}

export async function getVisitorId(req: Request, purpose: 'likes' | 'tracking' | 'login'): Promise<string> {
  // Do not trust a caller-supplied fingerprint: it can be rotated to create
  // unlimited rows. The purpose prefix also prevents cross-feature correlation.
  const source = [
    purpose,
    getIP(req),
    (req.headers.get('user-agent') || 'unknown').slice(0, 512),
    (req.headers.get('accept-language') || '').slice(0, 128),
  ].join('\0');
  const key = await getAnalyticsKey();
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(source));
  return Array.from(
    new Uint8Array(signature),
    value => value.toString(16).padStart(2, '0')
  ).join('');
}
