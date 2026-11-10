import { Badge, Button, Card } from "@/components/ui";
import { Section, SectionHeading } from "./section";
import { CheckIcon } from "./icons";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  price: string;
  priceNote: string;
  description: string;
  sites: string;
  history: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    priceNote: "forever",
    description: "Try SiteGuard on your own site.",
    sites: "1 site",
    history: "7 days of history",
    features: [
      "1 monitored website",
      "Daily uptime checks",
      "SSL expiry alerts",
      "Incident timeline",
      "Email notifications",
    ],
    cta: "Start free",
  },
  {
    name: "Starter",
    price: "$9",
    priceNote: "per month",
    description: "For freelancers with a few client sites.",
    sites: "5 sites",
    history: "30 days of history",
    features: [
      "5 monitored websites",
      "Daily uptime checks",
      "SSL expiry alerts",
      "Incident timeline",
      "Email notifications",
      "Client-ready reports",
    ],
    cta: "Choose Starter",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$29",
    priceNote: "per month",
    description: "For agencies running a full portfolio.",
    sites: "20 sites",
    history: "90 days of history",
    features: [
      "20 monitored websites",
      "Daily uptime checks",
      "SSL expiry alerts",
      "Incident timeline",
      "Email notifications",
      "Client-ready reports",
      "Longest history retention",
    ],
    cta: "Choose Pro",
  },
];

export function Pricing() {
  return (
    <Section
      id="pricing"
      className="bg-slate-50 dark:bg-ink-900/60"
    >
      <SectionHeading
        eyebrow="Pricing"
        title="Simple pricing that grows with your client list"
        description="Start free with one site. Upgrade when you take on more clients — the monitoring stays the same, only the limits move."
      />
      <p className="mx-auto mt-6 flex max-w-xl justify-center">
        <Badge variant="warning" className="px-3 py-1 text-xs">
          Launch pricing — to be confirmed. No payments are taken yet.
        </Badge>
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              "relative flex flex-col p-6 sm:p-8",
              plan.highlighted &&
                "border-brand-500 ring-2 ring-brand-500/60 dark:border-brand-400 dark:ring-brand-400/40",
            )}
          >
            {plan.highlighted ? (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge variant="brand" className="px-3 py-1 shadow-sm">
                  Most popular
                </Badge>
              </span>
            ) : null}

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {plan.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {plan.description}
            </p>

            <p className="mt-5 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                {plan.price}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {plan.priceNote}
              </span>
            </p>
            {plan.name !== "Free" ? (
              <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                Launch pricing — to be confirmed
              </p>
            ) : null}

            <p className="mt-5 text-sm font-medium text-slate-700 dark:text-slate-300">
              {plan.sites} · {plan.history}
            </p>

            <ul className="mt-4 flex-1 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-brand-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              href="/register"
              variant={plan.highlighted ? "primary" : "outline"}
              size="lg"
              className="mt-8 w-full"
            >
              {plan.cta}
            </Button>
          </Card>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-500 dark:text-slate-400">
        All plans check sites once a day on the Free/Hobby setup. No card is
        required to create an account, and no payment is collected while
        launch pricing is still being confirmed.
      </p>
    </Section>
  );
}
