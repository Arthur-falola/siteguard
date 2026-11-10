import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protects /app/* only (see config below). API routes that need auth
// (/api/sites/* etc.) enforce it themselves via requireUser() from
// src/lib/auth.ts.
//
// Next.js 16 renamed the `middleware` convention to `proxy` (same behaviour).
// This file was renamed from middleware.ts during integration.

// NOTE — this runs on the Edge runtime, so it must NOT import the Node `pg`
// pool (src/lib/db.ts) or src/lib/auth.ts (which imports it). It does the
// same session check as getSessionUser() but lightweight: it only verifies
// the JWT signature/expiry with jose. Route handlers and pages re-check
// the user against the database via getSessionUser()/requireUser().

export const config = {
  matcher: ['/app/:path*'],
};

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const loginUrl = new URL('/login', request.url);
  const token = request.cookies.get('siteguard_session')?.value;
  if (!token) {
    return NextResponse.redirect(loginUrl);
  }
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Sessions cannot be verified without a secret — treat as unauthenticated.
    return NextResponse.redirect(loginUrl);
  }
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    });
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}
