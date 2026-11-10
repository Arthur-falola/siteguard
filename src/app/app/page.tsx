import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DbNotConfiguredError, isDbConfigured, query } from "@/lib/db";
import DbNotConnected from "@/components/dashboard/db-not-connected";
import StatCard from "@/components/dashboard/stat-card";
import StatusBadge from "@/components/dashboard/status-badge";
import SiteTable from "@/components/dashboard/site-table";
import ResponseTimeChart, {
  type ResponseTimePoint,
} from "@/components/dashboard/charts";
import {
  formatDateTime,
  formatDuration,
  formatRelativeTime,
  isDown,
  isUp,
  uptimePct,
} from "@/components/dashboard/format";
import type {
  CheckRow,
  IncidentRow,
  WebsiteRow,
} from "@/components/dashboard/types";
import { Card } from "@/components/ui";

export default async function OverviewPage() {
  const user = await requireUser();
  if (!isDbConfigured()) return <DbNotConnected />;

  let sites: WebsiteRow[];
  let recentChecks: CheckRow[];
  let recentIncidents: IncidentRow[];
  let uptime: { ok: number; total: number };
  let avgResponse: number | null;
  let chartData: ResponseTimePoint[];
  try {
    [sites, recentChecks, recentIncidents] = await Promise.all([
      query<WebsiteRow>(
        "SELECT * FROM websites WHERE user_id = $1 ORDER BY created_at DESC",
        [user.id],
      ),
      query<CheckRow>(
        `SELECT c.*, w.name AS website_name, w.url AS website_url
         FROM checks c JOIN websites w ON w.id = c.website_id
         WHERE w.user_id = $1
         ORDER BY c.checked_at DESC LIMIT 10`,
        [user.id],
      ),
      query<IncidentRow>(
        `SELECT i.*, w.name AS website_name, w.url AS website_url
         FROM incidents i JOIN websites w ON w.id = i.website_id
         WHERE i.user_id = $1
         ORDER BY i.started_at DESC LIMIT 5`,
        [user.id],
      ),
    ]);

    const uptimeRows = await query<{ ok: string; total: string }>(
      `SELECT COUNT(*) FILTER (WHERE c.ok)::text AS ok,
              COUNT(*)::text AS total
       FROM checks c JOIN websites w ON w.id = c.website_id
       WHERE w.user_id = $1 AND c.checked_at >= now() - interval '7 days'`,
      [user.id],
    );
    uptime = {
      ok: Number(uptimeRows[0]?.ok ?? 0),
      total: Number(uptimeRows[0]?.total ?? 0),
    };

    const avgRows = await query<{ avg_ms: string | null }>(
      `SELECT AVG(c.response_time_ms)::text AS avg_ms
       FROM checks c JOIN websites w ON w.id = c.website_id
       WHERE w.user_id = $1 AND c.checked_at >= now() - interval '7 days'
         AND c.response_time_ms IS NOT NULL`,
      [user.id],
    );
    avgResponse =
      avgRows[0]?.avg_ms != null ? Math.round(Number(avgRows[0].avg_ms)) : null;

    const chartRows = await query<{ bucket: string; avg_ms: string | null }>(
      `SELECT date_trunc('hour', c.checked_at)::text AS bucket,
              AVG(c.response_time_ms)::text AS avg_ms
       FROM checks c JOIN websites w ON w.id = c.website_id
       WHERE w.user_id = $1 AND c.checked_at >= now() - interval '24 hours'
         AND c.response_time_ms IS NOT NULL
       GROUP BY bucket ORDER BY bucket ASC`,
      [user.id],
    );
    chartData = chartRows.map((r) => ({
      label: new Date(r.bucket).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      ms: r.avg_ms != null ? Math.round(Number(r.avg_ms)) : null,
    }));
  } catch (err) {
    if (err instanceof DbNotConfiguredError) return <DbNotConnected />;
    throw err;
  }

  const online = sites.filter((s) => s.is_active && isUp(s.status)).length;
  const down = sites.filter((s) => s.is_active && isDown(s.status)).length;
  const uptimeValue = uptimePct(uptime.ok, uptime.total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Welcome back, {user.name}. Here is the state of your websites.
          </p>
        </div>
        <Link
          href="/app/websites"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Manage websites
        </Link>
      </div>

      {sites.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold">No websites yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Add your first website and SiteGuard will start checking it and
            alert you when it goes down.
          </p>
          <Link
            href="/app/websites"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add your first website
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard title="Total sites" value={String(sites.length)} />
            <StatCard title="Online" value={String(online)} hint="Currently up" />
            <StatCard
              title="Down"
              value={String(down)}
              hint={down > 0 ? "Needs attention" : "All clear"}
            />
            <StatCard
              title="Avg response time"
              value={avgResponse != null ? `${avgResponse} ms` : "—"}
              hint="Last 7 days"
            />
            <StatCard
              title="Uptime"
              value={uptimeValue != null ? `${uptimeValue}%` : "—"}
              hint="Last 7 days"
            />
          </div>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Response time — last 24h</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hourly average across all monitored sites.
            </p>
            <div className="mt-4">
              <ResponseTimeChart data={chartData} />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Recent incidents</h2>
                <Link
                  href="/app/incidents"
                  className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  View all
                </Link>
              </div>
              {recentIncidents.length === 0 ? (
                <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
                  No incidents recorded. That is good news.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                  {recentIncidents.map((inc) => (
                    <li key={inc.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {inc.website_name ?? "Website"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Started {formatRelativeTime(inc.started_at)}
                          {inc.resolved_at
                            ? ` · resolved after ${formatDuration(inc.duration_seconds)}`
                            : " · still open"}
                        </p>
                      </div>
                      <StatusBadge status={inc.status === "open" ? "down" : "up"} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold">Recent activity</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest monitoring checks.
              </p>
              {recentChecks.length === 0 ? (
                <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
                  No checks yet. Checks run once daily on the Free/Hobby
                  setup, or use “Check now” on a website.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                  {recentChecks.map((check) => (
                    <li key={check.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {check.website_name ?? "Website"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(check.checked_at)}
                          {check.error ? ` · ${check.error}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          check.ok
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        {check.ok
                          ? `${check.response_time_ms ?? "—"} ms`
                          : "Failed"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Site status</h2>
              <Link
                href="/app/websites"
                className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Manage websites
              </Link>
            </div>
            <div className="mt-3">
              <SiteTable sites={sites} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
