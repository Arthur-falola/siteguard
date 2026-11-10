import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { DbNotConfiguredError, isDbConfigured, query } from "@/lib/db";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        error:
          "Database not configured. Set DATABASE_URL, SESSION_SECRET and CRON_SECRET.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const rows = await query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [user.id],
    );
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const matches = await verifyPassword(
      parsed.data.currentPassword,
      row.password_hash,
    );
    if (!matches) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }
    const newHash = await hashPassword(parsed.data.newPassword);
    await query(
      "UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2",
      [newHash, user.id],
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DbNotConfiguredError) {
      return NextResponse.json(
        { error: "Database not configured." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 },
    );
  }
}
