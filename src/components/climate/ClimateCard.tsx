"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntityNumericState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";

interface RoomDef {
  name: string;
  tempEntity: string;
  humidityEntity?: string;
}

const ROOMS: RoomDef[] = [
  { name: "Bad", tempEntity: ENTITIES.climate.badTemp },
  { name: "Büro", tempEntity: ENTITIES.climate.bueroTemp, humidityEntity: ENTITIES.climate.bueroHumidity },
  { name: "Wohnzimmer", tempEntity: ENTITIES.climate.wohnzimmerTemp, humidityEntity: ENTITIES.climate.wohnzimmerHumidity },
  { name: "Schlafzimmer", tempEntity: ENTITIES.climate.schlafzimmerTemp, humidityEntity: ENTITIES.climate.schlafzimmerHumidity },
];

const TEMP_MIN = 18;
const TEMP_MAX = 25;

function useRoom(def: RoomDef) {
  const temp = useEntityNumericState(def.tempEntity);
  const hum = def.humidityEntity ? useEntityNumericState(def.humidityEntity) : null;
  return { name: def.name, temp, hum };
}

export function ClimateCard() {
  const rows = ROOMS.map(useRoom);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Räume · Klima</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3.5">
          {rows.map((r) => {
            const pos =
              r.temp == null
                ? null
                : Math.max(0, Math.min(100, ((r.temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * 100));
            return (
              <div key={r.name} className="flex items-center gap-3">
                <div className="flex-1 text-[13px]" style={{ color: "var(--cockpit-ink)" }}>
                  {r.name}
                </div>
                <div
                  className="relative hidden h-1 w-[120px] flex-none rounded-full sm:block"
                  style={{ background: "var(--surface-1)" }}
                  aria-hidden
                >
                  {pos != null && (
                    <div
                      className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ left: `${pos}%`, background: "var(--cockpit-ink)" }}
                    />
                  )}
                </div>
                <div
                  className="w-14 text-right font-mono text-[13px] tabular-nums"
                  style={{ color: "var(--cockpit-ink)" }}
                >
                  {r.temp != null ? `${r.temp.toFixed(1).replace(".", ",")}°` : "—"}
                </div>
                <div
                  className="w-10 text-right font-mono text-[11px] tabular-nums"
                  style={{ color: "var(--cockpit-ink-dim)" }}
                >
                  {r.hum != null ? `${Math.round(r.hum)}%` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
