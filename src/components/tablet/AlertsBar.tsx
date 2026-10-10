"use client";

import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { fmt, num, useNow } from "./shared";

type Tone = "warn" | "ok" | "info";

interface Alert {
  id: string;
  tone: Tone;
  message: string;
}

const DOORS = [
  { entityId: ENTITIES.general.doorBuero, label: "Büro" },
  { entityId: ENTITIES.general.doorWohnzimmer, label: "Wohnzimmer" },
  { entityId: ENTITIES.general.doorSchlafzimmer, label: "Schlafzimmer" },
  { entityId: ENTITIES.general.doorBad, label: "Bad" },
];

// Q5 Max reports remaining runtime in seconds, not calendar time.
const MAINTENANCE = [
  { entityId: ENTITIES.vacuum.filterRemaining, label: "Vakuum-Filter" },
  { entityId: ENTITIES.vacuum.sensorRemaining, label: "Vakuum-Sensor" },
  { entityId: ENTITIES.vacuum.sideBrushRemaining, label: "Seitenbürste" },
];
const MAINTENANCE_THRESHOLD_S = 10 * 3600;

function duration(min: number): string {
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}

function useAlerts(): Alert[] {
  const { entities } = useHass();
  const now = useNow(30_000);
  const result: Alert[] = [];

  // Door open for 5+ minutes
  for (const d of DOORS) {
    const e = entities[d.entityId];
    if (e?.state !== "on" || !e.last_changed) continue;
    const min = Math.round((now.getTime() - new Date(e.last_changed).getTime()) / 60_000);
    if (min >= 5) result.push({ id: `door-${d.label}`, tone: "warn", message: `${d.label} seit ${duration(min)} offen` });
  }

  // Cheap electricity (Tibber, EPEX fallback)
  const tibber = entities[ENTITIES.energy.tibberPrice];
  const tibberOk = tibber !== undefined && tibber.state !== "unavailable";
  const price = tibberOk ? num(tibber) : num(entities[ENTITIES.energy.spotPrice]);
  const minRaw = tibberOk ? tibber.attributes?.min_price : num(entities[ENTITIES.energy.spotLowest]);
  const priceMin = typeof minRaw === "number" ? minRaw : null;
  if (price !== null && priceMin !== null && price <= priceMin * 1.1) {
    const plugged = entities[ENTITIES.car.plugged]?.state === "on";
    const charging = entities[ENTITIES.car.chargingBinary]?.state === "on";
    result.push({
      id: "cheap-power",
      tone: "ok",
      message: `Strom gerade günstig (${fmt(price * 100, 1)} ct)${plugged && !charging ? " – guter Zeitpunkt zum Laden" : ""}`,
    });
  }

  // Vacuum maintenance
  for (const m of MAINTENANCE) {
    const remaining = num(entities[m.entityId]);
    if (remaining === null || remaining >= MAINTENANCE_THRESHOLD_S) continue;
    const h = Math.round(remaining / 3600);
    result.push({
      id: `maintenance-${m.label}`,
      tone: "info",
      message: `${m.label}: noch ${h <= 0 ? "< 1" : h} Betriebsstunde${h === 1 ? "" : "n"}`,
    });
  }

  return result;
}

/** Wichtige Mitteilungen — renders nothing when everything is fine. */
export function AlertsBar() {
  const alerts = useAlerts();
  if (alerts.length === 0) return null;

  return (
    // Scrolling the bar sideways must not trigger the shell's page swipe.
    <div role="status" aria-label="Mitteilungen" className="tc-alerts" onTouchStart={(e) => e.stopPropagation()}>
      {alerts.map((a) => (
        <div key={a.id} className="tc-alert" data-tone={a.tone}>
          <span aria-hidden="true" className="tc-alert-dot" />
          {a.message}
        </div>
      ))}
    </div>
  );
}
