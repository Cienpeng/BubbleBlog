import { corsHeaders, handleCors } from '../middleware/cors';
import { captchaRateLimit, getIP, loginRateLimit } from '../middleware/ratelimit';
import { createToken } from '../services/jwt';
import { getUserByUsername, updateLastActive } from '../db/queries/users';
import { securityService } from '../services/security';
import { getLockout, updateLockout, resetLockout } from '../db/queries/lockouts';
import { saveCaptcha, verifyAndConsumeCaptcha } from '../db/queries/captchas';
import { generateCaptchaSVG } from '../services/captcha';
import { readJson } from '../middleware/body';
import { requireAuth } from '../middleware/auth';
import { getSessionToken } from '../services/session-token';
import { getVisitorId } from '../services/visitor-id';
import { SESSION_IDLE_SECONDS, sessionCookie } from '../services/session-policy';
let activePasswordChecks = 0;
const MAX_PASSWORD_CHECKS = 2;

function getClientIp(req: Request, server: any): string {
  return getIP(req);
}

export async function handleAuth(req: Request, server?: any): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  if (url.pathname === '/api/auth/session' && req.method === 'GET') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;
    return Response.json({ success: true, data: { authenticated: true } }, { headers: corsHeaders() });
  }

  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = getSessionToken(req);
    if (token) await securityService.logoutCurrent(token);
    return Response.json(
      { success: true, data: { loggedOut: true } },
      { headers: { ...corsHeaders(), 'Set-Cookie': sessionCookie('', 0) } }
    );
  }

  // GET /api/auth/captcha?cid=xxx
  if (url.pathname === '/api/auth/captcha' && req.method === 'GET') {
    const rateLimitResponse = captchaRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;
    const cid = url.searchParams.get('cid');
    if (!cid || !/^[a-f0-9-]{36}$/i.test(cid)) {
      return Response.json(
        { success: false, error: 'A valid captcha id is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const { text, svg } = generateCaptchaSVG();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await saveCaptcha(cid, text, expiresAt);

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        ...corsHeaders(),
      },
    });
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    const rateLimitResponse = loginRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await readJson(req, 8 * 1024);
    const password = typeof body.password === 'string' ? body.password : '';
    const cid = typeof body.cid === 'string' ? body.cid : '';
    const captcha = typeof body.captcha === 'string' ? body.captcha : '';
    if (password.length > 128 || !/^[a-f0-9-]{36}$/i.test(cid) || !/^[a-z0-9]{4}$/i.test(captcha)) {
      return Response.json({ success: false, error: 'Invalid login payload' }, { status: 400, headers: corsHeaders() });
    }

    const ip = getClientIp(req, server);
    const fingerprint = await getVisitorId(req, 'login');

    // 1. Check lockout
    const lockout = await getLockout(ip, fingerprint);
    if (lockout && lockout.is_locked) {
      const remainingMin = Math.ceil(lockout.remaining_seconds / 60);
      return Response.json(
        { success: false, error: `登录错误次数过多，系统已限制登录，请于 ${remainingMin} 分钟后重试` },
        { status: 423, headers: corsHeaders() }
      );
    }

    // Helper for failed attempt tracking
    const recordFailedAttempt = async (errMsg: string, isCaptchaError = false) => {
      let attemptCount = 1;
      let lockoutCount = 0;
      if (lockout) {
        attemptCount = lockout.attempt_count + 1;
        lockoutCount = lockout.lockout_count;
      }

      if (attemptCount >= 5) {
        let durationMin = 5;
        let nextLockoutCount = lockoutCount + 1;
        if (lockoutCount === 0) {
          durationMin = 5;
        } else if (lockoutCount === 1) {
          durationMin = 25;
        } else {
          durationMin = 1440; // 1 day
          nextLockoutCount = 0; // Reset cycle
        }
        const lockedUntil = new Date(Date.now() + durationMin * 60 * 1000);
        await updateLockout(ip, fingerprint, 0, nextLockoutCount, lockedUntil);
        return Response.json(
          { 
            success: false, 
            error: `${errMsg}。连续错误达 5 次，系统已对您的IP或浏览器指纹封禁 ${durationMin === 1440 ? '1 天' : durationMin + ' 分钟'}` 
          },
          { status: 423, headers: corsHeaders() }
        );
      } else {
        await updateLockout(ip, fingerprint, attemptCount, lockoutCount, null);
        return Response.json(
          { 
            success: false, 
            error: `${errMsg}。您还剩 ${5 - attemptCount} 次尝试机会` 
          },
          { status: isCaptchaError ? 400 : 401, headers: corsHeaders() }
        );
      }
    };

    // 2. Verify captcha
    if (!cid || !captcha) {
      return Response.json(
        { success: false, error: '请提供验证码' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const captchaValid = await verifyAndConsumeCaptcha(cid, captcha);
    if (!captchaValid) {
      return recordFailedAttempt('验证码错误或已过期', true);
    }

    // 3. Verify password
    if (!password) {
      return Response.json(
        { success: false, error: '请提供密码' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const user = await getUserByUsername('admin');
    if (!user) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return recordFailedAttempt('密码验证失败');
    }

    if (activePasswordChecks >= MAX_PASSWORD_CHECKS) {
      return Response.json(
        { success: false, error: '登录服务繁忙，请稍后重试' },
        { status: 503, headers: { 'Retry-After': '2', ...corsHeaders() } }
      );
    }
    activePasswordChecks++;
    let valid = false;
    try {
      valid = await Bun.password.verify(password, user.password_hash);
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      activePasswordChecks--;
    }

    if (!valid) {
      return recordFailedAttempt('密码验证失败');
    }

    const token = await createToken({ username: user.username, userId: user.id });
    await updateLastActive(user.id);
    await resetLockout(ip, fingerprint);

    // Record session and audit log
    const ua = req.headers.get('user-agent') || 'Unknown User-Agent';

    // If single session is enabled, logout others immediately
    const { getSetting } = require('../db/queries/settings');
    try {
      const singleSessionVal = await getSetting('single_session_enabled');
      if (singleSessionVal === 'true') {
        await securityService.logoutOthers(user.id, token);
      }
    } catch (e) {
      console.error('Failed to query single session setting on login:', e);
    }

    await securityService.addSession(user.id, token, ua, ip);
    await securityService.recordActivity(user.id, '管理员密码验证登录', 'success');

    return Response.json(
      {
        success: true,
        data: {
          expires_at: new Date(Date.now() + SESSION_IDLE_SECONDS * 1000).toISOString(),
        },
      },
      { headers: { ...corsHeaders(), 'Set-Cookie': sessionCookie(token) } }
    );
  }

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}
