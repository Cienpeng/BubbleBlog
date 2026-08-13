export const SESSION_IDLE_SECONDS = 60 * 60 * 60;
export const SESSION_ROTATION_INTERVAL_SECONDS = 5 * 60;
export const PREVIOUS_TOKEN_GRACE_SECONDS = 30;

// The database enforces the exact 60-hour idle timeout. The small signed-token
// margin ensures an authenticated request made just before a scheduled
// rotation can still reach the server and renew the session.
export const SESSION_TOKEN_TTL_SECONDS =
  SESSION_IDLE_SECONDS + SESSION_ROTATION_INTERVAL_SECONDS + 60;

export function sessionCookie(token: string, maxAge = SESSION_TOKEN_TTL_SECONDS): string {
  const secure = process.env.NODE_ENV === 'development' ? '' : '; Secure';
  return `bubbleblog_session=${encodeURIComponent(token)}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}
