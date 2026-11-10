import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isDbConfigured, query } from '@/lib/db';
import { checkWebsite } from '@/lib/monitor';
import { recordCheckAndIncidents } from '@/lib/notify';
import type { WebsiteForCheck } from '@/lib/notify';

interface CronWebsite extends WebsiteForCheck {
  name: string;
  url: string;
}

// Daily scheduled check (vercel.json: 0 8 * * * — once daily on the
// Free/Hobby setup; do not claim faster monitoring).
//
// Auth: when CRON_SECRET is set, the request must carry
// `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this itself
// when CRON_SECRET is configured). When CRON_SECRET is unset, the endpoint
// only works outside production (local development).
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: CRON_SECRET is not set' },
      { status: 401 },
    );
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Database not connected. Set DATABASE_URL to run checks.' },
      { status: 503 },
    );
  }

  let websites: CronWebsite[];
  try {
    websites = await query<CronWebsite>(
      `SELECT w.id, w.user_id, w.name, w.url, w.status
         FROM websites w
         JOIN users u ON u.id = w.user_id
        WHERE w.is_active = true
        ORDER BY w.created_at ASC`,
    );
  } catch (err) {
    console.error('Cron check: failed to load websites:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load websites' },
      { status: 500 },
    );
  }

  let up = 0;
  let down = 0;
  let errors = 0;
  // Sequential: one site at a time, so a slow site cannot stall the rest
  // into a stampede of parallel 10s fetches.
  for (const website of websites) {
    try {
      const result = await checkWebsite(website.url);
      await recordCheckAndIncidents(website, result);
      if (result.ok) {
        up += 1;
      } else {
        down += 1;
      }
    } catch (err) {
      errors += 1;
      console.error(`Cron check failed for website ${website.id} (${website.url}):`, err);
    }
  }

  return NextResponse.json({ checked: websites.length, up, down, errors });
}
