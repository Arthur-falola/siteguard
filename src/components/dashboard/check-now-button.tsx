"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export default function CheckNowButton({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function onCheck() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/check`, { method: "POST" });
      // Dedicated check route returns { ok, status, check: CheckResult }
      // on success and { ok: false, error } on failure.
      const data: {
        ok?: boolean;
        status?: string;
        error?: string;
        check?: {
          ok?: boolean;
          statusCode?: number | null;
          responseTimeMs?: number | null;
          error?: string | null;
        };
      } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsError(true);
        setMessage(data.error ?? "Check failed. Please try again.");
        return;
      }
      if (!data.check) {
        setIsError(true);
        setMessage("Check could not be verified — please reload and try again.");
        return;
      }
      setIsError(false);
      setMessage(
        data.check.ok
          ? `Check complete: HTTP ${data.check.statusCode ?? "—"} in ${data.check.responseTimeMs ?? "—"} ms. Site status is now ${data.status ?? "unknown"}.`
          : `Check complete: site is down.${data.check.error ? ` ${data.check.error}` : ""}`,
      );
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Check failed — network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={() => void onCheck()} disabled={pending}>
        {pending ? "Checking…" : "Check now"}
      </Button>
      {message ? (
        <p
          className={`mt-2 text-sm ${isError ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}
          role={isError ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
