import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSessionToken, hashPassword, setSessionCookie } from '@/lib/auth';
import { isDbConfigured, query } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === '23505'
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!rateLimit(`register:${getClientIp(req)}`, 10, 60_000)) {
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
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Database not connected. Set DATABASE_URL to enable registration.' },
      { status: 503 },
    );
  }
  if (!process.env.SESSION_SECRET) {
    return NextResponse.json(
      { ok: false, error: 'SESSION_SECRET is not set. Sessions cannot be created.' },
      { status: 503 },
    );
  }

  const { name, email, password } = parsed.data;
  try {
    const existing = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return NextResponse.json(
        { ok: false, error: 'An account with this email already exists' },
        { status: 400 },
      );
    }
    const passwordHash = await hashPassword(password);
    const users = await query<{ id: string }>(
      'INSERT INTO users (email, password_hash, name, plan) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, passwordHash, name, 'free'],
    );
    const userId = users[0]?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Could not create account' }, { status: 500 });
    }
    // Future billing placeholder only — no payments are taken.
    await query('INSERT INTO subscriptions (user_id, plan, status) VALUES ($1, $2, $3)', [
      userId,
      'free',
      'inactive',
    ]);
    const token = await createSessionToken(userId);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { ok: false, error: 'An account with this email already exists' },
        { status: 400 },
      );
    }
    console.error('Register error:', err);
    return NextResponse.json(
      { ok: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
