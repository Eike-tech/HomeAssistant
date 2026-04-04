"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useEntity, useEntityNumericState } from "@/lib/hooks/useEntity";
import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { formatTemperature } from "@/lib/utils/formatters";
import { setClimateTemp } from "@/lib/hass/services";
import { RoomClimate } from "./RoomClimate";

export function ClimateCard() {
  const { connection } = useHass();
  const thermostat = useEntity(ENTITIES.climate.thermostat);
  const thermostatTemp = useEntityNumericState(ENTITIES.climate.badTemp);

  const targetTemp = thermostat?.attributes?.temperature as number | undefined;
  const hvacMode = thermostat?.state ?? "unknown";

  const handleTempChange = (value: number | readonly number[]) => {
    const temp = typeof value === "number" ? value : value[0];
    if (connection && temp !== undefined) {
      setClimateTemp(connection, ENTITIES.climate.thermostat, temp);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Klima
        </CardTitle>
        <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${
          hvacMode === "heat" ? "bg-orange-400/15 text-orange-400" : "bg-white/[0.06] text-muted-foreground"
        }`}>
          {hvacMode === "heat" ? "Heizen" : hvacMode === "off" ? "Aus" : hvacMode}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Thermostat Bad */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Bad</span>
          <span className="text-2xl font-light tabular-nums">
            {formatTemperature(thermostatTemp)}
          </span>
        </div>

        {targetTemp !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Ziel: {formatTemperature(targetTemp)}</span>
              <span>15° — 30°</span>
            </div>
            <Slider
              value={[targetTemp]}
              min={15}
              max={30}
              step={0.5}
              onValueCommitted={handleTempChange}
            />
          </div>
        )}

        {/* Rooms */}
        <div className="space-y-2 pt-1">
          <RoomClimate name="Büro" tempEntity={ENTITIES.climate.bueroTemp} humidityEntity={ENTITIES.climate.bueroHumidity} />
          <RoomClimate name="Wohnzimmer" tempEntity={ENTITIES.climate.wohnzimmerTemp} humidityEntity={ENTITIES.climate.wohnzimmerHumidity} />
          <RoomClimate name="Schlafzimmer" tempEntity={ENTITIES.climate.schlafzimmerTemp} humidityEntity={ENTITIES.climate.schlafzimmerHumidity} />
        </div>
      </CardContent>
    </Card>
  );
}
