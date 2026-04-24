"use client";

import { Monitor, Sofa, Bath, BedDouble, TreePine, Car, Zap, Home, TrendingUp, TrendingDown, Minus, Snowflake, WashingMachine, Utensils, Router } from "lucide-react";
import { useEnergyFlow, type RoomNode } from "@/lib/hooks/useEnergyFlow";
import { useEntityNumericState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";

const roomIcons: Record<string, typeof Monitor> = {
  monitor: Monitor,
  sofa: Sofa,
  bath: Bath,
  bed: BedDouble,
  tree: TreePine,
  car: Car,
  snowflake: Snowflake,
  "washing-machine": WashingMachine,
  utensils: Utensils,
  router: Router,
};

function formatW(watts: number): string {
  if (watts >= 1000) return `${(watts / 1000).toFixed(1)} kW`;
  return `${Math.round(watts)} W`;
}

function RoomCard({ room }: { room: RoomNode }) {
  const Icon = roomIcons[room.icon] || Zap;
  const share = room.totalPower; // used for bar width

  return (
    <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.04] p-3 transition-all hover:bg-white/[0.07]">
      {/* Animated flow indicator */}
      <div className="absolute left-0 top-0 h-full overflow-hidden rounded-2xl">
        <div
          className="h-full rounded-2xl opacity-[0.08]"
          style={{
            width: `${Math.min(100, Math.max(8, (share / 200) * 100))}%`,
            backgroundColor: room.color,
            transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>

      {/* Flow dots animation */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
        <div className="flex gap-1 pl-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1 w-1 rounded-full"
              style={{
                backgroundColor: room.color,
                opacity: 0.6,
                animation: `flow-dot 1.2s ease-in-out ${i * 0.3}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative flex items-center gap-3">
        {/* Icon */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${room.color}20` }}
        >
          <Icon className="h-4 w-4" style={{ color: room.color }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{room.label}</span>
            <span className="text-sm font-semibold tabular-nums" style={{ color: room.color }}>
              {formatW(room.totalPower)}
            </span>
          </div>
          {/* Device breakdown */}
          {room.devices.length > 1 && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {room.devices.map((d) => (
                <span key={d.id} className="text-[10px] text-muted-foreground tabular-nums">
                  {d.label} {formatW(d.power)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendIndicator({ current, average }: { current: number; average: number | null }) {
  if (average === null || average <= 0) return null;
  const ratio = current / average;
  if (ratio > 1.3) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-red-400">
        <TrendingUp className="h-3 w-3" />
        <span>+{Math.round((ratio - 1) * 100)}%</span>
      </div>
    );
  }
  if (ratio < 0.7) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-green-400">
        <TrendingDown className="h-3 w-3" />
        <span>{Math.round((ratio - 1) * 100)}%</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <Minus className="h-3 w-3" />
      <span>normal</span>
    </div>
  );
}

export function EnergyFlowDiagram() {
  const { rooms, totalPower, sonstige } = useEnergyFlow();
  const avgPower = useEntityNumericState(ENTITIES.energy.avgPower);

  if (totalPower <= 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <span className="text-sm">Kein Verbrauch</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Grid source indicator */}
      <div className="flex items-center gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] px-4 py-3">
        <div className="relative flex items-center">
          <Home className="h-5 w-5 text-sky-400" />
          <div className="ml-2 flex gap-0.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-sky-400"
                style={{
                  animation: `flow-dot 1s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Stromnetz</span>
          <TrendIndicator current={totalPower} average={avgPower} />
        </div>
        <span className="text-lg font-semibold tabular-nums text-sky-400">{formatW(totalPower)}</span>
      </div>

      {/* Room grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}

        {/* Sonstige */}
        {sonstige >= 1 && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                <Zap className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-1 items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Sonstige</span>
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                  {formatW(sonstige)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
