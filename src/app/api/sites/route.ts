import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { DbNotConfiguredError, isDbConfigured, query } from "@/lib/db";
import { PLAN_LIMITS, canAddSite } from "@/lib/plans";
import { validatePublicUrl } from "@/lib/monitor";
import type { WebsiteRow } from "@/components/dashboard/types";

type PlanKey = keyof typeof PLAN_LIMITS;

const createSiteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  url: z.string().trim().min(1, "URL is required").max(2048),
  check_interval_minutes: z.number().int().min(5).max(1440).optional(),
  is_active: z.boolean().optional(),
});

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
    const sites = await query<WebsiteRow>(
      "SELECT * FROM websites WHERE user_id = $1 ORDER BY created_at DESC",
      [user.id],
    );
    return NextResponse.json({ sites });
  } catch (err) {
    if (err instanceof DbNotConfiguredError) return dbError();
    return NextResponse.json({ error: "Failed to load websites" }, { status: 500 });
  }
}

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
  const parsed = createSiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // SSRF-safe URL validation (rejects localhost/private/reserved targets).
  // validatePublicUrl is async (DNS resolution) — must be awaited.
  let normalizedUrl: string;
  try {
    normalizedUrl = (await validatePublicUrl(parsed.data.url)).toString();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid URL" },
      { status: 400 },
    );
  }

  try {
    const planKey = (user.plan in PLAN_LIMITS ? user.plan : "free") as PlanKey;
    const countRows = await query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM websites WHERE user_id = $1",
      [user.id],
    );
    const currentCount = Number(countRows[0]?.count ?? 0);
    if (!canAddSite(planKey, currentCount)) {
      return NextResponse.json(
        {
          error: `Plan limit reached: the ${PLAN_LIMITS[planKey].label} plan allows ${PLAN_LIMITS[planKey].sites} website(s).`,
        },
        { status: 403 },
      );
    }

    const rows = await query<WebsiteRow>(
      `INSERT INTO websites (user_id, name, url, check_interval_minutes, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        user.id,
        parsed.data.name,
        normalizedUrl,
        parsed.data.check_interval_minutes ?? 60,
        parsed.data.is_active ?? true,
      ],
    );
    return NextResponse.json({ site: rows[0] }, { status: 201 });
  } catch (err) {
    if (err instanceof DbNotConfiguredError) return dbError();
    return NextResponse.json({ error: "Failed to create website" }, { status: 500 });
  }
}
