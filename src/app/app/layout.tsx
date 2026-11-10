import { requireUser } from "@/lib/auth";
import { isDbConfigured, query } from "@/lib/db";
import DashboardShell from "@/components/dashboard/dashboard-shell";

// Dashboard pages read the session cookie and query the database per
// request, so they cannot be prerendered or navigated to instantly.
// Next 16 (Cache Components) validates that at build time; opting this
// segment out allows blocking, per-request rendering.
export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  let unread = 0;
  if (isDbConfigured()) {
    try {
      const rows = await query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND is_read = false",
        [user.id],
      );
      unread = Number(rows[0]?.count ?? 0);
    } catch {
      // Bell falls back to 0; the bell component re-fetches client-side.
      unread = 0;
    }
  }

  return (
    <DashboardShell user={user} unreadCount={unread}>
      {children}
    </DashboardShell>
  );
}
