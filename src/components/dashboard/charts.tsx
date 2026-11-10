"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ResponseTimePoint {
  label: string;
  ms: number | null;
}

/** Average response-time line chart. Renders an honest empty state when
 *  there are no checks yet — never invented data. */
export default function ResponseTimeChart({
  data,
}: {
  data: ResponseTimePoint[];
}) {
  const hasData = data.some((d) => d.ms != null);
  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No response-time data yet — checks will appear here once monitoring
        runs.
      </div>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            unit=" ms"
            domain={[0, "auto"]}
            width={64}
          />
          <Tooltip formatter={(value) => [`${value} ms`, "Response time"]} />
          <Line
            type="monotone"
            dataKey="ms"
            name="Response time"
            stroke="#4f46e5"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
