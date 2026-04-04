"use client";

import { Droplets } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useEntity, useEntityNumericState } from "@/lib/hooks/useEntity";
import { useHass } from "@/lib/hooks/useHass";
import { formatTemperature, formatHumidity } from "@/lib/utils/formatters";
import { setClimateTemp } from "@/lib/hass/services";

interface RoomClimateProps {
  name: string;
  tempEntity: string;
  humidityEntity?: string;
  thermostatEntity?: string; // climate.* entity for rooms with a thermostat
}

export function RoomClimate({ name, tempEntity, humidityEntity, thermostatEntity }: RoomClimateProps) {
  const { connection } = useHass();
  const temp = useEntityNumericState(tempEntity);
  const humidity = humidityEntity ? useEntityNumericState(humidityEntity) : null;
  const thermostat = thermostatEntity ? useEntity(thermostatEntity) : null;

  const targetTemp = thermostat?.attributes?.temperature as number | undefined;
  const hvacMode = thermostat?.state;
  const isHeating = hvacMode === "heat";

  const handleTempChange = (value: number | readonly number[]) => {
    const t = typeof value === "number" ? value : value[0];
    if (connection && thermostatEntity && t !== undefined) {
      setClimateTemp(connection, thermostatEntity, t);
    }
  };

  // Color based on temperature
  const tempColor = temp === null
    ? "text-muted-foreground"
    : temp < 18
      ? "text-blue-400"
      : temp > 23
        ? "text-orange-400"
        : "text-foreground";

  return (
    <div className="rounded-2xl bg-white/[0.04] px-4 py-3 space-y-3">
      {/* Header: room name + heating badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{name}</span>
        {isHeating && (
          <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-orange-400/15 text-orange-400">
            Heizen
          </span>
        )}
      </div>

      {/* Temperature + Humidity */}
      <div className="flex items-end justify-between">
        <span className={`text-2xl font-light tabular-nums ${tempColor}`}>
          {formatTemperature(temp)}
        </span>
        {humidity !== null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Droplets className="h-3 w-3" />
            <span className="tabular-nums">{formatHumidity(humidity)}</span>
          </div>
        )}
      </div>

      {/* Thermostat Slider */}
      {thermostatEntity && targetTemp !== undefined && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
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
    </div>
  );
}
