"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHeatmapData } from "@/lib/hooks/useHeatmapData";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatW(w: number): string {
  if (w >= 1000) return `${(w / 1000).toFixed(1)} kW`;
  return `${Math.round(w)} W`;
}

function colorForValue(value: number, min: number, max: number): string {
  if (max <= min) return "rgba(34, 211, 238, 0.06)";
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  // cyan ramp 0.06 → 0.85 alpha
  const alpha = 0.06 + t * 0.79;
  return `rgba(34, 211, 238, ${alpha.toFixed(3)})`;
}

export function HeatmapCard() {
  const { bins, min, max, loading } = useHeatmapData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Verbrauchsmuster (Wochentag × Stunde, letzte 30 Tage)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[220px] items-center justify-center">
            <div className="h-5 w-32 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex pl-7">
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="flex-1 min-w-[14px] text-center text-[8px] tabular-nums text-muted-foreground/50"
                    >
                      {h % 3 === 0 ? h : ""}
                    </div>
                  ))}
                </div>
                {bins.map((row, w) => (
                  <div key={w} className="flex items-center gap-1">
                    <div className="w-6 text-[10px] font-medium tabular-nums text-muted-foreground/70">
                      {WEEKDAYS[w]}
                    </div>
                    <div className="flex flex-1 gap-[2px]">
                      {row.map((value, h) => (
                        <div
                          key={h}
                          title={`${WEEKDAYS[w]} ${h}:00 — ${formatW(value)}`}
                          className="flex-1 min-w-[14px] aspect-square rounded-[3px] transition-colors"
                          style={{ backgroundColor: colorForValue(value, min, max) }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground/60">
              <span>{formatW(min)} (min)</span>
              <div className="flex h-2 flex-1 mx-3 rounded-full overflow-hidden" style={{
                background: "linear-gradient(90deg, rgba(34,211,238,0.06), rgba(34,211,238,0.85))"
              }} />
              <span>{formatW(max)} (max)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
