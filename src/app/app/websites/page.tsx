import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DbNotConfiguredError, isDbConfigured, query } from "@/lib/db";
import { PLAN_LIMITS, canAddSite } from "@/lib/plans";
import DbNotConnected from "@/components/dashboard/db-not-connected";
import AddSiteForm from "@/components/dashboard/add-site-form";
import SiteActions from "@/components/dashboard/site-actions";
import SiteTable from "@/components/dashboard/site-table";
import type { WebsiteRow } from "@/components/dashboard/types";
import { Card } from "@/components/ui";

type PlanKey = keyof typeof PLAN_LIMITS;

export default async function WebsitesPage() {
  const user = await requireUser();
  if (!isDbConfigured()) return <DbNotConnected />;

  let sites: WebsiteRow[];
  try {
    sites = await query<WebsiteRow>(
      "SELECT * FROM websites WHERE user_id = $1 ORDER BY created_at DESC",
      [user.id],
    );
  } catch (err) {
    if (err instanceof DbNotConfiguredError) return <DbNotConnected />;
    throw err;
  }

  const planKey = (user.plan in PLAN_LIMITS ? user.plan : "free") as PlanKey;
  const limits = PLAN_LIMITS[planKey];
  const atLimit = !canAddSite(planKey, sites.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Websites</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {sites.length} of {limits.sites} website{limits.sites === 1 ? "" : "s"}{" "}
          on the {limits.label} plan · history kept {limits.historyDays} days.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Add a website</h2>
        {atLimit ? (
          <p
            className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
            role="alert"
          >
            You have reached the {limits.label} plan limit of {limits.sites}{" "}
            website{limits.sites === 1 ? "" : "s"}. Billing coming soon — plans
            are launch hypotheses.
          </p>
        ) : (
          <div className="mt-3">
            <AddSiteForm />
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Your websites</h2>
        {sites.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No websites yet. Add one above to start monitoring.
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <SiteTable sites={sites} actions={(site) => <SiteActions site={site} />} />
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Monitoring runs once daily on the Free/Hobby setup. Use “Check now” on
        a website’s page for an immediate check.{" "}
        <Link
          href="/app/settings"
          className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          See monitoring defaults
        </Link>
      </p>
    </div>
  );
}
