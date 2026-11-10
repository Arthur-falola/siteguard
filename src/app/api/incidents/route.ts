import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { DbNotConfiguredError, isDbConfigured, query } from "@/lib/db";
import type { IncidentRow } from "@/components/dashboard/types";

export async function GET(req: NextRequest) {
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

  const status = req.nextUrl.searchParams.get("status");
  const filter = status === "open" || status === "resolved" ? status : "all";

  try {
    const incidents = await query<IncidentRow>(
      `SELECT i.*, w.name AS website_name, w.url AS website_url,
              COALESCE(i.duration_seconds,
                EXTRACT(EPOCH FROM (COALESCE(i.resolved_at, now()) - i.started_at)))::int AS duration_seconds
       FROM incidents i JOIN websites w ON w.id = i.website_id
       WHERE i.user_id = $1
         AND ($2::text = 'all' OR i.status = $2::text)
       ORDER BY i.started_at DESC LIMIT 100`,
      [user.id, filter],
    );
    return NextResponse.json({ incidents });
  } catch (err) {
    if (err instanceof DbNotConfiguredError) {
      return NextResponse.json(
        { error: "Database not configured." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to load incidents" },
      { status: 500 },
    );
  }
}
