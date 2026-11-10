import ResetPasswordForm from "./reset-form";

// The reset token comes from searchParams, which is request-time data.
// This page cannot be prerendered; allow blocking per-request rendering
// (Next 16 Cache Components validation).
export const instant = false;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  // The token is passed to the form and only ever sent back to the
  // /api/auth/reset-password endpoint — it is never displayed on screen.
  return <ResetPasswordForm token={token} />;
}
