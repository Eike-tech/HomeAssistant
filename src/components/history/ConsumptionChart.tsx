"use client";

import {
  BarChart,
  Bar,
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

interface ConsumptionChartProps {
  data: ChartPoint[];
  loading: boolean;
}

export function ConsumptionChart({ data, loading }: ConsumptionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Verbrauch
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[280px] items-center justify-center">
            <div className="h-5 w-32 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
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
                unit=" kWh"
                width={55}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${Number(value).toFixed(1)} kWh`, "Verbrauch"]}
              />
              <Bar
                dataKey="value"
                fill="#22d3ee"
                fillOpacity={0.7}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
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
