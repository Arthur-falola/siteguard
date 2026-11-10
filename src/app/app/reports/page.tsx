import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DbNotConfiguredError, isDbConfigured, query } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import DbNotConnected from "@/components/dashboard/db-not-connected";
import PrintButton from "@/components/dashboard/print-button";
import ResponseTimeChart, {
  type ResponseTimePoint,
} from "@/components/dashboard/charts";
import StatusBadge from "@/components/dashboard/status-badge";
import {
  formatDateTime,
  uptimePct,
} from "@/components/dashboard/format";
import type {
  CheckRow,
  WebsiteRow,
} from "@/components/dashboard/types";
import { Card } from "@/components/ui";

type PlanKey = keyof typeof PLAN_LIMITS;

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? null;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const { site: siteId } = await searchParams;
  const user = await requireUser();
  if (!isDbConfigured()) return <DbNotConnected />;

  const planKey = (user.plan in PLAN_LIMITS ? user.plan : "free") as PlanKey;
  const historyDays = PLAN_LIMITS[planKey].historyDays;

  let sites: WebsiteRow[];
  let site: WebsiteRow | undefined;
  let checks: CheckRow[] = [];
  let incidentCount = 0;
  try {
    sites = await query<WebsiteRow>(
      "SELECT * FROM websites WHERE user_id = $1 ORDER BY created_at DESC",
      [user.id],
    );
    const selectedId = siteId ?? sites[0]?.id;
    if (selectedId) {
      site = sites.find((s) => s.id === selectedId);
      if (site) {
        [checks, incidentCount] = await Promise.all([
          query<CheckRow>(
            `SELECT * FROM checks WHERE website_id = $1
             AND checked_at >= now() - ($2::int || ' days')::interval
             ORDER BY checked_at DESC LIMIT 200`,
            [site.id, historyDays],
          ),
          query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM incidents
             WHERE website_id = $1 AND user_id = $2
             AND started_at >= now() - ($3::int || ' days')::interval`,
            [site.id, user.id, historyDays],
          ).then((rows) => Number(rows[0]?.count ?? 0)),
        ]);
      }
    }
  } catch (err) {
    if (err instanceof DbNotConfiguredError) return <DbNotConnected />;
    throw err;
  }

  const okCount = checks.filter((c) => c.ok).length;
  const uptime = uptimePct(okCount, checks.length);
  const responseTimes = checks
    .map((c) => c.response_time_ms)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);
  const avgResponse =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        )
      : null;
  const p95 = percentile(responseTimes, 95);
  const chartData: ResponseTimePoint[] = [...checks]
    .reverse()
    .filter((c) => c.response_time_ms != null)
    .map((c) => ({
      label: new Date(c.checked_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      ms: c.response_time_ms,
    }));

  return (
    <div className="space-y-6">
      {/* Print styles: only the report prints, not the dashboard chrome. */}
      <style>{`@media print { body { background: white !important; } .print\\:hidden { display: none !important; } }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Per-site uptime and performance over the last {historyDays} days (
            {PLAN_LIMITS[planKey].label} plan history).
          </p>
        </div>
        <PrintButton />
      </div>

      {sites.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold">No websites to report on</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Add a website first, then its report will appear here once checks
            have run.
          </p>
          <Link
            href="/app/websites"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add a website
          </Link>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 print:hidden" role="tablist" aria-label="Choose website">
            {sites.map((s) => (
              <Link
                key={s.id}
                href={`/app/reports?site=${s.id}`}
                aria-current={site?.id === s.id ? "true" : undefined}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  site?.id === s.id
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>

          {site ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold tracking-tight">{site.name}</h2>
                <StatusBadge status={site.is_active ? site.status : "paused"} />
                <span className="break-all text-sm text-slate-500 dark:text-slate-400">
                  {site.url}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card className="p-5">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Uptime</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {uptime != null ? `${uptime}%` : "—"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {checks.length} checks · {historyDays} days
                  </p>
                </Card>
                <Card className="p-5">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Avg response time
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {avgResponse != null ? `${avgResponse} ms` : "—"}
                  </p>
                </Card>
                <Card className="p-5">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    p95 response time
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {p95 != null ? `${p95} ms` : "—"}
                  </p>
                </Card>
                <Card className="p-5">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Incidents</p>
                  <p className="mt-1 text-2xl font-semibold">{incidentCount}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Last {historyDays} days
                  </p>
                </Card>
              </div>

              <Card className="p-5">
                <h3 className="text-base font-semibold">SSL status</h3>
                {site.ssl_expires_at ? (
                  <p className="mt-2 text-sm">
                    Certificate expires {formatDateTime(site.ssl_expires_at)} (
                    {site.ssl_days_remaining != null
                      ? `${site.ssl_days_remaining} days remaining`
                      : "unknown remaining days"}
                    ).
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {site.ssl_error
                      ? `SSL check reported an error: ${site.ssl_error}`
                      : "No SSL information recorded yet."}
                  </p>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="text-base font-semibold">Response time</h3>
                <div className="mt-4">
                  <ResponseTimeChart data={chartData} />
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-base font-semibold">Checks history</h3>
                {checks.length === 0 ? (
                  <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
                    No checks in the last {historyDays} days.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          <th className="px-4 py-3 font-medium">Checked at</th>
                          <th className="px-4 py-3 font-medium">Result</th>
                          <th className="px-4 py-3 font-medium">Status code</th>
                          <th className="px-4 py-3 font-medium">Response</th>
                          <th className="px-4 py-3 font-medium">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checks.slice(0, 50).map((check) => (
                          <tr
                            key={check.id}
                            className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                          >
                            <td className="px-4 py-3">{formatDateTime(check.checked_at)}</td>
                            <td className="px-4 py-3">{check.ok ? "Up" : "Down"}</td>
                            <td className="px-4 py-3">{check.status_code ?? "—"}</td>
                            <td className="px-4 py-3">
                              {check.response_time_ms != null
                                ? `${check.response_time_ms} ms`
                                : "—"}
                            </td>
                            <td className="max-w-64 truncate px-4 py-3 text-slate-500 dark:text-slate-400">
                              {check.error ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {checks.length > 50 ? (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Showing the 50 most recent of {checks.length} checks.
                      </p>
                    ) : null}
                  </div>
                )}
              </Card>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Report generated from recorded checks only — no data is
                estimated or invented. Uptime is the share of successful
                checks in the selected window.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              That website was not found.
            </p>
          )}
        </>
      )}
    </div>
  );
}
