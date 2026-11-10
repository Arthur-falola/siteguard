import { requireUser } from "@/lib/auth";
import { isDbConfigured, query } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plans";
import DbNotConnected from "@/components/dashboard/db-not-connected";
import NotificationPrefsForm from "@/components/dashboard/notification-prefs-form";
import { Card } from "@/components/ui";

type PlanKey = keyof typeof PLAN_LIMITS;

const ALL_PLANS: PlanKey[] = ["free", "starter", "pro"];

export default async function SettingsPage() {
  const user = await requireUser();
  const planKey = (user.plan in PLAN_LIMITS ? user.plan : "free") as PlanKey;
  const limits = PLAN_LIMITS[planKey];

  let siteCount = 0;
  if (isDbConfigured()) {
    try {
      const rows = await query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM websites WHERE user_id = $1",
        [user.id],
      );
      siteCount = Number(rows[0]?.count ?? 0);
    } catch {
      // Settings still renders without the count.
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Monitoring defaults, your plan, and notification preferences.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Monitoring defaults</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">
              Scheduled checks
            </dt>
            <dd className="font-medium">Once daily (08:00 UTC cron)</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">
              Default check interval
            </dt>
            <dd className="font-medium">60 minutes</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">
              Check timeout
            </dt>
            <dd className="font-medium">10 seconds</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">
              SSL expiry warning
            </dt>
            <dd className="font-medium">14 days before expiry</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          On the Free/Hobby setup monitoring runs once daily — this is not
          1-minute or 5-minute monitoring. You can run an immediate check at
          any time with “Check now” on a website.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Your plan</h2>
        <p className="mt-2 text-sm">
          Current plan:{" "}
          <span className="font-semibold">{limits.label}</span> — {siteCount}{" "}
          of {limits.sites} website{limits.sites === 1 ? "" : "s"} used ·{" "}
          {limits.historyDays} days of history.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium">Websites</th>
                <th className="px-4 py-2 font-medium">History</th>
              </tr>
            </thead>
            <tbody>
              {ALL_PLANS.map((key) => (
                <tr
                  key={key}
                  className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${
                    key === planKey ? "font-semibold" : ""
                  }`}
                >
                  <td className="px-4 py-2">
                    {PLAN_LIMITS[key].label}
                    {key === planKey ? " (current)" : ""}
                  </td>
                  <td className="px-4 py-2">{PLAN_LIMITS[key].sites}</td>
                  <td className="px-4 py-2">{PLAN_LIMITS[key].historyDays} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Billing coming soon — plans are launch hypotheses. There is no way
          to upgrade or pay yet.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Notification preferences</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Choose which events create a notification in your dashboard.
        </p>
        <div className="mt-4">
          <NotificationPrefsForm />
        </div>
      </Card>

      {!isDbConfigured() ? <DbNotConnected /> : null}
    </div>
  );
}
