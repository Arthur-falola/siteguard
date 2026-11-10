/**
 * Shared formatting helpers (Agent A owns this file).
 * Pure functions only — no imports, no side effects.
 */

/** Join class names, skipping falsy values (clsx-style). */
export function cn(
  ...inputs: Array<string | false | null | undefined>
): string {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Format a duration in seconds as a compact human string.
 * 45 -> "45s", 90 -> "1m 30s", 3661 -> "1h 1m", 90061 -> "1d 1h 1m".
 */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (minutes < 60) {
    return remSeconds === 0 ? `${minutes}m` : `${minutes}m ${remSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) {
    return remMinutes === 0 ? `${hours}h` : `${hours}h ${remMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours === 0 ? `${days}d` : `${days}d ${remHours}h`;
}

/**
 * Format a date as a relative time string ("just now", "5m ago",
 * "2h ago", "3d ago"). Accepts a Date, ISO string, or timestamp.
 * Dates more than 30 days away fall back to a short locale date.
 */
export function formatRelativeTime(
  input: Date | string | number,
  now: Date = new Date(),
): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const diffMs = now.getTime() - date.getTime();
  const absMs = Math.abs(diffMs);
  const suffix = diffMs >= 0 ? "ago" : "from now";

  if (absMs < 45_000) return "just now";

  const minutes = Math.round(absMs / 60_000);
  if (minutes < 60) return `${minutes}m ${suffix}`;

  const hours = Math.round(absMs / 3_600_000);
  if (hours < 24) return `${hours}h ${suffix}`;

  const days = Math.round(absMs / 86_400_000);
  if (days <= 30) return `${days}d ${suffix}`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export type UptimeCheck = { ok: boolean };

/**
 * Percentage of checks that were up, rounded to one decimal.
 * Returns 100 when there are no checks yet (nothing has failed).
 */
export function uptimePct(checks: UptimeCheck[]): number {
  if (checks.length === 0) return 100;
  const up = checks.filter((c) => c.ok).length;
  return Math.round((up / checks.length) * 1000) / 10;
}
