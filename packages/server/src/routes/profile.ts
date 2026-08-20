import { corsHeaders, handleCors } from '../middleware/cors';
import { requireAuth } from '../middleware/auth';
import { verifyToken } from '../services/jwt';
import { getUserProfile, updateUserProfile, setUserTags, updatePassword } from '../db/queries/profile';
import { getOrCreateTags } from '../db/queries/tags';
import { deleteLocalMedia } from './media';
import { securityService } from '../services/security';
import { readJson } from '../middleware/body';
import { getSessionToken } from '../services/session-token';
import { sessionCookie } from '../services/session-policy';

async function getUserId(req: Request): Promise<{ userId: number; username: string }> {
  const token = getSessionToken(req);
  if (!token) throw new Error('Authenticated session token is missing');
  const payload = await verifyToken(token);
  if (!payload) throw new Error('Authenticated session token is invalid');
  return payload;
}

export async function handleProfile(req: Request, server?: any): Promise<Response> {
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
      { success: true, data: profile },
      { headers: corsHeaders() }
    );
  }

  // POST /api/admin/profile
  if (url.pathname === '/api/admin/profile' && req.method === 'POST') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const payload = await getUserId(req);
    const body = await readJson(req, 64 * 1024);

    if (
      (body.display_name !== undefined && (typeof body.display_name !== 'string' || body.display_name.length > 100)) ||
      (body.bio !== undefined && (typeof body.bio !== 'string' || body.bio.length > 20_000)) ||
      (body.avatar_url !== undefined && (typeof body.avatar_url !== 'string' || body.avatar_url.length > 500)) ||
      (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.length > 20))
    ) {
      return Response.json({ success: false, error: 'Invalid profile payload' }, { status: 400, headers: corsHeaders() });
    }

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

    // Record audit log
    securityService.recordActivity(payload.userId, '修改个人设置资料及外部链接配置', 'success');

    return Response.json(
      { success: true, data: updated },
      { headers: corsHeaders() }
    );
  }

  // POST /api/admin/password
  if (url.pathname === '/api/admin/password' && req.method === 'POST') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const payload = await getUserId(req);
    const body = await readJson(req, 8 * 1024);

    const { current_password, new_password } = body;
    if (!current_password || !new_password) {
      return Response.json(
        { success: false, error: '请提供当前密码 and 新密码' },
        { status: 400, headers: corsHeaders() }
      );
    }
    if (typeof current_password !== 'string' || typeof new_password !== 'string' || new_password.length < 12 || new_password.length > 128) {
      return Response.json(
        { success: false, error: '新密码必须为 12 至 128 位' },
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
    await securityService.logoutAll(payload.userId);

    // Record audit log
    securityService.recordActivity(payload.userId, '重置修改管理员登录密码', 'success');

    return Response.json(
      { success: true, data: { message: '密码已更新，请重新登录' } },
      { headers: { ...corsHeaders(), 'Set-Cookie': sessionCookie('', 0) } }
    );
  }

  // GET /api/admin/security/logs/export
  if (url.pathname === '/api/admin/security/logs/export' && req.method === 'GET') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const payload = await getUserId(req);
    const logs = await securityService.getLogs(payload.userId, 10_000);
    const escapeCSV = (str: string) => {
      // Prevent spreadsheet formula execution when a CSV is opened in Excel.
      const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
      if (/[",\n\r]/.test(safe)) {
        return `"${safe.replace(/"/g, '""')}"`;
      }
      return safe;
    };

    const header = '时间,操作事件,状态\n';
    const csvContent = logs.map(log => {
      const time = escapeCSV(log.time);
      const event = escapeCSV(log.event);
      const status = escapeCSV(log.status === 'success' ? '成功' : '警告');
      return `${time},${event},${status}`;
    }).join('\n');

    const bom = '\ufeff';
    return new Response(bom + header + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="audit_logs.csv"',
        ...corsHeaders(),
      },
    });
  }

  // GET /api/admin/security
  if (url.pathname === '/api/admin/security' && req.method === 'GET') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const payload = await getUserId(req);
    const currentToken = getSessionToken(req) || '';
    const sessions = await securityService.getSessions(payload.userId, currentToken);
    const logs = await securityService.getLogs(payload.userId, 20);

    // Get single session setting
    const { getSetting } = require('../db/queries/settings');
    let singleSessionEnabled = false;
    try {
      const val = await getSetting('single_session_enabled');
      singleSessionEnabled = val === 'true';
    } catch (e) {}

    return Response.json(
      {
        success: true,
        data: {
          role: '系统超级管理员 (Owner)',
          singleSessionEnabled,
          sessions,
          logs: logs,
        },
      },
      { headers: corsHeaders() }
    );
  }

  // POST /api/admin/security/toggle-single-session
  if (url.pathname === '/api/admin/security/toggle-single-session' && req.method === 'POST') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const payload = await getUserId(req);
    const body = await readJson(req, 4 * 1024);
    const enabled = body.enabled === true;

    const { setSetting } = require('../db/queries/settings');
    await setSetting('single_session_enabled', enabled ? 'true' : 'false');

    // Record activity
    const actionText = enabled ? '启用了「限制单点登录（单终端会话限制）」' : '排除了「限制单点登录」，允许多终端活跃会话同时存活';
    await securityService.recordActivity(payload.userId, actionText, 'success');

    // If enabled, logout others immediately
    if (enabled) {
      const currentToken = getSessionToken(req) || '';
      await securityService.logoutOthers(payload.userId, currentToken);
    }

    return Response.json(
      { success: true, data: { enabled } },
      { headers: corsHeaders() }
    );
  }

  // POST /api/admin/security/logout-others
  if (url.pathname === '/api/admin/security/logout-others' && req.method === 'POST') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const payload = await getUserId(req);
    const currentToken = getSessionToken(req) || '';
    await securityService.logoutOthers(payload.userId, currentToken);
    await securityService.recordActivity(payload.userId, '清除注销其他所有设备活跃登录会话', 'success');

    return Response.json(
      { success: true, data: { message: '已成功清理并注销其他所有设备的活跃会话' } },
      { headers: corsHeaders() }
    );
  }

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}
