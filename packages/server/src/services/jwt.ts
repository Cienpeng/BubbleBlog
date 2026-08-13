import { SESSION_TOKEN_TTL_SECONDS } from './session-policy';

let keyPromise: Promise<CryptoKey> | null = null;

function getSigningKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const secret = process.env.JWT_SECRET || '';
    if (secret.length < 32 || /change|dev-secret|changeme/i.test(secret)) {
      throw new Error('JWT_SECRET must be a non-placeholder secret of at least 32 characters');
    }
    keyPromise = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }
  return keyPromise;
}

export interface TokenPayload {
  username: string;
  userId: number;
  iat: number;
  exp: number;
}

async function base64UrlEncode(data: string): Promise<string> {
  const encoder = new TextEncoder();
  return btoa(String.fromCharCode(...encoder.encode(data)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function createToken(payload: { username: string; userId: number }): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_TOKEN_TTL_SECONDS,
  };

  const headerB64 = await base64UrlEncode(JSON.stringify(header));
  const payloadB64 = await base64UrlEncode(JSON.stringify(tokenPayload));
  const data = `${headerB64}.${payloadB64}`;

  // HMAC-SHA256 via Web Crypto (Bun)
  const encoder = new TextEncoder();
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${sigB64}`;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (header?.alg !== 'HS256' || header?.typ !== 'JWT') return null;
    const data = `${headerB64}.${payloadB64}`;

    // Verify signature
    const encoder = new TextEncoder();
    const key = await getSigningKey();

    const sigBytes = Uint8Array.from(
      atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
    if (!valid) return null;

    // Decode payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload: TokenPayload = JSON.parse(payloadJson);

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.username !== 'string' ||
      !Number.isInteger(payload.userId) ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      payload.iat > now + 60 ||
      payload.exp <= now
    ) return null;

    return payload;
  } catch {
    return null;
  }
}
