import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { DbNotConfiguredError, isDbConfigured, query } from "@/lib/db";

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
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
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const rows = await query<{ id: string; email: string; name: string; plan: string }>(
      "UPDATE users SET name = $1, updated_at = now() WHERE id = $2 RETURNING id, email, name, plan",
      [parsed.data.name, user.id],
    );
    if (!rows[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user: rows[0] });
  } catch (err) {
    if (err instanceof DbNotConfiguredError) {
      return NextResponse.json(
        { error: "Database not configured." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
