"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LoadCurvePoint } from "@/lib/hooks/useHistoryData";

const tooltipStyle = {
  backgroundColor: "rgba(30,30,30,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  fontSize: "12px",
  backdropFilter: "blur(20px)",
  color: "rgba(255,255,255,0.9)",
};

interface LoadCurveChartProps {
  data: LoadCurvePoint[];
  loading: boolean;
}

export function LoadCurveChart({ data, loading }: LoadCurveChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Lastprofil (letzte 24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[280px] items-center justify-center">
            <div className="h-5 w-32 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(1, Math.floor(data.length / 12))}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                axisLine={false}
                tickLine={false}
                unit=" kW"
                width={50}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${Number(value).toFixed(2)} kW`, "Leistung"]}
              />
              <Line
                type="monotone"
                dataKey="power"
                stroke="#34d399"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
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
