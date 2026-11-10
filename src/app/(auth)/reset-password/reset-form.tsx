"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";

export default function ResetPasswordForm({
  token,
}: {
  token: string | undefined;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Reset failed. The link may have expired.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Choose a new password
        </h1>
        {!token ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            This reset link is invalid or missing its token. Request a new
            reset link from the{" "}
            <Link
              href="/forgot-password"
              className="font-medium text-indigo-600 underline dark:text-indigo-400"
            >
              forgot password
            </Link>{" "}
            page.
          </p>
        ) : done ? (
          <div className="mt-4">
            <p
              className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
              role="status"
            >
              Your password has been reset.
            </p>
            <p className="mt-4 text-sm">
              <Link
                href="/login"
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Log in with your new password
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                At least 8 characters.
              </p>
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error ? (
              <p
                className="text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Resetting…" : "Reset password"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
