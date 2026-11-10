import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { query } from './db';

export const SESSION_COOKIE_NAME = 'siteguard_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  plan: string;
}

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET is not set. Set SESSION_SECRET to a long random string to enable sessions.',
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

/** Create a signed HS256 session JWT (7-day expiry) for a user id. */
export async function createSessionToken(userId: string): Promise<string> {
  const secret = getSessionSecret();
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/**
 * Read the session cookie, verify the JWT and load the user.
 * Returns null on any failure (no cookie, bad/expired token, missing
 * SESSION_SECRET, missing user, database not configured).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const secret = process.env.SESSION_SECRET;
    if (!secret) return null;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    });
    const userId = payload.sub;
    if (!userId) return null;
    const rows = await query<SessionUser>(
      'SELECT id, email, name, plan FROM users WHERE id = $1',
      [userId],
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** Return the logged-in user, or redirect to /login when unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}
