"use client";

import { useState } from "react";
import { Badge, Button, Card, StatCard, StatusDot } from "@/components/ui";
import type { SiteStatus } from "@/components/ui";
import { cn, formatDuration, formatRelativeTime } from "@/lib/utils";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  GlobeIcon,
  LockIcon,
  ShieldCheckIcon,
} from "./icons";

/* ------------------------------------------------------------------ */
/* Sample data — illustrative only, never presented as real monitoring */
/* ------------------------------------------------------------------ */

type PreviewSite = {
  name: string;
  url: string;
  status: SiteStatus;
  responseMs: number | null;
  sslDays: number;
  uptime: string;
};

const PREVIEW_SITES: PreviewSite[] = [
  {
    name: "Acme Studio",
    url: "acme-studio.com",
    status: "up",
    responseMs: 212,
    sslDays: 87,
    uptime: "99.98%",
  },
  {
    name: "Bloom Boutique",
    url: "bloomboutique.shop",
    status: "up",
    responseMs: 341,
    sslDays: 42,
    uptime: "99.95%",
  },
  {
    name: "Northwind Legal",
    url: "northwind-legal.com",
    status: "down",
    responseMs: null,
    sslDays: 12,
    uptime: "98.71%",
  },
];

/** 30 days of sample uptime: 1 = up, 0 = down. */
const UPTIME_DAYS: number[] = [
  1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1,
];

const RECENT_CHECKS = [
  { site: "Acme Studio", status: "up" as SiteStatus, code: 200, ms: 212, at: "2 min ago" },
  { site: "Bloom Boutique", status: "up" as SiteStatus, code: 200, ms: 341, at: "9 min ago" },
  { site: "Northwind Legal", status: "down" as SiteStatus, code: null, ms: null, at: "14 min ago" },
  { site: "Acme Studio", status: "up" as SiteStatus, code: 200, ms: 198, at: "1 h ago" },
];

type PreviewTab = "overview" | "websites" | "incidents";

const TABS: Array<{ id: PreviewTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "websites", label: "Websites" },
  { id: "incidents", label: "Incidents" },
];

/* ------------------------------------------------------------------ */
/* Dashboard preview                                                   */
/* ------------------------------------------------------------------ */

