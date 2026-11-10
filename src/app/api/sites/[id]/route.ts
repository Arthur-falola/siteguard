import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { DbNotConfiguredError, isDbConfigured, query } from "@/lib/db";
import type { WebsiteRow } from "@/components/dashboard/types";

function dbError() {
  return NextResponse.json(
    {
      error:
        "Database not configured. Set DATABASE_URL, SESSION_SECRET and CRON_SECRET.",
    },
    { status: 503 },
  );
}

type RouteContext = { params: Promise<{ id: string }> };

async function getOwnSite(userId: string, id: string) {
  const rows = await query<WebsiteRow>(
    "SELECT * FROM websites WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return rows[0] ?? null;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured()) return dbError();
  try {
    const site = await getOwnSite(user.id, id);
    if (!site) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }
    return NextResponse.json({ site });
  } catch (err) {
    if (err instanceof DbNotConfiguredError) return dbError();
    return NextResponse.json({ error: "Failed to load website" }, { status: 500 });
  }
}

const patchSiteSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100).optional(),
    check_interval_minutes: z.number().int().min(5).max(1440).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Nothing to update",
  });

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
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
  const parsed = patchSiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const existing = await getOwnSite(user.id, id);
    if (!existing) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    if (parsed.data.name !== undefined) {
      values.push(parsed.data.name);
      sets.push(`name = $${values.length}`);
    }
    if (parsed.data.check_interval_minutes !== undefined) {
      values.push(parsed.data.check_interval_minutes);
      sets.push(`check_interval_minutes = $${values.length}`);
    }
    if (parsed.data.is_active !== undefined) {
      values.push(parsed.data.is_active);
      sets.push(`is_active = $${values.length}`);
    }
    values.push(id, user.id);
    const rows = await query<WebsiteRow>(
      `UPDATE websites SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${values.length - 1} AND user_id = $${values.length}
       RETURNING *`,
      values,
    );
    return NextResponse.json({ site: rows[0] });
  } catch (err) {
    if (err instanceof DbNotConfiguredError) return dbError();
    return NextResponse.json({ error: "Failed to update website" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured()) return dbError();
  try {
    const existing = await getOwnSite(user.id, id);
    if (!existing) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }
    await query("DELETE FROM websites WHERE id = $1 AND user_id = $2", [
      id,
      user.id,
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DbNotConfiguredError) return dbError();
    return NextResponse.json({ error: "Failed to delete website" }, { status: 500 });
  }
}
