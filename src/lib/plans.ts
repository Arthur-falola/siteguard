export interface PlanLimits {
  sites: number;
  historyDays: number;
  label: string;
}

// Launch hypotheses — NO payments are taken. Free/Hobby monitoring runs
// once daily (see vercel.json); do not claim faster monitoring.
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { sites: 1, historyDays: 7, label: 'Free' },
  starter: { sites: 5, historyDays: 30, label: 'Starter' },
  pro: { sites: 20, historyDays: 90, label: 'Pro' },
};

export function canAddSite(plan: string, currentCount: number): boolean {
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  return currentCount < limits.sites;
}
