"use client";

import { useEnergyFlow } from "@/lib/hooks/useEnergyFlow";

/** Abstract floor-plan coordinates (relative 0..1, x = left → right, y = top → bottom).
 *  Not architecturally accurate — just a stable spatial mental model. */
const ROOM_POSITIONS: Record<string, { x: number; y: number }> = {
  wohnzimmer:           { x: 0.30, y: 0.28 },
  buero:                { x: 0.70, y: 0.28 },
  schlafzimmer:         { x: 0.30, y: 0.55 },
  bad:                  { x: 0.55, y: 0.55 },
  kueche:               { x: 0.30, y: 0.82 },
  hauswirtschaftsraum:  { x: 0.65, y: 0.82 },
  garten:               { x: 0.92, y: 0.55 },
};

const IDLE_THRESHOLD_W = 1;

function dotSize(power: number, maxPower: number): number {
  if (power < IDLE_THRESHOLD_W) return 8;
  return 10 + 32 * Math.min(1, Math.sqrt(power / Math.max(maxPower, 50)));
}

export function RoomDots() {
  const flow = useEnergyFlow();
  const allRooms = flow.allRooms;
  const maxPower = allRooms.reduce((m, r) => Math.max(m, r.totalPower), 0);

  return (
    <section
      className="relative overflow-hidden"
      style={{
        padding: "var(--cockpit-pad-zone)",
        borderRadius: "var(--cockpit-radius-zone)",
        background: `
          radial-gradient(120% 100% at 50% 0%, var(--accent-live-glow), transparent 60%),
          var(--cockpit-canvas-soft)
        `,
        boxShadow: "inset 0 1px 0 0 var(--cockpit-edge-soft)",
        transition: "background var(--motion-slow) var(--ease-out)",
      }}
    >
      <div className="mb-3 flex items-center justify-between md:mb-4">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.08em]"
          style={{ color: "var(--cockpit-ink-dim)" }}
        >
          Räume
        </span>
        <span
          className="font-mono text-[11px] tabular-nums"
          style={{ color: "var(--cockpit-ink-dim)" }}
        >
          {allRooms.filter((r) => r.totalPower >= IDLE_THRESHOLD_W).length} aktiv
        </span>
      </div>

      {/* Desktop: abstract floor plan */}
      <div className="relative hidden h-[260px] w-full md:block">
        {allRooms.map((room) => {
          const pos = ROOM_POSITIONS[room.id] ?? { x: 0.5, y: 0.5 };
          const idle = room.totalPower < IDLE_THRESHOLD_W;
          const size = dotSize(room.totalPower, maxPower);
          return (
            <div
              key={room.id}
              className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
            >
              <span
                className="rounded-full"
                style={{
                  width: size,
                  height: size,
                  background: idle ? "var(--signal-idle)" : "var(--accent-live)",
                  boxShadow: idle ? "none" : "0 0 18px var(--accent-live-glow)",
                  transition: "width var(--motion-base) var(--ease-out), height var(--motion-base) var(--ease-out), background var(--motion-base) var(--ease-out), box-shadow var(--motion-base) var(--ease-out)",
                }}
              />
              <div className="mt-2.5 text-center">
                <div
                  className="text-[11px]"
                  style={{ color: idle ? "var(--cockpit-ink-faint)" : "var(--cockpit-ink)" }}
                >
                  {room.label}
                </div>
                {!idle && (
                  <div
                    className="font-mono text-[10px] tabular-nums"
                    style={{ color: "var(--cockpit-ink-dim)" }}
                  >
                    {Math.round(room.totalPower)} W
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: horizontal scroll list */}
      <div className="-mx-2 flex gap-3 overflow-x-auto pb-1 md:hidden">
        {allRooms.map((room) => {
          const idle = room.totalPower < IDLE_THRESHOLD_W;
          const size = dotSize(room.totalPower, maxPower);
          return (
            <div
              key={room.id}
              className="flex min-w-[72px] shrink-0 flex-col items-center gap-2 px-1"
            >
              <div className="flex h-12 w-12 items-center justify-center">
                <span
                  className="rounded-full"
                  style={{
                    width: size,
                    height: size,
                    background: idle ? "var(--signal-idle)" : "var(--accent-live)",
                    boxShadow: idle ? "none" : "0 0 14px var(--accent-live-glow)",
                    transition: "width var(--motion-base) var(--ease-out), background var(--motion-base) var(--ease-out)",
                  }}
                />
              </div>
              <div className="text-center">
                <div
                  className="truncate text-[10px] leading-tight"
                  style={{
                    maxWidth: 80,
                    color: idle ? "var(--cockpit-ink-faint)" : "var(--cockpit-ink)",
                  }}
                >
                  {room.label}
                </div>
                <div
                  className="mt-0.5 font-mono text-[9px] tabular-nums"
                  style={{ color: idle ? "var(--cockpit-ink-faint)" : "var(--cockpit-ink-dim)" }}
                >
                  {idle ? "—" : `${Math.round(room.totalPower)}W`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
