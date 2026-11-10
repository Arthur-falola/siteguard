import { Card } from "@/components/ui";
import { Section, SectionHeading } from "./section";
import { CheckIcon, UserIcon, UsersIcon } from "./icons";

const FREELANCER_BENEFITS = [
  "Stop finding out about downtime from your client — hear it from SiteGuard first.",
  "Prove your maintenance work with uptime numbers and incident history.",
  "One dashboard for your portfolio site and every client site you manage.",
  "SSL alerts mean no more embarrassing expired-certificate calls.",
  "Free plan covers your own site while you try it out.",
];

const AGENCY_BENEFITS = [
  "A single status view across every client site, so nothing slips through.",
  "Incident timelines give account managers facts, not guesses, when a client asks what happened.",
  "Reports turn invisible uptime work into a visible, billable service.",
  "Scale from 1 to 20 sites as your client list grows — same workflow, no new tools.",
  "Hand new team members one login instead of five monitoring accounts.",
];

function BenefitList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <CheckIcon className="h-3 w-3" />
          </span>
          <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Benefits() {
  return (
    <Section id="benefits">
      <SectionHeading
        eyebrow="Who it's for"
        title="Built for the people who answer when a site goes down"
        description="Whether you look after one site or twenty, the job is the same: know first, fix fast, and show your work."
      />
      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <Card className="p-6 sm:p-8">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-brand-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            <UserIcon className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
            For freelancers
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Your reputation is the business. SiteGuard makes sure a client
            never discovers a dead site before you do.
          </p>
          <BenefitList items={FREELANCER_BENEFITS} />
        </Card>

        <Card className="p-6 sm:p-8">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-brand-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            <UsersIcon className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
            For agencies
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Client sites multiply fast. SiteGuard keeps the whole portfolio in
            one place, with a paper trail for every outage.
          </p>
          <BenefitList items={AGENCY_BENEFITS} />
        </Card>
      </div>
    </Section>
  );
}
