"use client";

import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StandbyAnalysis } from "@/lib/hooks/useStandbyAnalysis";

const tooltipStyle = {
  backgroundColor: "rgba(30,30,30,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  fontSize: "12px",
  backdropFilter: "blur(20px)",
  color: "rgba(255,255,255,0.9)",
};

interface StandbyCardProps {
  data: StandbyAnalysis;
}

function formatW(w: number): string {
  if (w >= 1000) return `${(w / 1000).toFixed(2)} kW`;
  return `${Math.round(w)} W`;
}

export function StandbyCard({ data }: StandbyCardProps) {
  const trendIcon = data.trendDelta > 5 ? ArrowUpRight : data.trendDelta < -5 ? ArrowDownRight : Minus;
  const trendColor = data.trendDelta > 5 ? "text-rose-400" : data.trendDelta < -5 ? "text-emerald-400" : "text-muted-foreground";
  const Trend = trendIcon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Grundlast (Standby)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.loading ? (
          <div className="flex h-[120px] items-center justify-center">
            <div className="h-5 w-32 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr] md:items-center">
            <div className="space-y-1">
              <div className="text-3xl font-semibold tabular-nums">{formatW(data.median)}</div>
              <div className="text-xs text-muted-foreground">Median pro Tag</div>
              {data.points.length >= 4 && (
                <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                  <Trend className="h-3.5 w-3.5" />
                  <span className="tabular-nums">
                    {data.trendDelta > 0 ? "+" : ""}{Math.round(data.trendDelta)} W
                  </span>
                  <span className="text-muted-foreground/70">Trend</span>
                </div>
              )}
            </div>
            <div className="h-[100px] min-w-0">
              {data.points.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.points} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [`${formatW(Number(value))}`, "Grundlast"]}
                      labelFormatter={(label) => label}
                    />
                    <Line
                      type="monotone"
                      dataKey="watts"
                      stroke="#22d3ee"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Keine Daten
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
