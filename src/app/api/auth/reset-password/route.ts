import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth';
import { isDbConfigured, query } from '@/lib/db';

const resetSchema = z.object({
  token: z.string().min(1, 'Reset token is required').max(256),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Database not connected. Set DATABASE_URL to reset your password.' },
      { status: 503 },
    );
  }

  const { token, password } = parsed.data;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  try {
    const users = await query<{ id: string }>(
      'SELECT id FROM users WHERE reset_token_hash = $1 AND reset_token_expires_at > now()',
      [tokenHash],
    );
    const user = users[0];
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or expired reset token' },
        { status: 400 },
      );
    }
    const passwordHash = await hashPassword(password);
    await query(
      `UPDATE users
         SET password_hash = $1, reset_token_hash = NULL,
             reset_token_expires_at = NULL, updated_at = now()
       WHERE id = $2`,
      [passwordHash, user.id],
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Reset-password error:', err);
    return NextResponse.json(
      { ok: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
