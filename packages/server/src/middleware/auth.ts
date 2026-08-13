import { createToken, verifyToken } from '../services/jwt';
import { corsHeaders } from './cors';
import sql from '../db/connection';
import { hashSessionToken } from '../services/token-hash';
import { getSessionToken } from '../services/session-token';
import {
  PREVIOUS_TOKEN_GRACE_SECONDS,
  SESSION_IDLE_SECONDS,
  SESSION_ROTATION_INTERVAL_SECONDS,
  sessionCookie,
} from '../services/session-policy';

const refreshedSessionCookies = new WeakMap<Request, string>();

export function takeSessionRefreshCookie(req: Request): string | undefined {
  const cookie = refreshedSessionCookies.get(req);
  refreshedSessionCookies.delete(req);
  return cookie;
}

export async function requireAuth(req: Request): Promise<{ authorized: boolean; response?: Response }> {
  const token = getSessionToken(req);
  if (!token) {
    return {
      authorized: false,
      response: Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return {
      authorized: false,
      response: Response.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }

  const tokenHash = await hashSessionToken(token);
  const rows = await sql`
    SELECT
      s.id,
      s.last_active_at,
      s.token_hash = ${tokenHash} AS is_current_token
    FROM security_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.user_id = ${payload.userId}
      AND u.username = ${payload.username}
      AND (
        s.token_hash = ${tokenHash}
        OR (
          s.previous_token_hash = ${tokenHash}
          AND s.previous_token_valid_until > NOW()
        )
      )
    LIMIT 1
  `;
  if (rows.length === 0) {
    return {
      authorized: false,
      response: Response.json(
        { success: false, error: 'Current session is invalid or has been revoked' },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }

  const lastActive = new Date(rows[0].last_active_at).getTime();
  if (!Number.isFinite(lastActive) || Date.now() - lastActive > SESSION_IDLE_SECONDS * 1000) {
    await sql`DELETE FROM security_sessions WHERE id = ${rows[0].id}`;
    return {
      authorized: false,
      response: Response.json(
        { success: false, error: 'Session expired, please login again' },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }

  const isCurrentToken = rows[0].is_current_token === true;
  const tokenAgeSeconds = Math.max(0, Math.floor(Date.now() / 1000) - payload.iat);

  if (isCurrentToken && tokenAgeSeconds >= SESSION_ROTATION_INTERVAL_SECONDS) {
    const newToken = await createToken({ username: payload.username, userId: payload.userId });
    const newTokenHash = await hashSessionToken(newToken);
    const rotated = await sql`
      UPDATE security_sessions
      SET
        previous_token_hash = token_hash,
        previous_token_valid_until = NOW() + (${PREVIOUS_TOKEN_GRACE_SECONDS} * INTERVAL '1 second'),
        token_hash = ${newTokenHash},
        last_active_at = NOW()
      WHERE id = ${rows[0].id}
        AND token_hash = ${tokenHash}
      RETURNING id
    `;

    // Only the request that wins a concurrent rotation sends the replacement
    // cookie. Other in-flight requests remain valid through the short previous
    // token grace period and do not overwrite the new cookie.
    if (rotated.length > 0) {
      refreshedSessionCookies.set(req, sessionCookie(newToken));
    }
  } else {
    await sql`
      UPDATE security_sessions
      SET last_active_at = NOW()
      WHERE id = ${rows[0].id}
    `;
  }

  return { authorized: true };
}
