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
import type { ChartPoint } from "@/lib/hooks/useHistoryData";

const tooltipStyle = {
  backgroundColor: "rgba(30,30,30,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  fontSize: "12px",
  backdropFilter: "blur(20px)",
  color: "rgba(255,255,255,0.9)",
};

interface SpotPriceHistoryChartProps {
  data: ChartPoint[];
  loading: boolean;
}

export function SpotPriceHistoryChart({ data, loading }: SpotPriceHistoryChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Strompreis-Verlauf
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
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                axisLine={false}
                tickLine={false}
                unit=" ct"
                width={45}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${Number(value).toFixed(1)} ct/kWh`, "Preis"]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#fbbf24"
                strokeWidth={1.5}
                dot={{ r: 2, fill: "#fbbf24", strokeWidth: 0 }}
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
