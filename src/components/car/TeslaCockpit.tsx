"use client";

import { Plug, Lock, Unlock, DoorOpen, Activity } from "lucide-react";
import { useEntityNumericState, useEntityState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";

const RING_SIZE = 200;
const RING_STROKE = 8;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Pill({
  icon,
  label,
  variant = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  variant?: "ok" | "warn" | "neutral" | "active";
}) {
  const palette: Record<string, { bg: string; fg: string }> = {
    ok:      { bg: "oklch(0.78 0.18 150 / 0.15)", fg: "var(--signal-ok)" },
    warn:    { bg: "oklch(0.78 0.18 75 / 0.15)",  fg: "var(--signal-warn)" },
    active:  { bg: "var(--accent-live-glow)",     fg: "var(--accent-live)" },
    neutral: { bg: "var(--cockpit-edge-strong)",  fg: "var(--cockpit-ink-dim)" },
  };
  const { bg, fg } = palette[variant];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
      style={{ background: bg, color: fg }}
    >
      {icon}
      {label}
    </span>
  );
}

export function TeslaCockpit() {
  const battery = useEntityNumericState(ENTITIES.car.battery);
  const range = useEntityNumericState(ENTITIES.car.range);
  const targetCharge = useEntityNumericState(ENTITIES.car.targetCharge);
  const charging = useEntityState(ENTITIES.car.chargingBinary) === "on";
  const plugged = useEntityState(ENTITIES.car.plugged) === "on";
  const lockState = useEntityState(ENTITIES.car.lock);
  const chargingSpeed = useEntityNumericState(ENTITIES.car.chargingSpeed);
  const timeToFull = useEntityNumericState(ENTITIES.car.timeToFull);
  const connectivity = useEntityState(ENTITIES.car.connectivity);

  // Doors — explicit hook calls (rules of hooks: no .map(useEntityState))
  const dDF = useEntityState(ENTITIES.car.doorDriverFront);
  const dDR = useEntityState(ENTITIES.car.doorDriverRear);
  const dPF = useEntityState(ENTITIES.car.doorPassengerFront);
  const dPR = useEntityState(ENTITIES.car.doorPassengerRear);
  const anyDoorOpen = [dDF, dDR, dPF, dPR].some((d) => d === "on");

  const isOnline = connectivity === "on";
  const isLocked = lockState === "locked";
  const pct = battery ?? 0;
  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
  const ringColor = battery === null
    ? "var(--cockpit-ink-faint)"
    : pct < 20
      ? "var(--signal-warn)"
      : "var(--cockpit-ink)";

  return (
    <section
      className="relative overflow-hidden"
      style={{
        padding: "var(--cockpit-pad-zone)",
        borderRadius: "var(--cockpit-radius-zone)",
        background: charging
          ? `radial-gradient(140% 110% at 50% 0%, var(--signal-tesla-glow), transparent 60%), var(--cockpit-canvas-soft)`
          : `radial-gradient(120% 100% at 50% 0%, var(--accent-live-glow), transparent 60%), var(--cockpit-canvas-soft)`,
        boxShadow: charging
          ? "inset 0 1px 0 0 var(--signal-tesla-glow), 0 0 60px -20px var(--signal-tesla-glow)"
          : "inset 0 1px 0 0 var(--cockpit-edge-soft)",
        transition: "background var(--motion-slow) var(--ease-out), box-shadow var(--motion-slow) var(--ease-out)",
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.08em]"
          style={{ color: "var(--cockpit-ink-dim)" }}
        >
          Tesla
        </span>
        <span
          className="flex items-center gap-1.5 text-[11px]"
          style={{ color: charging ? "var(--signal-tesla)" : isOnline ? "var(--signal-ok)" : "var(--cockpit-ink-faint)" }}
        >
          <span
            className="block h-1.5 w-1.5 rounded-full"
            style={{
              background: charging ? "var(--signal-tesla)" : isOnline ? "var(--signal-ok)" : "var(--cockpit-ink-faint)",
              boxShadow: charging || isOnline ? "0 0 8px currentColor" : "none",
            }}
          />
          {charging ? "lädt" : isOnline ? "online" : "offline"}
        </span>
      </div>

      <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-around md:gap-10">
        {/* SoC ring */}
        <div className="relative">
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            style={charging ? { animation: "cockpit-pulse 2s ease-in-out infinite" } : undefined}
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--cockpit-edge-strong)"
              strokeWidth={RING_STROKE}
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth={RING_STROKE}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              style={{ transition: "stroke-dashoffset 0.8s var(--ease-out)" }}
            />
            {targetCharge !== null && targetCharge < 100 && (
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="var(--cockpit-ink-dim)"
                strokeWidth={2.5}
                strokeDasharray={`3 ${CIRCUMFERENCE - 3}`}
                strokeDashoffset={CIRCUMFERENCE - (targetCharge / 100) * CIRCUMFERENCE}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            )}
          </svg>

          {/* Center text — absolute over the SVG */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="display-num text-[52px] font-light leading-none tabular-nums"
              style={{
                color: battery === null ? "var(--cockpit-ink-faint)" : "var(--cockpit-ink)",
                letterSpacing: "-0.03em",
              }}
            >
              {battery !== null ? Math.round(battery) : "—"}
            </span>
            <span
              className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em]"
              style={{ color: "var(--cockpit-ink-dim)" }}
            >
              %
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col items-center gap-4 md:items-start">
          {/* Range */}
          <div className="text-center md:text-left">
            <div
              className="display-num text-[36px] font-light leading-none tabular-nums md:text-[44px]"
              style={{
                color: range === null ? "var(--cockpit-ink-faint)" : "var(--cockpit-ink)",
                letterSpacing: "-0.03em",
              }}
            >
              {range !== null ? Math.round(range) : "—"}
              <span className="ml-1.5 text-[18px]" style={{ color: "var(--cockpit-ink-dim)" }}>
                km
              </span>
            </div>
            <div
              className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em]"
              style={{ color: "var(--cockpit-ink-dim)" }}
            >
              Reichweite
            </div>
          </div>

          {/* Charge info — only while charging */}
          {charging && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm tabular-nums"
              style={{
                background: "var(--signal-tesla-glow)",
                color: "var(--cockpit-ink)",
                boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.06)",
              }}
            >
              <Activity className="h-4 w-4" style={{ color: "var(--signal-tesla)" }} />
              <span className="font-mono">
                {chargingSpeed !== null ? `${chargingSpeed.toFixed(1).replace(".", ",")} km/h` : "—"}
              </span>
              {timeToFull !== null && timeToFull > 0 && (
                <span style={{ color: "var(--cockpit-ink-dim)" }}>
                  · noch {Math.round(timeToFull / 60)}h
                </span>
              )}
            </div>
          )}

          {/* Status pills */}
          <div className="flex flex-wrap justify-center gap-1.5 md:justify-start">
            <Pill
              icon={<Plug className="h-3 w-3" />}
              label={plugged ? "Stecker" : "Kabel ab"}
              variant={plugged ? "active" : "neutral"}
            />
            <Pill
              icon={isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              label={isLocked ? "Verriegelt" : "Offen"}
              variant={isLocked ? "ok" : "warn"}
            />
            {anyDoorOpen && (
              <Pill icon={<DoorOpen className="h-3 w-3" />} label="Tür offen" variant="warn" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
