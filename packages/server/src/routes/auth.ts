import { corsHeaders, handleCors } from '../middleware/cors';
import { loginRateLimit } from '../middleware/ratelimit';
import { createToken } from '../services/jwt';
import { getUserByUsername, updateLastActive, createUser } from '../db/queries/users';
import { securityService } from '../services/security';
import { getLockout, updateLockout, resetLockout } from '../db/queries/lockouts';
import { saveCaptcha, verifyAndConsumeCaptcha } from '../db/queries/captchas';
import { generateCaptchaSVG } from '../services/captcha';

async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 });
}

function getClientIp(req: Request, server: any): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  try {
    const ip = server?.requestIP?.(req);
    if (ip?.address) return ip.address;
  } catch (e) {}
  return '127.0.0.1';
}

export async function handleAuth(req: Request, server?: any): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // GET /api/auth/captcha?cid=xxx
  if (url.pathname === '/api/auth/captcha' && req.method === 'GET') {
    const cid = url.searchParams.get('cid');
    if (!cid) {
      return Response.json(
        { success: false, error: 'cid parameter is required' },
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

    const body = await req.json();
    const password = body.password as string;
    const cid = body.cid as string;
    const captcha = body.captcha as string;
    const fingerprint = (body.fingerprint as string) || req.headers.get('user-agent') || 'default';

    const ip = getClientIp(req, server);

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

    const valid = await Bun.password.verify(password, user.password_hash);
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!valid) {
      return recordFailedAttempt('密码验证失败');
    }

    const token = await createToken({ username: user.username, userId: user.id });
    await updateLastActive(user.id);

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
          token,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      },
      { headers: corsHeaders() }
    );
  }

  // Setup endpoint: create admin user (one-time)
  if (url.pathname === '/api/auth/setup' && req.method === 'POST') {
    const body = await req.json();
    const password = body.password as string;
    if (!password || password.length < 8) {
      return Response.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const existing = await getUserByUsername('admin');
    if (existing) {
      return Response.json(
        { success: false, error: 'Admin user already exists' },
        { status: 409, headers: corsHeaders() }
      );
    }

    const hash = await hashPassword(password);
    await createUser('admin', hash);

    return Response.json(
      { success: true, data: { message: 'Admin user created' } },
      { status: 201, headers: corsHeaders() }
    );
  }

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}