function DashboardPreview() {
  const [tab, setTab] = useState<PreviewTab>("overview");

  return (
    <Card className="overflow-hidden text-left shadow-xl shadow-slate-900/5 dark:shadow-black/40">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <span className="ml-3 hidden items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-500 sm:flex dark:bg-slate-800 dark:text-slate-400">
          <LockIcon className="h-3 w-3" />
          app.siteguard.example/overview
        </span>
        <span className="ml-auto">
          <Badge variant="warning">Illustrative preview — sample data</Badge>
        </span>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 border-b border-slate-100 px-3 pt-3 dark:border-slate-800"
        role="tablist"
        aria-label="Dashboard preview"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-indigo-50 text-brand-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200",
            )}
          >
            {t.label}
            {t.id === "incidents" ? (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                1
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="bg-slate-50/60 p-4 sm:p-5 dark:bg-ink-900/40">
        {tab === "overview" ? (
          <div className="animate-fade-in space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Avg. uptime"
                value="99.54%"
                sub="Last 30 days"
                icon={<GlobeIcon className="h-4 w-4" />}
              />
              <StatCard
                label="Sites monitored"
                value="3"
                sub="1 plan · Free"
                icon={<ShieldCheckIcon className="h-4 w-4" />}
              />
              <StatCard
                label="Open incidents"
                value="1"
                sub="Northwind Legal is down"
                icon={<AlertIcon className="h-4 w-4" />}
              />
              <StatCard
                label="SSL expiring soon"
                value="1"
                sub="12 days remaining"
                icon={<LockIcon className="h-4 w-4" />}
              />
            </div>

            <Card className="p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Uptime — last 30 days
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Acme Studio · 99.98%
                </span>
              </div>
              <div
                className="mt-4 flex h-16 items-end gap-1"
                role="img"
                aria-label="Sample uptime chart: 28 of the last 30 days up, 2 days with downtime"
              >
                {UPTIME_DAYS.map((day, i) => (
                  <div
                    key={i}
                    title={day === 1 ? `Day ${i + 1}: up` : `Day ${i + 1}: downtime`}
                    className={cn(
                      "flex-1 rounded-sm transition-all hover:opacity-70",
                      day === 1
                        ? "h-full bg-emerald-500/80"
                        : "h-1/3 bg-red-500/80",
                    )}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </Card>

            <Card className="divide-y divide-slate-100 dark:divide-slate-800">
              {RECENT_CHECKS.map((check, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <StatusDot status={check.status} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {check.site}
                  </span>
                  <span className="hidden text-xs text-slate-500 tabular-nums sm:inline dark:text-slate-400">
                    {check.code ? `HTTP ${check.code}` : "No response"}
                    {check.ms ? ` · ${check.ms} ms` : ""}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {check.at}
                  </span>
                </div>
              ))}
            </Card>
          </div>
        ) : null}

        {tab === "websites" ? (
          <div className="animate-fade-in overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-500 uppercase dark:border-slate-800 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Website</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Response</th>
                  <th className="px-4 py-3 font-medium">SSL</th>
                  <th className="px-4 py-3 font-medium">Uptime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {PREVIEW_SITES.map((site) => (
                  <tr key={site.url}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {site.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {site.url}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusDot status={site.status} withLabel />
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums dark:text-slate-300">
                      {site.responseMs ? `${site.responseMs} ms` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={site.sslDays <= 14 ? "warning" : "success"}>
                        {site.sslDays} days left
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 tabular-nums dark:text-slate-200">
                      {site.uptime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "incidents" ? (
          <div className="animate-fade-in space-y-3">
            <Card className="border-red-200 bg-red-50/50 p-4 dark:border-red-500/20 dark:bg-red-500/5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                    <AlertIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Northwind Legal is down
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                      No response from northwind-legal.com · HTTP timeout after
                      10 s
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Started {formatRelativeTime(Date.now() - 14 * 60_000)} ·
                      ongoing for {formatDuration(14 * 60)}
                    </p>
                  </div>
                </div>
                <Badge variant="danger">Open</Badge>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Bloom Boutique recovered
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                      Back online after a short outage · HTTP 200 · 341 ms
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Resolved {formatRelativeTime(Date.now() - 26 * 3_600_000)} ·
                      lasted {formatDuration(11 * 60)}
                    </p>
                  </div>
                </div>
                <Badge variant="success">Resolved</Badge>
              </div>
            </Card>

            <p className="flex items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
              <ClockIcon className="h-3.5 w-3.5" />
              Every incident keeps its full timeline — start, cause, and
              recovery — so you can show clients exactly what happened.
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export function Hero() {
  return (
    <div className="relative overflow-hidden">
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(79,70,229,0.14),transparent_70%)] dark:bg-[radial-gradient(60%_100%_at_50%_0%,rgba(79,70,229,0.25),transparent_70%)]"
      />
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="brand" className="animate-fade-up px-3 py-1 text-xs">
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            Uptime · SSL · Incidents — one calm dashboard
          </Badge>
          <h1 className="animate-fade-up mt-6 text-4xl font-bold tracking-tight text-slate-900 text-balance sm:text-5xl lg:text-6xl dark:text-white [animation-delay:80ms]">
            The Website Health Assistant for Freelancers and Agencies
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 text-pretty sm:text-xl dark:text-slate-400 [animation-delay:160ms]">
            SiteGuard watches the websites you look after — uptime, SSL
            certificates, and incidents — and tells you the moment something
            breaks, so your clients never have to.
          </p>
          <div className="animate-fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row [animation-delay:240ms]">
            <Button href="/register" size="lg">
              Start Monitoring
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
            <Button href="#features" variant="outline" size="lg">
              Explore Features
            </Button>
          </div>
          <p className="animate-fade-up mt-4 text-sm text-slate-500 dark:text-slate-400 [animation-delay:320ms]">
            Free plan includes 1 site · No card required · Checks run once a
            day on the Free setup
          </p>
        </div>

        <div className="animate-fade-up mx-auto mt-14 max-w-5xl [animation-delay:400ms]">
          <DashboardPreview />
          <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
            Illustrative preview — sample data. Your dashboard fills in with
            real results once you add a site.
          </p>
        </div>
      </div>
    </div>
  );
}
