"use client";

import { Monitor, Sofa, Bath, BedDouble, TreePine, Zap, WashingMachine, Utensils, Router } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeviceEnergyHistory } from "@/lib/hooks/useDeviceEnergyHistory";

const roomIcons: Record<string, typeof Monitor> = {
  monitor: Monitor,
  sofa: Sofa,
  bath: Bath,
  bed: BedDouble,
  tree: TreePine,
  "washing-machine": WashingMachine,
  utensils: Utensils,
  router: Router,
};

interface RoomHistoryCardProps {
  data: DeviceEnergyHistory;
  periodLabel: string;
}

function formatKWh(kWh: number): string {
  if (kWh >= 100) return `${kWh.toFixed(0)} kWh`;
  if (kWh >= 10) return `${kWh.toFixed(1)} kWh`;
  return `${kWh.toFixed(2)} kWh`;
}

export function RoomHistoryCard({ data, periodLabel }: RoomHistoryCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-0.5">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Verbrauch pro Raum
        </CardTitle>
        <p className="text-[10px] text-muted-foreground/60">{periodLabel}</p>
      </CardHeader>
      <CardContent>
        {data.loading ? (
          <div className="flex h-[280px] items-center justify-center">
            <div className="h-5 w-32 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ) : data.rooms.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            Keine Daten verfügbar
          </div>
        ) : (
          <div className="space-y-3">
            {data.rooms.map((room) => {
              const Icon = roomIcons[room.icon] || Zap;
              return (
                <div key={room.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${room.color}20` }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: room.color }} />
                      </div>
                      <span className="text-sm font-medium">{room.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums" style={{ color: room.color }}>
                        {formatKWh(room.kWh)}
                      </div>
                      <div className="text-[10px] text-muted-foreground/60">
                        {(room.share * 100).toFixed(0)} %
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${room.share * 100}%`,
                        backgroundColor: room.color,
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
