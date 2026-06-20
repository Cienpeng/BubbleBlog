import { verifyToken, createToken } from '../services/jwt';
import { getUserByUsername, updateLastActive } from '../db/queries/users';
import { corsHeaders } from './cors';

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

  // Issue new token with fresh 60h window
  const newToken = await createToken({ username: user.username, userId: user.id });
  await updateLastActive(user.id);

  return { authorized: true, newToken };
}
