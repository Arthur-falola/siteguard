"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export default function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the call fails, drop the local session view.
    } finally {
      // Hard navigation, not router.push(): a soft navigation can leave
      // the dashboard layout in the client router cache, and signing
      // back in restores this button with its stale "Logging out…"
      // state. A full reload drops that cached state entirely.
      setPending(false);
      window.location.assign("/login");
    }
  }

  return (
    <Button type="button" onClick={() => void onLogout()} disabled={pending}>
      {pending ? "Logging out…" : "Log out"}
    </Button>
  );
}
