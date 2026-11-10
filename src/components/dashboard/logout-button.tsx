"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the call fails, drop the local session view.
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <Button type="button" onClick={() => void onLogout()} disabled={pending}>
      {pending ? "Logging out…" : "Log out"}
    </Button>
  );
}
