"use client";

import { useState } from "react";
import { Section, SectionHeading } from "./section";
import { ChevronDownIcon } from "./icons";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "How often does SiteGuard check my websites?",
    a: "On the Free/Hobby setup, every site is checked once a day. That is the honest limit of the current setup — we do not claim 1-minute or 5-minute monitoring. Daily checks still catch outages, expired certificates, and slow responses well before most clients notice, and the history builds up day by day.",
  },
  {
    q: "What happens when a site goes down?",
    a: "SiteGuard opens an incident automatically, recording when it started and why the check failed (for example, a timeout or an HTTP error). You get a notification with those details. When the site recovers, the incident closes itself with its total duration — so you have a complete record to share with the client.",
  },
  {
    q: "Does SiteGuard check SSL certificates?",
    a: "Yes. For HTTPS sites, every check reads the certificate's expiry date. You are warned when a certificate has 14 days or fewer left, giving you time to renew before browsers start showing warnings to visitors.",
  },
  {
    q: "How many sites can I monitor?",
    a: "It depends on your plan: Free covers 1 site with 7 days of history, Starter covers 5 sites with 30 days, and Pro covers 20 sites with 90 days. The limit is enforced when you add a site, so you always know where you stand.",
  },
  {
    q: "Do I need a credit card to start?",
    a: "No. The Free plan needs no card at all, and no payments are collected while launch pricing is still being confirmed. Create an account, add your site, and monitoring starts.",
  },
  {
    q: "Can I monitor my clients' websites?",
    a: "Yes — that is exactly what SiteGuard is for. Add each client site to your dashboard, watch them all in one place, and use the uptime history and incident timelines to show clients the work you do keeping their sites online.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Section id="faq">
      <SectionHeading
        eyebrow="FAQ"
        title="Questions, answered plainly"
        description="If it is not covered here, the short answer is: we would rather tell you the limit than oversell the product."
      />
      <div className="mx-auto mt-12 max-w-3xl space-y-3">
        {FAQS.map((faq, i) => {
          const open = openIndex === i;
          return (
            <div
              key={faq.q}
              className={cn(
                "rounded-2xl border bg-white transition-colors dark:bg-slate-900",
                open
                  ? "border-brand-300 dark:border-brand-500/40"
                  : "border-slate-200 dark:border-slate-800",
              )}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-slate-900 sm:text-base dark:text-white">
                  {faq.q}
                </span>
                <ChevronDownIcon
                  className={cn(
                    "h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300",
                    open && "rotate-180 text-brand-600 dark:text-brand-400",
                  )}
                />
              </button>
              {open ? (
                <p className="animate-fade-in px-5 pb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {faq.a}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
