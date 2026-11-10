import Link from "next/link";
import type { ReactNode } from "react";
import type { WebsiteRow } from "./types";
import StatusBadge from "./status-badge";
import { formatRelativeTime } from "./format";

export default function SiteTable({
  sites,
  actions,
}: {
  sites: WebsiteRow[];
  actions?: (site: WebsiteRow) => ReactNode;
}) {
  if (sites.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        No websites monitored yet.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-4 py-3 font-medium">Website</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Last check</th>
            <th className="px-4 py-3 font-medium">Response</th>
            <th className="px-4 py-3 font-medium">SSL</th>
            {actions ? <th className="px-4 py-3 font-medium">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => (
            <tr
              key={site.id}
              className="border-b border-slate-100 last:border-0 dark:border-slate-800"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/app/websites/${site.id}`}
                  className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {site.name}
                </Link>
                <p className="max-w-64 truncate text-xs text-slate-500 dark:text-slate-400">
                  {site.url}
                </p>
                {!site.is_active ? (
                  <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    Paused
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={site.is_active ? site.status : "paused"} />
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                {formatRelativeTime(site.last_checked_at)}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                {site.last_response_time_ms != null
                  ? `${site.last_response_time_ms} ms`
                  : "—"}
                {site.last_status_code != null ? (
                  <span className="text-xs text-slate-400">
                    {" "}
                    · {site.last_status_code}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                {site.ssl_days_remaining != null
                  ? `${site.ssl_days_remaining} days left`
                  : site.ssl_error
                    ? "Warning"
                    : "—"}
              </td>
              {actions ? (
                <td className="px-4 py-3">{actions(site)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
