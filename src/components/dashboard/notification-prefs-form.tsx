"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

const STORAGE_KEY = "siteguard-notification-prefs";

interface Prefs {
  notifyDown: boolean;
  notifyRecovered: boolean;
  notifySsl: boolean;
}

const DEFAULT_PREFS: Prefs = {
  notifyDown: true,
  notifyRecovered: true,
  notifySsl: true,
};

/** Notification preferences are stored in this browser only.
 *  The users table has no notification-preferences column, so there is
 *  nowhere server-side to persist them (see Settings page copy). */
export default function NotificationPrefsForm() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) });
    } catch {
      // Keep defaults if stored prefs are unreadable.
    }
  }, []);

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch {
      // Storage unavailable (e.g. private mode) — preferences are not saved.
    }
  }

  const row = (key: keyof Prefs, label: string, desc: string) => (
    <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <input
        type="checkbox"
        checked={prefs[key]}
        onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
        className="mt-1"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-sm text-slate-500 dark:text-slate-400">
          {desc}
        </span>
      </span>
    </label>
  );

  return (
    <div className="space-y-3">
      {row("notifyDown", "Site down", "Notify me when a monitored site goes down.")}
      {row(
        "notifyRecovered",
        "Site recovered",
        "Notify me when a down site comes back up.",
      )}
      {row(
        "notifySsl",
        "SSL expiring soon",
        "Notify me when a site's SSL certificate expires within 14 days.",
      )}
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save}>
          Save preferences
        </Button>
        {saved ? (
          <span className="text-sm text-green-700 dark:text-green-400" role="status">
            Saved on this device.
          </span>
        ) : null}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Preferences are stored only in this browser. They are not saved to
        your account because the users table has no notification-preferences
        column yet.
      </p>
    </div>
  );
}
