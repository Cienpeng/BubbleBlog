import { corsHeaders, handleCors } from '../middleware/cors';
import { requireAuth } from '../middleware/auth';
import { verifyToken } from '../services/jwt';
import { getUserProfile, updateUserProfile, setUserTags, updatePassword } from '../db/queries/profile';
import { getOrCreateTags } from '../db/queries/tags';
import { deleteLocalMedia } from './media';

async function getUserId(req: Request): Promise<{ userId: number; username: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7));
}

export async function handleProfile(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // GET /api/profile — public
  if (url.pathname === '/api/profile' && req.method === 'GET') {
    const users = await import('../db/queries/users');
    const user = await users.getUserByUsername('admin');
    if (!user) {
      return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders() });
    }
    const profile = await getUserProfile(user.id);
    // Only return public-safe fields
    const pub = profile ? {
      display_name: profile.display_name || profile.username,
      bio: profile.bio || '',
      avatar_url: profile.avatar_url || '',
      tags: profile.tags,
    } : null;
    return Response.json({ success: true, data: pub }, { headers: corsHeaders() });
  }

  // GET /api/admin/profile
  if (url.pathname === '/api/admin/profile' && req.method === 'GET') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const payload = await getUserId(req);
    const profile = await getUserProfile(payload.userId);
    if (!profile) {
      return Response.json(
        { success: false, error: 'User not found' },
        { status: 404, headers: corsHeaders() }
      );
    }

    return Response.json(
      { success: true, data: profile, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  // PUT /api/admin/profile
  if (url.pathname === '/api/admin/profile' && req.method === 'PUT') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const payload = await getUserId(req);
    const body = await req.json();

    // Clean up old avatar if it's being changed
    const currentProfile = await getUserProfile(payload.userId);
    const oldAvatar = currentProfile?.avatar_url;
    const newAvatar = body.avatar_url;
    if (oldAvatar && oldAvatar !== newAvatar) {
      await deleteLocalMedia(oldAvatar);
    }

    await updateUserProfile(payload.userId, {
      display_name: body.display_name,
      bio: body.bio,
      avatar_url: body.avatar_url,
    });

    // Handle tags
    if (Array.isArray(body.tags)) {
      const tagNames: string[] = body.tags.filter(
        (t: any) => typeof t === 'string' && t.trim()
      );
      if (tagNames.length > 0) {
        const tags = await getOrCreateTags(tagNames);
        await setUserTags(payload.userId, tags.map(t => t.id));
      } else {
        await setUserTags(payload.userId, []);
      }
    }

    const updated = await getUserProfile(payload.userId);

    return Response.json(
      { success: true, data: updated, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  // PUT /api/admin/password
  if (url.pathname === '/api/admin/password' && req.method === 'PUT') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const payload = await getUserId(req);
    const body = await req.json();

    const { current_password, new_password } = body;
    if (!current_password || !new_password) {
      return Response.json(
        { success: false, error: '请提供当前密码和新密码' },
        { status: 400, headers: corsHeaders() }
      );
    }
    if (new_password.length < 8) {
      return Response.json(
        { success: false, error: '新密码至少 8 位' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Verify current password
    const { getUserByUsername } = require('../db/queries/users');
    const user = await getUserByUsername(payload.username);
    if (!user) {
      return Response.json(
        { success: false, error: '用户不存在' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const valid = await Bun.password.verify(current_password, user.password_hash);
    if (!valid) {
      return Response.json(
        { success: false, error: '当前密码错误' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const newHash = await Bun.password.hash(new_password, { algorithm: 'bcrypt', cost: 12 });
    await updatePassword(payload.userId, newHash);

    return Response.json(
      { success: true, data: { message: '密码已更新' }, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}
