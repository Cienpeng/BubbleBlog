const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY_MS = 60 * 60 * 60 * 1000; // 60 hours for the token itself

interface TokenPayload {
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
    exp: now + JWT_EXPIRY_MS / 1000,
  };

  const headerB64 = await base64UrlEncode(JSON.stringify(header));
  const payloadB64 = await base64UrlEncode(JSON.stringify(tokenPayload));
  const data = `${headerB64}.${payloadB64}`;

  // HMAC-SHA256 via Web Crypto (Bun)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${sigB64}`;
}

export async function verifyToken(token: string): Promise<{ username: string; userId: number } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const data = `${headerB64}.${payloadB64}`;

    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

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
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { username: payload.username, userId: payload.userId };
  } catch {
    return null;
  }
}
