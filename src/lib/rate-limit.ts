// In-memory sliding-window rate limiter.
// NOTE: state lives in one server process only — it resets on restart and
// is not shared across instances. Good enough for the MVP's login/register
// and manual-check abuse guards; use a shared store (e.g. Redis/Upstash)
// before relying on it across a fleet.

const windows = new Map<string, number[]>();

/**
 * Record one hit for `key`. Returns true when the hit is within the limit
 * (allowed), false when the caller has exceeded `limit` hits in the last
 * `windowMs` milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (windows.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    windows.set(key, hits);
    return false;
  }
  hits.push(now);
  windows.set(key, hits);
  // Opportunistic cleanup so the map cannot grow without bound.
  if (windows.size > 5000) {
    for (const [k, timestamps] of windows) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] <= cutoff) {
        windows.delete(k);
      }
    }
  }
  return true;
}
