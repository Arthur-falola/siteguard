"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button, Input, Label } from "@/components/ui";

const addSiteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .url("Enter a valid URL starting with http:// or https://"),
});

export default function AddSiteForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = addSiteSchema.safeParse({ name, url });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not add the website.");
        return;
      }
      setName("");
      setUrl("");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label htmlFor="site-name">Name</Label>
        <Input
          id="site-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My website"
          maxLength={100}
          required
        />
      </div>
      <div className="flex-[2]">
        <Label htmlFor="site-url">URL</Label>
        <Input
          id="site-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add website"}
      </Button>
      {error ? (
        <p className="text-sm text-red-600 sm:w-full dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
