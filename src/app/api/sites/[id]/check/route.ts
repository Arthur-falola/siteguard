import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { isDbConfigured, query } from '@/lib/db';
import { checkWebsite } from '@/lib/monitor';
import { recordCheckAndIncidents } from '@/lib/notify';
import type { WebsiteForCheck } from '@/lib/notify';
import { rateLimit } from '@/lib/rate-limit';

interface OwnedWebsite extends WebsiteForCheck {
  name: string;
  url: string;
}

// POST /api/sites/[id]/check — run one manual check for a website the
// logged-in user owns. Rate-limited to 5/min per user.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await requireUser();
  const { id } = await params;

  if (!rateLimit(`site-check:${user.id}`, 5, 60_000)) {
    return NextResponse.json(
      { ok: false, error: 'Too many checks. Please wait a minute and try again.' },
      { status: 429 },
    );
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Database not connected. Set DATABASE_URL to run checks.' },
      { status: 503 },
    );
  }

  try {
    const rows = await query<OwnedWebsite>(
      'SELECT id, user_id, name, url, status FROM websites WHERE id = $1 AND user_id = $2',
      [id, user.id],
    );
    const website = rows[0];
    if (!website) {
      return NextResponse.json({ ok: false, error: 'Website not found' }, { status: 404 });
    }
    const result = await checkWebsite(website.url);
    const recorded = await recordCheckAndIncidents(website, result);
    return NextResponse.json({ ok: true, status: recorded.status, check: result });
  } catch (err) {
    console.error(`Manual check failed for website ${id}:`, err);
    return NextResponse.json(
      { ok: false, error: 'Check failed. Please try again.' },
      { status: 500 },
    );
  }
}
