"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { MenuIcon, ShieldCheckIcon, XIcon } from "./icons";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <a href="/" className={cn("flex items-center gap-2", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm dark:bg-brand-500">
        <ShieldCheckIcon className="h-5 w-5" />
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
        SiteGuard
      </span>
    </a>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-ink-950/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav
          className="flex h-16 items-center justify-between gap-4"
          aria-label="Main navigation"
        >
          <Logo />

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <Button variant="ghost" href="/login">
              Login
            </Button>
            <Button variant="outline" href="/register">
              Register
            </Button>
            <Button href="/register">Start Monitoring</Button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              {open ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {open ? (
          <div className="border-t border-slate-200 py-4 md:hidden dark:border-slate-800">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button variant="outline" href="/login" className="w-full">
                  Login
                </Button>
                <Button href="/register" className="w-full">
                  Start Monitoring
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
