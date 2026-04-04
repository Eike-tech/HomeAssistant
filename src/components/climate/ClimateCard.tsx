"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTITIES } from "@/lib/hass/entities";
import { RoomClimate } from "./RoomClimate";

export function ClimateCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Klima
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <RoomClimate
            name="Bad"
            tempEntity={ENTITIES.climate.badTemp}
            thermostatEntity={ENTITIES.climate.thermostat}
          />
          <RoomClimate
            name="Büro"
            tempEntity={ENTITIES.climate.bueroTemp}
            humidityEntity={ENTITIES.climate.bueroHumidity}
          />
          <RoomClimate
            name="Wohnzimmer"
            tempEntity={ENTITIES.climate.wohnzimmerTemp}
            humidityEntity={ENTITIES.climate.wohnzimmerHumidity}
          />
          <RoomClimate
            name="Schlafzimmer"
            tempEntity={ENTITIES.climate.schlafzimmerTemp}
            humidityEntity={ENTITIES.climate.schlafzimmerHumidity}
          />
        </div>
      </CardContent>
    </Card>
  );
}
