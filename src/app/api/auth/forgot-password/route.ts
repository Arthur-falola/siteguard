import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { isDbConfigured, query } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(255),
});

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Always returns { ok: true } — whether or not the email exists — so the
// response never reveals if an account is registered for that address.
// The reset token itself is NEVER returned in the response.
// `sent` reports whether the reset email was actually sent (false when no
// account exists, the DB/email is unconfigured, or sending failed).
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!rateLimit(`forgot-password:${getClientIp(req)}`, 10, 60_000)) {
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
  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const { email } = parsed.data;
  let emailSent = false;
  try {
    if (!isDbConfigured()) {
      // Nothing we can do without a database; still answer { ok: true }
      // so the endpoint never leaks account existence or DB state.
      return NextResponse.json({ ok: true, sent: false });
    }
    const users = await query<{ id: string; email: string }>(
      'SELECT id, email FROM users WHERE email = $1',
      [email],
    );
    const user = users[0];
    if (user) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      await query(
        'UPDATE users SET reset_token_hash = $1, reset_token_expires_at = $2, updated_at = now() WHERE id = $3',
        [tokenHash, expiresAt, user.id],
      );
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '');
      const resetLink = `${appUrl}/reset-password?token=${token}`;
      const result = await sendEmail(
        user.email,
        'Reset your SiteGuard password',
        `<p>You asked to reset your SiteGuard password.</p>` +
          `<p><a href="${resetLink}">Reset your password</a></p>` +
          `<p>This link expires in 24 hours. If you did not request this, you can ignore this email.</p>`,
      );
      emailSent = result.sent;
      if (!result.sent) {
        // Honest server-side record; the response stays { ok: true } so
        // account existence is not leaked. The UI must tell the user the
        // reset email could not be sent and to contact support.
        console.error(`Password-reset email for ${user.email} was not sent: ${result.reason}`);
      }
    }
  } catch (err) {
    console.error('Forgot-password error:', err);
  }
  return NextResponse.json({ ok: true, sent: emailSent });
}
