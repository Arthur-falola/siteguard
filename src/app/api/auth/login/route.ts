import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSessionToken, setSessionCookie, verifyPassword } from '@/lib/auth';
import { isDbConfigured, query } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Generic failure message on purpose: never reveal whether the email
// exists or the password was wrong.
const INVALID_CREDENTIALS = { ok: false, error: 'Invalid email or password' };

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!rateLimit(`login:${getClientIp(req)}`, 10, 60_000)) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again in a minute.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Database not connected. Set DATABASE_URL to enable login.' },
      { status: 503 },
    );
  }
  if (!process.env.SESSION_SECRET) {
    return NextResponse.json(
      { ok: false, error: 'SESSION_SECRET is not set. Sessions cannot be created.' },
      { status: 503 },
    );
  }

  const { email, password } = parsed.data;
  try {
    const users = await query<{ id: string; password_hash: string }>(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email],
    );
    const user = users[0];
    if (!user) {
      return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
    }
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
    }
    const token = await createSessionToken(user.id);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { ok: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
