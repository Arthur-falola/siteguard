"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";

const HONEST_MESSAGE =
  "If an account exists, a reset link was requested. Email delivery is not configured yet — contact support.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data: { error?: string; sent?: boolean } = await res.json().catch(
        () => ({}),
      );
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      // The API reports whether an email was actually sent. Never claim
      // delivery when it was not.
      setEmailSent(typeof data.sent === "boolean" ? data.sent : null);
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
          Reset your password
        </h1>
        {done ? (
          <div className="mt-4">
            <p
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              role="status"
            >
              {emailSent === true
                ? "If an account exists for that email, a reset link has been sent. Check your inbox."
                : HONEST_MESSAGE}
            </p>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              <Link
                href="/login"
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Back to log in
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Enter your account email and we will send you a password reset
              link.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
                {pending ? "Requesting…" : "Request reset link"}
              </Button>
            </form>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              <Link
                href="/login"
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Back to log in
              </Link>
            </p>
          </>
        )}
      </Card>
    </main>
  );
}
