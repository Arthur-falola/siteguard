import { isDown, isUp } from "./format";

const STYLES: Record<string, string> = {
  up: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  down: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  unknown:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  paused:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

const DOT: Record<string, string> = {
  up: "bg-green-500",
  down: "bg-red-500",
  unknown: "bg-slate-400",
  paused: "bg-amber-500",
};

const LABELS: Record<string, string> = {
  up: "Operational",
  down: "Down",
  unknown: "Unknown",
  paused: "Paused",
};

export function statusKey(status: string): "up" | "down" | "unknown" | "paused" {
  const s = status.toLowerCase();
  if (isUp(s)) return "up";
  if (isDown(s)) return "down";
  if (s === "paused") return "paused";
  return "unknown";
}

export default function StatusBadge({ status }: { status: string }) {
  const key = statusKey(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[key]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[key]}`} />
      {LABELS[key] ?? status}
    </span>
  );
}
