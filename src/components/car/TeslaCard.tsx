"use client";

import { Lock, Unlock, MapPin, Plug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntity, useEntityNumericState, useEntityState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";

const fmtTemp = (c: number | null) =>
  c == null || Number.isNaN(c) ? "—" : `${c.toFixed(1).replace(".", ",")}°`;

export function TeslaCard() {
  const battery = useEntityNumericState(ENTITIES.car.battery) ?? null;
  const range = useEntityNumericState(ENTITIES.car.range) ?? null;
  const target = useEntityNumericState(ENTITIES.car.targetCharge) ?? 80;
  const inside = useEntityNumericState(ENTITIES.car.interiorTemp);
  const outside = useEntityNumericState(ENTITIES.car.exteriorTemp);
  const chargingStatus = useEntityState(ENTITIES.car.chargingStatus);
  const lockState = useEntityState(ENTITIES.car.lock);
  const chargerPower = useEntityNumericState(ENTITIES.car.chargerPower);
  const timeToFull = useEntityState(ENTITIES.car.timeToFull);
  const location = useEntity(ENTITIES.car.location);
  const locName =
    (location?.attributes?.friendly_name as string | undefined) ??
    (location?.state === "home" ? "Zuhause" : (location?.state ?? "—"));

  const isCharging = chargingStatus
    ? /charging|lädt|laden/i.test(chargingStatus)
    : false;
  const isLocked = lockState === "locked";

  // Donut geometry — mirrors variant1 design (110px ring, r=48, stroke 6)
  const SIZE = 132;
  const R = 58;
  const C = 2 * Math.PI * R;
  const batPct = battery != null ? Math.min(100, Math.max(0, battery)) : 0;
  const tgtPct = target != null ? Math.min(100, Math.max(0, target)) : 80;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle>Tesla Model Y</CardTitle>
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--cockpit-ink-dim)" }}>
            <MapPin className="h-3 w-3" />
            <span>{locName}</span>
            <span aria-hidden> · </span>
            {isLocked ? (
              <>
                <Lock className="h-3 w-3" /> verriegelt
              </>
            ) : (
              <>
                <Unlock className="h-3 w-3" /> offen
              </>
            )}
          </div>
        </div>
        {isCharging && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
            style={{
              background: "color-mix(in oklch, var(--signal-tesla) 14%, transparent)",
              color: "var(--signal-tesla)",
              border: "1px solid color-mix(in oklch, var(--signal-tesla) 28%, transparent)",
            }}
          >
            <span
              className="block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--signal-tesla)", animation: "cockpit-pulse 1.5s infinite" }}
            />
            lädt{chargerPower ? ` · ${chargerPower.toFixed(1).replace(".", ",")} kW` : ""}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--cockpit-edge-strong)" strokeWidth="6" />
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke="var(--cockpit-ink)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(C * batPct) / 100} ${C}`}
              />
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke="var(--signal-tesla)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(C * Math.max(0, tgtPct - batPct)) / 100} ${C}`}
                strokeDashoffset={`-${(C * batPct) / 100}`}
                opacity="0.35"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="display-num text-[28px] font-medium leading-none tabular-nums" style={{ color: "var(--cockpit-ink)" }}>
                  {battery != null ? Math.round(battery) : "—"}
                  <span className="ml-0.5 text-[14px]" style={{ color: "var(--cockpit-ink-dim)" }}>%</span>
                </div>
                <div className="mt-1 font-mono text-[10px] tabular-nums" style={{ color: "var(--cockpit-ink-dim)" }}>
                  {range != null ? `${Math.round(range)} km` : "—"}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="text-[11px] flex items-center gap-1.5" style={{ color: "var(--cockpit-ink-dim)" }}>
              <Plug className="h-3 w-3" />
              <span>
                Ziel {Math.round(tgtPct)}%
                {isCharging && timeToFull ? ` · noch ${timeToFull}` : ""}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-1)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: "var(--cockpit-ink)",
                  width: `${tgtPct ? Math.min(100, (batPct / tgtPct) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--cockpit-ink-dim)" }}>
                  Innen
                </div>
                <div className="mt-0.5 text-[16px] font-medium tabular-nums">{fmtTemp(inside)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--cockpit-ink-dim)" }}>
                  Außen
                </div>
                <div className="mt-0.5 text-[16px] font-medium tabular-nums">{fmtTemp(outside)}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
