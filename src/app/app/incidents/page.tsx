import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DbNotConfiguredError, isDbConfigured, query } from "@/lib/db";
import DbNotConnected from "@/components/dashboard/db-not-connected";
import StatusBadge from "@/components/dashboard/status-badge";
import {
  formatDateTime,
  formatDuration,
  formatRelativeTime,
} from "@/components/dashboard/format";
import type { IncidentRow } from "@/components/dashboard/types";
import { Card } from "@/components/ui";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
] as const;

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status === "open" || status === "resolved" ? status : "all";
  const user = await requireUser();
  if (!isDbConfigured()) return <DbNotConnected />;

  let openIncidents: IncidentRow[];
  let history: IncidentRow[];
  try {
    [openIncidents, history] = await Promise.all([
      query<IncidentRow>(
        `SELECT i.*, w.name AS website_name, w.url AS website_url
         FROM incidents i JOIN websites w ON w.id = i.website_id
         WHERE i.user_id = $1 AND i.status = 'open'
         ORDER BY i.started_at DESC`,
        [user.id],
      ),
      query<IncidentRow>(
        `SELECT i.*, w.name AS website_name, w.url AS website_url,
                COALESCE(i.duration_seconds,
                  EXTRACT(EPOCH FROM (COALESCE(i.resolved_at, now()) - i.started_at)))::int AS duration_seconds
         FROM incidents i JOIN websites w ON w.id = i.website_id
         WHERE i.user_id = $1
           AND ($2::text = 'all' OR i.status = $2::text)
         ORDER BY i.started_at DESC LIMIT 100`,
        [user.id, filter],
      ),
    ]);
  } catch (err) {
    if (err instanceof DbNotConfiguredError) return <DbNotConnected />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Downtime events across your monitored websites.
        </p>
      </div>

      {/* Open incidents — prominent at top */}
      <section aria-label="Open incidents">
        <h2 className="text-base font-semibold">
          Open incidents{" "}
          <span className="text-slate-500 dark:text-slate-400">
            ({openIncidents.length})
          </span>
        </h2>
        {openIncidents.length === 0 ? (
          <Card className="mt-3 border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950/30">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              No open incidents — all monitored sites are up.
            </p>
          </Card>
        ) : (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {openIncidents.map((inc) => (
              <Card
                key={inc.id}
                className="border-red-300 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/app/websites/${inc.website_id}`}
                    className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {inc.website_name ?? "Website"}
                  </Link>
                  <StatusBadge status="down" />
                </div>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  Down since {formatDateTime(inc.started_at)} (
                  {formatRelativeTime(inc.started_at)})
                </p>
                {inc.cause ? (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Cause: {inc.cause}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Duration so far: {formatDuration(inc.duration_seconds)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Incident history</h2>
          <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-700" role="tablist" aria-label="Filter incidents">
            {FILTERS.map((f) => (
              <Link
                key={f.value}
                href={`/app/incidents?status=${f.value}`}
                aria-current={filter === f.value ? "true" : undefined}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  filter === f.value
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No {filter === "all" ? "" : `${filter} `}incidents recorded.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Website</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Resolved</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((inc) => (
                  <tr
                    key={inc.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/websites/${inc.website_id}`}
                        className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {inc.website_name ?? "Website"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatDateTime(inc.started_at)}</td>
                    <td className="px-4 py-3">
                      {inc.resolved_at ? formatDateTime(inc.resolved_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {formatDuration(inc.duration_seconds)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inc.status === "open" ? "down" : "up"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
