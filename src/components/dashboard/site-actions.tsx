"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button, Input, Label } from "@/components/ui";
import type { WebsiteRow } from "./types";

const editSiteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  check_interval_minutes: z
    .number()
    .int()
    .min(5, "Check interval must be at least 5 minutes")
    .max(1440, "Check interval must be at most 1440 minutes"),
  is_active: z.boolean(),
});

export default function SiteActions({ site }: { site: WebsiteRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(site.name);
  const [interval, setInterval] = useState(String(site.check_interval_minutes));
  const [isActive, setIsActive] = useState(site.is_active);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = editSiteSchema.safeParse({
      name,
      check_interval_minutes: Number(interval),
      is_active: isActive,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save changes.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (
      !window.confirm(
        `Delete "${site.name}"? Its checks and incidents will be deleted too. This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete the website.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button type="button" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cancel" : "Edit"}
        </Button>
        <Button type="button" onClick={() => void onDelete()} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete"}
        </Button>
      </div>
      {editing ? (
        <form
          onSubmit={onSave}
          className="mt-1 flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
        >
          <div>
            <Label htmlFor={`edit-name-${site.id}`}>Name</Label>
            <Input
              id={`edit-name-${site.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div>
            <Label htmlFor={`edit-interval-${site.id}`}>
              Check interval (minutes)
            </Label>
            <Input
              id={`edit-interval-${site.id}`}
              type="number"
              min={5}
              max={1440}
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Monitoring active
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
