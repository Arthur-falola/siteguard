import { Card } from "@/components/ui";
import { Section, SectionHeading } from "./section";
import {
  BellIcon,
  GlobeIcon,
  LayersIcon,
  LockIcon,
  ReportIcon,
  ZapIcon,
} from "./icons";
import type { ReactNode } from "react";

const FEATURES: Array<{
  icon: ReactNode;
  title: string;
  description: string;
}> = [
  {
    icon: <GlobeIcon className="h-5 w-5" />,
    title: "Uptime monitoring",
    description:
      "SiteGuard checks each site once a day on the Free setup and records every result — status code, response time, and a running uptime percentage you can actually show a client.",
  },
  {
    icon: <LockIcon className="h-5 w-5" />,
    title: "SSL expiry alerts",
    description:
      "Certificates are checked on every visit and you are warned well before they expire — starting 14 days out — so an expired certificate never takes a client site offline.",
  },
  {
    icon: <ZapIcon className="h-5 w-5" />,
    title: "Incident timeline",
    description:
      "When a site goes down, an incident opens automatically with its start time, cause, and duration. When it recovers, the timeline closes itself — no manual bookkeeping.",
  },
  {
    icon: <BellIcon className="h-5 w-5" />,
    title: "Alerts that reach you",
    description:
      "Down and recovered events land in your notification feed the moment they happen, with the site, the time, and the reason — no digging through logs to find out what broke.",
  },
  {
    icon: <ReportIcon className="h-5 w-5" />,
    title: "Client-ready reports",
    description:
      "Uptime history, incident counts, and response times per site, ready to share. Show clients the work you do keeping their site online — with numbers, not promises.",
  },
  {
    icon: <LayersIcon className="h-5 w-5" />,
    title: "Multi-site dashboard",
    description:
      "One view for every site you look after — your own and your clients'. Filter by status, spot the one site that needs attention, and ignore the rest.",
  },
];

export function Features() {
  return (
    <Section id="features">
      <SectionHeading
        eyebrow="Features"
        title="Everything you need to keep client sites online"
        description="No noise, no twenty-tab monitoring stack. The checks that matter, the alerts that matter, and a record you can stand behind."
      />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card
            key={feature.title}
            className="group p-6 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:hover:border-brand-500/40"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white dark:bg-indigo-500/10 dark:text-indigo-300 dark:group-hover:bg-brand-500 dark:group-hover:text-white">
              {feature.icon}
            </span>
            <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {feature.description}
            </p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
