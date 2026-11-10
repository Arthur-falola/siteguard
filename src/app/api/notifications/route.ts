import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { DbNotConfiguredError, isDbConfigured, query } from "@/lib/db";
import type { NotificationRow } from "@/components/dashboard/types";

function dbError() {
  return NextResponse.json(
    {
      error:
        "Database not configured. Set DATABASE_URL, SESSION_SECRET and CRON_SECRET.",
    },
    { status: 503 },
  );
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured()) return dbError();
  try {
    const notifications = await query<NotificationRow>(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [user.id],
    );
    const unread = notifications.filter((n) => !n.is_read).length;
    return NextResponse.json({ notifications, unread });
  } catch (err) {
    if (err instanceof DbNotConfiguredError) return dbError();
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 },
    );
  }
}

const actionSchema = z.object({
  action: z.enum(["mark-read", "mark-all-read"]),
  id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured()) return dbError();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.action === "mark-all-read") {
      await query(
        "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
        [user.id],
      );
      return NextResponse.json({ ok: true });
    }
    if (!parsed.data.id) {
      return NextResponse.json(
        { error: "Notification id is required" },
        { status: 400 },
      );
    }
    await query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
      [parsed.data.id, user.id],
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DbNotConfiguredError) return dbError();
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 },
    );
  }
}
