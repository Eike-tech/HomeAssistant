"use client";

import { useMemo } from "react";
import { DoorOpen, Zap, Wrench, X } from "lucide-react";
import { useEntity, useEntityNumericState, useEntityState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";

interface Alert {
  id: string;
  icon: typeof DoorOpen;
  message: string;
  color: string;
  bgColor: string;
}

export function SmartAlerts() {
  const doorBuero = useEntity(ENTITIES.general.doorBuero);
  const doorWohnzimmer = useEntity(ENTITIES.general.doorWohnzimmer);
  const doorSchlafzimmer = useEntity(ENTITIES.general.doorSchlafzimmer);
  const doorBad = useEntity(ENTITIES.general.doorBad);
  const tibberEntity = useEntity(ENTITIES.energy.tibberPrice);
  const spotEntity = useEntity(ENTITIES.energy.spotPrice);
  const epexLowest = useEntityNumericState(ENTITIES.energy.spotLowest);
  const tibberAvailable = tibberEntity?.state !== undefined && tibberEntity?.state !== "unavailable";
  const priceEntity = tibberAvailable ? tibberEntity : spotEntity;
  const priceMin = tibberAvailable
    ? (tibberEntity!.attributes?.min_price as number | undefined)
    : (epexLowest ?? undefined);
  const filterRemaining = useEntityNumericState(ENTITIES.vacuum.filterRemaining);
  const sensorRemaining = useEntityNumericState(ENTITIES.vacuum.sensorRemaining);
  const sideBrushRemaining = useEntityNumericState(ENTITIES.vacuum.sideBrushRemaining);
  const isCharging = useEntityState(ENTITIES.car.chargingBinary);
  const isPlugged = useEntityState(ENTITIES.car.plugged);

  const alerts = useMemo(() => {
    const result: Alert[] = [];

    // Door open alerts
    const doors = [
      { entity: doorBuero, label: "Büro" },
      { entity: doorWohnzimmer, label: "Wohnzimmer" },
      { entity: doorSchlafzimmer, label: "Schlafzimmer" },
      { entity: doorBad, label: "Bad" },
    ];
    for (const d of doors) {
      if (d.entity?.state === "on") {
        const lastChanged = d.entity.last_changed;
        if (lastChanged) {
          const minAgo = Math.round((Date.now() - new Date(lastChanged).getTime()) / 60000);
          if (minAgo >= 5) {
            result.push({
              id: `door-${d.label}`,
              icon: DoorOpen,
              message: `${d.label} seit ${minAgo} Min offen`,
              color: "text-red-400",
              bgColor: "bg-red-400/10 border-red-400/20",
            });
          }
        }
      }
    }

    // Cheap electricity alert (Tibber with EPEX fallback)
    if (priceEntity && priceMin !== undefined) {
      const current = parseFloat(priceEntity.state);
      if (!isNaN(current) && current <= priceMin * 1.1) {
        const tip = isPlugged === "on" && isCharging !== "on"
          ? " — Guter Zeitpunkt zum Laden!"
          : "";
        result.push({
          id: "cheap-power",
          icon: Zap,
          message: `Strom gerade günstig (${(current * 100).toFixed(1)} ct)${tip}`,
          color: "text-green-400",
          bgColor: "bg-green-400/10 border-green-400/20",
        });
      }
    }

    // Vacuum maintenance alerts (values are runtime seconds, not calendar time)
    const maintenanceItems = [
      { remaining: filterRemaining, label: "Vakuum-Filter", threshold: 10 * 3600 },
      { remaining: sensorRemaining, label: "Vakuum-Sensor", threshold: 10 * 3600 },
      { remaining: sideBrushRemaining, label: "Seitenbürste", threshold: 10 * 3600 },
    ];
    for (const item of maintenanceItems) {
      if (item.remaining !== null && item.remaining < item.threshold) {
        const hours = Math.round(item.remaining / 3600);
        result.push({
          id: `maintenance-${item.label}`,
          icon: Wrench,
          message: `${item.label}: noch ${hours <= 0 ? "< 1" : hours} Betriebsstunde${hours !== 1 ? "n" : ""}`,
          color: "text-orange-400",
          bgColor: "bg-orange-400/10 border-orange-400/20",
        });
      }
    }

    return result;
  }, [doorBuero, doorWohnzimmer, doorSchlafzimmer, doorBad, priceEntity, priceMin, filterRemaining, sensorRemaining, sideBrushRemaining, isCharging, isPlugged]);

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 px-2">
      {alerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <div
            key={alert.id}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${alert.bgColor}`}
          >
            <Icon className={`h-3.5 w-3.5 shrink-0 ${alert.color}`} />
            <span className={alert.color}>{alert.message}</span>
          </div>
        );
      })}
    </div>
  );
}
