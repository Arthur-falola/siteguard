import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DbNotConfiguredError, isDbConfigured, query } from "@/lib/db";
import DbNotConnected from "@/components/dashboard/db-not-connected";
import CheckNowButton from "@/components/dashboard/check-now-button";
import ResponseTimeChart, {
  type ResponseTimePoint,
} from "@/components/dashboard/charts";
import StatusBadge from "@/components/dashboard/status-badge";
import {
  formatDateTime,
  formatDuration,
  formatRelativeTime,
  uptimePct,
} from "@/components/dashboard/format";
import type {
  CheckRow,
  IncidentRow,
  WebsiteRow,
} from "@/components/dashboard/types";
import { Card } from "@/components/ui";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!isDbConfigured()) return <DbNotConnected />;

  let site: WebsiteRow | undefined;
  let checks: CheckRow[];
  let incidents: IncidentRow[];
  try {
    const sites = await query<WebsiteRow>(
      "SELECT * FROM websites WHERE id = $1 AND user_id = $2",
      [id, user.id],
    );
    site = sites[0];
    if (!site) notFound();
    [checks, incidents] = await Promise.all([
      query<CheckRow>(
        "SELECT * FROM checks WHERE website_id = $1 ORDER BY checked_at DESC LIMIT 50",
        [id],
      ),
      query<IncidentRow>(
        "SELECT * FROM incidents WHERE website_id = $1 AND user_id = $2 ORDER BY started_at DESC LIMIT 10",
        [id, user.id],
      ),
    ]);
  } catch (err) {
    if (err instanceof DbNotConfiguredError) return <DbNotConnected />;
    throw err;
  }
  if (!site) notFound();

  const okCount = checks.filter((c) => c.ok).length;
  const uptime = uptimePct(okCount, checks.length);
  const responseTimes = checks
    .map((c) => c.response_time_ms)
    .filter((v): v is number => v != null);
  const avgResponse =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        )
      : null;
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
      <div>
        <Link
          href="/app/websites"
          className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ← All websites
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{site.name}</h1>
          <StatusBadge status={site.is_active ? site.status : "paused"} />
          {!site.is_active ? (
            <span className="text-sm text-amber-700 dark:text-amber-400">
              Monitoring paused
            </span>
          ) : null}
        </div>
        <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
          {site.url}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <CheckNowButton siteId={site.id} />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Last check: {formatRelativeTime(site.last_checked_at)}
          {site.last_status_code != null ? ` · HTTP ${site.last_status_code}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</p>
          <p className="mt-1 text-xl font-semibold capitalize">{site.status}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Uptime</p>
          <p className="mt-1 text-xl font-semibold">
            {uptime != null ? `${uptime}%` : "—"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Based on the last {checks.length} check{checks.length === 1 ? "" : "s"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Avg response time
          </p>
          <p className="mt-1 text-xl font-semibold">
            {avgResponse != null ? `${avgResponse} ms` : "—"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Check interval
          </p>
          <p className="mt-1 text-xl font-semibold">
            {site.check_interval_minutes} min
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-base font-semibold">Response time</h2>
          <div className="mt-4">
            <ResponseTimeChart data={chartData} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold">SSL certificate</h2>
          {site.ssl_expires_at || site.ssl_issuer || site.ssl_error ? (
            <dl className="mt-3 space-y-2 text-sm">
              {site.ssl_issuer ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Issued by</dt>
                  <dd className="text-right font-medium">{site.ssl_issuer}</dd>
                </div>
              ) : null}
              {site.ssl_expires_at ? (
                <>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Expires</dt>
                    <dd className="font-medium">{formatDateTime(site.ssl_expires_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Days remaining</dt>
                    <dd className="font-medium">
                      {site.ssl_days_remaining != null
                        ? `${site.ssl_days_remaining} days`
                        : "—"}
                    </dd>
                  </div>
                </>
              ) : null}
              {site.ssl_error ? (
                <p className="rounded-lg bg-amber-100 p-2 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  SSL warning: {site.ssl_error}
                </p>
              ) : site.ssl_days_remaining != null && site.ssl_days_remaining <= 14 ? (
                <p className="rounded-lg bg-amber-100 p-2 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  SSL certificate expires soon — renew it before it lapses.
                </p>
              ) : null}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              No SSL information yet. SSL is checked for HTTPS sites on the next check.
            </p>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Recent checks</h2>
        {checks.length === 0 ? (
          <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
            No checks recorded yet.
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
                {checks.map((check) => (
                  <tr
                    key={check.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-4 py-3">{formatDateTime(check.checked_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          check.ok
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        {check.ok ? "Up" : "Down"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{check.status_code ?? "—"}</td>
                    <td className="px-4 py-3">
                      {check.response_time_ms != null ? `${check.response_time_ms} ms` : "—"}
                    </td>
                    <td className="max-w-64 truncate px-4 py-3 text-slate-500 dark:text-slate-400">
                      {check.error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Recent incidents</h2>
        {incidents.length === 0 ? (
          <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
            No incidents for this website.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {incidents.map((inc) => (
              <li key={inc.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {inc.status === "open" ? "Down since" : "Downtime"}:{" "}
                    {formatDateTime(inc.started_at)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {inc.resolved_at
                      ? `Resolved ${formatDateTime(inc.resolved_at)} · duration ${formatDuration(inc.duration_seconds)}`
                      : "Still open"}
                    {inc.cause ? ` · ${inc.cause}` : ""}
                  </p>
                </div>
                <StatusBadge status={inc.status === "open" ? "down" : "up"} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
