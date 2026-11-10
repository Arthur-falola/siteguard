import { Card } from "@/components/ui";
import { Section, SectionHeading } from "./section";
import { BellIcon, GlobeIcon, PlusIcon } from "./icons";

const STEPS = [
  {
    icon: <PlusIcon className="h-5 w-5" />,
    step: "Step 1",
    title: "Add a website",
    description:
      "Paste the URL of your site — or a client's. SiteGuard validates that it is a public website and starts watching it. No code to install, no DNS changes.",
  },
  {
    icon: <GlobeIcon className="h-5 w-5" />,
    step: "Step 2",
    title: "SiteGuard checks it daily",
    description:
      "Every day, each site is checked for availability, response time, and SSL certificate health. Results are stored, so uptime history builds itself over time.",
  },
  {
    icon: <BellIcon className="h-5 w-5" />,
    title: "Get alerted — and fix it first",
    step: "Step 3",
    description:
      "The moment a site goes down or a certificate nears expiry, you get a notification with the details. Fix it, and the incident closes with a full timeline.",
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      className="bg-slate-50 dark:bg-ink-900/60"
    >
      <SectionHeading
        eyebrow="How it works"
        title="From zero to monitored in three steps"
        description="There is nothing to install on the site itself. If you can paste a URL, you can monitor it."
      />
      <div className="relative mt-12 grid gap-5 md:grid-cols-3">
        {/* Connector line (desktop only) */}
        <div
          aria-hidden="true"
          className="absolute top-10 right-[16%] left-[16%] hidden border-t-2 border-dashed border-slate-300 md:block dark:border-slate-700"
        />
        {STEPS.map((s, i) => (
          <Card key={s.title} className="relative p-6">
            <div className="flex items-center gap-3">
              <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm dark:bg-brand-500">
                {s.icon}
              </span>
              <span className="text-sm font-semibold tracking-wide text-brand-600 uppercase dark:text-brand-400">
                {s.step}
              </span>
              <span className="ml-auto text-4xl font-bold text-slate-100 select-none dark:text-slate-800">
                {i + 1}
              </span>
            </div>
            <h3 className="mt-5 text-base font-semibold text-slate-900 dark:text-white">
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {s.description}
            </p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
