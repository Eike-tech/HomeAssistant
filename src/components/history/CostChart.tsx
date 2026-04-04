"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartPoint } from "@/lib/hooks/useHistoryData";

const tooltipStyle = {
  backgroundColor: "rgba(30,30,30,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  fontSize: "12px",
  backdropFilter: "blur(20px)",
  color: "rgba(255,255,255,0.9)",
};

interface CostChartProps {
  data: ChartPoint[];
  loading: boolean;
}

export function CostChart({ data, loading }: CostChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Kosten
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[280px] items-center justify-center">
            <div className="h-5 w-32 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                axisLine={false}
                tickLine={false}
                unit=" €"
                width={50}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${Number(value).toFixed(2)} €`, "Kosten"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#fbbf24"
                strokeWidth={2}
                fill="url(#costGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            Keine Daten verfügbar
          </div>
        )}
      </CardContent>
    </Card>
  );
}
