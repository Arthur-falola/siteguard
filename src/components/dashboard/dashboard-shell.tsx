"use client";

import Link from "next/link";
import { useState } from "react";
import type { SessionUser } from "./types";
import SidebarNav from "./sidebar";
import NotificationsBell from "./notifications-bell";
import LogoutButton from "./logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardShell({
  user,
  unreadCount,
  children,
}: {
  user: SessionUser;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <Link
          href="/app"
          className="px-5 pb-2 pt-5 text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400"
        >
          SiteGuard
        </Link>
        <p className="px-5 text-xs text-slate-500 dark:text-slate-400">
          Website monitoring
        </p>
        <SidebarNav />
        <div className="mt-auto px-5 py-4 text-xs text-slate-400 dark:text-slate-500">
          Monitoring runs once daily on the Free/Hobby setup.
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between px-5 pt-5">
              <span className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                SiteGuard
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 print:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-lg px-2 py-1 text-xl text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ☰
          </button>
          <Link
            href="/app"
            className="text-lg font-bold tracking-tight text-indigo-600 md:hidden dark:text-indigo-400"
          >
            SiteGuard
          </Link>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="max-w-44 truncate text-xs leading-tight text-slate-500 dark:text-slate-400">
                {user.email}
              </p>
            </div>
            <NotificationsBell initialUnread={unreadCount} />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
