import Link from "next/link";

/** Honest empty state shown when DATABASE_URL is not configured.
 *  Never renders fake monitoring data. */
export default function DbNotConnected() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      <h2 className="text-lg font-semibold">Database not connected</h2>
      <p className="mt-2 text-sm">
        SiteGuard cannot load your monitoring data because the database is not
        configured. No data is shown rather than showing sample or fake data.
      </p>
      <p className="mt-3 text-sm font-medium">
        Set these environment variables and restart the app:
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 font-mono text-sm">
        <li>DATABASE_URL — PostgreSQL connection string</li>
        <li>SESSION_SECRET — secret used to sign session tokens</li>
        <li>CRON_SECRET — secret protecting the scheduled check endpoint</li>
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/app/settings" className="font-medium text-indigo-600 underline dark:text-indigo-400">
          See Settings
        </Link>{" "}
        for the current plan and monitoring defaults, which do not need a
        database connection.
      </p>
    </div>
  );
}
