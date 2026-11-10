// Transactional email via the Resend HTTP API.
// NEVER claim an email was sent when it was not: without RESEND_API_KEY
// this returns { sent: false } with an explicit reason, and callers must
// surface that honestly instead of pretending the email went out.
//
// Default sender is Resend's test sender (onboarding@resend.dev), which
// works without a verified domain but only delivers to the Resend account
// owner's address. To send from your own domain, set RESEND_FROM_EMAIL and
// verify that domain in the Resend dashboard first — Resend rejects mail
// from an unverified domain.

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ sent: boolean; reason: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      sent: false,
      reason: 'No email provider configured (set RESEND_API_KEY to enable email sending)',
    };
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'SiteGuard <onboarding@resend.dev>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      let detail = '';
      try {
        const data = (await res.json()) as { message?: string; error?: string };
        detail = data?.message ?? data?.error ?? '';
      } catch {
        // Non-JSON error body — keep the status as the reason.
      }
      return {
        sent: false,
        reason: `Resend API error (${res.status})${detail ? `: ${detail}` : ''}`,
      };
    }
    return { sent: true, reason: 'Email sent via Resend' };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : 'Failed to send email',
    };
  }
}
