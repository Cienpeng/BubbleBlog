import { verifyToken, createToken } from '../services/jwt';
import { getUserByUsername, updateLastActive } from '../db/queries/users';
import { corsHeaders } from './cors';
import sql from '../db/connection';

const SLIDING_WINDOW_MS = 60 * 60 * 60 * 1000; // 60 hours

export async function requireAuth(req: Request): Promise<{ authorized: boolean; response?: Response; newToken?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      response: Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }

  const token = authHeader.slice(7);
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

  // Sliding expiration: check last_active_at
  const user = await getUserByUsername(payload.username);
  if (!user) {
    return {
      authorized: false,
      response: Response.json(
        { success: false, error: 'User not found' },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }

  const lastActive = new Date(user.last_active_at).getTime();
  const now = Date.now();

  if (now - lastActive > SLIDING_WINDOW_MS) {
    return {
      authorized: false,
      response: Response.json(
        { success: false, error: 'Session expired, please login again' },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }

  // Verify that the token exists in security_sessions (whitelist active sessions)
  const rows = await sql`
    SELECT id FROM security_sessions WHERE token = ${token} AND user_id = ${user.id}
  `;
  if (rows.length === 0) {
    const { getSetting } = require('../db/queries/settings');
    const singleSessionVal = await getSetting('single_session_enabled');
    const isSingleSession = singleSessionVal === 'true';
    return {
      authorized: false,
      response: Response.json(
        { 
          success: false, 
          error: isSingleSession 
            ? '您的账号已在其他终端登录，当前会话已失效' 
            : '当前登录会话已失效或已被强制下线，请重新登录' 
        },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }

  // Update last active time for sliding window
  await updateLastActive(user.id);

  // Sync last active in security_sessions table
  try {
    await sql`
      UPDATE security_sessions
      SET last_active_at = NOW()
      WHERE token = ${token} AND user_id = ${user.id}
    `;
  } catch (e) {
    console.error('Failed to update activity in security_sessions:', e);
  }

  return { authorized: true };
}
