import { requireUser } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/plans";
import {
  ChangeNameForm,
  ChangePasswordForm,
} from "@/components/dashboard/account-forms";
import { Card } from "@/components/ui";

type PlanKey = keyof typeof PLAN_LIMITS;

export default async function AccountPage() {
  const user = await requireUser();
  const planKey = (user.plan in PLAN_LIMITS ? user.plan : "free") as PlanKey;
  const limits = PLAN_LIMITS[planKey];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your profile, security, and plan.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Profile</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">Plan</dt>
            <dd className="font-medium">{limits.label}</dd>
          </div>
        </dl>
        <div className="mt-4 max-w-md">
          <ChangeNameForm currentName={user.name} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Change password</h2>
        <div className="mt-4 max-w-md">
          <ChangePasswordForm />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Plan</h2>
        <p className="mt-2 text-sm">
          You are on the <span className="font-semibold">{limits.label}</span>{" "}
          plan: {limits.sites} website{limits.sites === 1 ? "" : "s"},{" "}
          {limits.historyDays} days of history.
        </p>
        <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Billing coming soon — plans are launch hypotheses. There is no way
          to upgrade or pay yet.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold text-red-600 dark:text-red-400">
          Danger zone
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Account deletion is not available yet. If you need your account and
          all of its monitored data removed, contact support and it will be
          handled manually.
        </p>
      </Card>
    </div>
  );
}
