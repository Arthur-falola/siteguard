import { query } from './db';
import type { CheckResult } from './monitor';

/** Minimal website row shape recordCheckAndIncidents needs. */
export interface WebsiteForCheck {
  id: string;
  user_id: string;
  status: string;
  name?: string;
  url?: string;
}

/** Insert a notification row and return its id. */
export async function createNotification(
  userId: string,
  websiteId: string | null,
  type: string,
  title: string,
  message: string,
): Promise<string> {
  const rows = await query<{ id: string }>(
    'INSERT INTO notifications (user_id, website_id, type, title, message) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [userId, websiteId, type, title, message],
  );
  return rows[0]?.id ?? '';
}

/**
 * Persist one check result and maintain website status, incidents and
 * notifications:
 * - inserts a `checks` row and updates the website's status / last_* / ssl_*
 *   fields;
 * - on transition to down, opens an incident (status 'open', deduped by the
 *   partial unique index — one open incident per website) and creates a
 *   'site_down' notification;
 * - on recovery from down, resolves the open incident (resolved_at,
 *   duration_seconds) and creates a 'site_recovered' notification;
 * - when the SSL certificate expires within 14 days, creates an
 *   'ssl_expiring' notification at most once per site per 24h.
 */
export async function recordCheckAndIncidents(
  website: WebsiteForCheck,
  result: CheckResult,
): Promise<{ checkId: string; status: string }> {
  // Additive columns introduced by migration 002 (ssl_issuer,
  // failure_kind). Applied idempotently here so a deployment that has
  // not run the migration yet keeps working — never a breaking change,
  // and a no-op once the columns exist.
  await query(`ALTER TABLE checks ADD COLUMN IF NOT EXISTS failure_kind text`);
  await query(`ALTER TABLE websites ADD COLUMN IF NOT EXISTS ssl_issuer text`);

  const checkRows = await query<{ id: string }>(
    'INSERT INTO checks (website_id, status_code, response_time_ms, ok, error, failure_kind) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [website.id, result.statusCode, result.responseTimeMs, result.ok, result.error, result.failureKind],
  );
  const checkId = checkRows[0]?.id ?? '';

  const newStatus = result.ok ? 'up' : 'down';
  const previousStatus = website.status;
  const siteLabel = website.name ?? website.url ?? 'Your site';

  await query(
    `UPDATE websites
       SET status = $1, last_status_code = $2, last_response_time_ms = $3,
           last_checked_at = now(), ssl_expires_at = $4, ssl_days_remaining = $5,
           ssl_error = $6, ssl_issuer = $7, updated_at = now()
     WHERE id = $8`,
    [
      newStatus,
      result.statusCode,
      result.responseTimeMs,
      result.ssl.expiresAt,
      result.ssl.daysRemaining,
      result.ssl.error,
      result.ssl.issuer,
      website.id,
    ],
  );

  // Transition to down: open an incident + notify (once per transition).
  if (previousStatus !== 'down' && newStatus === 'down') {
    const cause =
      result.error ??
      (result.statusCode !== null ? `HTTP ${result.statusCode}` : 'Check failed');
    await query(
      `INSERT INTO incidents (website_id, user_id, cause)
       VALUES ($1, $2, $3)
       ON CONFLICT (website_id) WHERE status = 'open' DO NOTHING`,
      [website.id, website.user_id, cause],
    );
    await createNotification(
      website.user_id,
      website.id,
      'site_down',
      `${siteLabel} is down`,
      `${siteLabel} failed its latest check: ${cause}.`,
    );
  }

  // Recovery: resolve the open incident + notify.
  if (previousStatus === 'down' && newStatus === 'up') {
    await query(
      `UPDATE incidents
         SET resolved_at = now(),
             duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::int,
             status = 'resolved'
       WHERE website_id = $1 AND status = 'open'`,
      [website.id],
    );
    await createNotification(
      website.user_id,
      website.id,
      'site_recovered',
      `${siteLabel} is back up`,
      `${siteLabel} recovered and is responding again.`,
    );
  }

  // SSL expiring soon: notify at most once per site per 24h.
  if (result.ssl.daysRemaining !== null && result.ssl.daysRemaining <= 14) {
    const recent = await query<{ one: number }>(
      `SELECT 1 AS one FROM notifications
        WHERE website_id = $1 AND type = $2
          AND created_at >= now() - interval '24 hours'
        LIMIT 1`,
      [website.id, 'ssl_expiring'],
    );
    if (recent.length === 0) {
      const days = result.ssl.daysRemaining;
      await createNotification(
        website.user_id,
        website.id,
        'ssl_expiring',
        `SSL certificate expiring for ${siteLabel}`,
        `The SSL certificate for ${siteLabel} expires in ${days} day${days === 1 ? '' : 's'}. Renew it before it lapses.`,
      );
    }
  }

  return { checkId, status: newStatus };
}
