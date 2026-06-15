import { corsHeaders, handleCors } from '../middleware/cors';
import { loginRateLimit } from '../middleware/ratelimit';
import { createToken } from '../services/jwt';
import { getUserByUsername, updateLastActive, createUser } from '../db/queries/users';

async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 });
}

export async function handleAuth(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    const rateLimitResponse = loginRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();
    const password = body.password as string;
    if (!password) {
      return Response.json(
        { success: false, error: 'Password is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const user = await getUserByUsername('admin');
    if (!user) {
      // Use same delay and message to prevent user enumeration
      await new Promise(resolve => setTimeout(resolve, 500));
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const valid = await Bun.password.verify(password, user.password_hash);
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!valid) {
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const token = await createToken({ username: user.username, userId: user.id });
    await updateLastActive(user.id);

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
