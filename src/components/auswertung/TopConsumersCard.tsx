"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeviceEnergyHistory } from "@/lib/hooks/useDeviceEnergyHistory";

interface TopConsumersCardProps {
  data: DeviceEnergyHistory;
  topN?: number;
}

function formatKWh(kWh: number): string {
  if (kWh >= 100) return `${kWh.toFixed(0)} kWh`;
  if (kWh >= 10) return `${kWh.toFixed(1)} kWh`;
  return `${kWh.toFixed(2)} kWh`;
}

export function TopConsumersCard({ data, topN = 8 }: TopConsumersCardProps) {
  const top = data.devices.filter((d) => d.kWh > 0).slice(0, topN);
  const max = top.length > 0 ? top[0].kWh : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Top-Verbraucher (Geräte)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.loading ? (
          <div className="flex h-[280px] items-center justify-center">
            <div className="h-5 w-32 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ) : top.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            Keine Daten verfügbar
          </div>
        ) : (
          <div className="space-y-2.5">
            {top.map((d) => {
              const widthPct = max > 0 ? (d.kWh / max) * 100 : 0;
              return (
                <div key={d.entityId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: d.roomColor }}
                      />
                      <span className="truncate text-foreground/90">{d.label}</span>
                      <span className="truncate text-muted-foreground/60">· {d.roomLabel}</span>
                    </div>
                    <span
                      className="tabular-nums text-foreground/80 ml-2 shrink-0"
                      title={d.source === "power" ? "Geschätzt aus Leistungsverlauf" : "Aus Energie-Zähler"}
                    >
                      {d.source === "power" ? "~" : ""}{formatKWh(d.kWh)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: d.roomColor,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
