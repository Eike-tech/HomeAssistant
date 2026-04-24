"use client";

import { Monitor, Sofa, Bath, BedDouble, TreePine, Zap, WashingMachine, Utensils, Router } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEnergyFlow, type RoomNode } from "@/lib/hooks/useEnergyFlow";

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

function formatW(watts: number): string {
  if (watts >= 1000) return `${(watts / 1000).toFixed(1)} kW`;
  return `${Math.round(watts)} W`;
}

function RoomSection({ room }: { room: RoomNode }) {
  const Icon = roomIcons[room.icon] || Zap;
  const isActive = room.totalPower >= 0.5;

  return (
    <div>
      <div className="flex items-center justify-between py-1.5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${room.color}20` }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: room.color }} />
          </div>
          <span className="text-sm font-medium">{room.label}</span>
        </div>
        <span
          className={`text-sm font-semibold tabular-nums ${isActive ? "" : "text-muted-foreground/60"}`}
          style={isActive ? { color: room.color } : undefined}
        >
          {isActive ? formatW(room.totalPower) : "—"}
        </span>
      </div>
      <div className="ml-[38px] space-y-1 border-l border-white/[0.06] pl-3 pb-1">
        {room.devices.map((d) => {
          const deviceActive = d.power >= 0.5;
          return (
            <div key={d.id} className="flex items-center justify-between">
              <span
                className={`text-xs ${deviceActive ? "text-muted-foreground" : "text-muted-foreground/50"}`}
              >
                {d.label}
              </span>
              <span
                className={`text-xs tabular-nums ${deviceActive ? "text-foreground/80" : "text-muted-foreground/40"}`}
              >
                {deviceActive ? formatW(d.power) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RoomBreakdownCard() {
  const { allRooms, sonstige } = useEnergyFlow();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Verbraucher nach Räumen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {allRooms.map((room) => (
          <RoomSection key={room.id} room={room} />
        ))}

        {sonstige >= 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06]">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Sonstige</span>
            </div>
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              {formatW(sonstige)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
