"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useEntity } from "@/lib/hooks/useEntity";
import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { toggleLight, turnOnLight } from "@/lib/hass/services";
import { SceneSelector } from "./SceneSelector";
import { BlindsControl } from "./BlindsControl";

function LightRow({ entityId, name }: { entityId: string; name: string }) {
  const { connection } = useHass();
  const entity = useEntity(entityId);

  const isOn = entity?.state === "on";
  const brightness = entity?.attributes?.brightness as number | undefined;
  const brightnessPercent = brightness !== undefined ? Math.round((brightness / 255) * 100) : undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full transition-colors ${isOn ? "bg-yellow-300" : "bg-muted-foreground/30"}`} />
          <span className="text-sm">{name}</span>
        </div>
        <Switch
          checked={isOn}
          onCheckedChange={() => {
            if (connection) toggleLight(connection, entityId);
          }}
        />
      </div>
      {isOn && brightnessPercent !== undefined && (
        <Slider
          value={[brightnessPercent]}
          min={1}
          max={100}
          step={1}
          className="py-0.5"
          onValueCommitted={(val) => {
            const v = typeof val === "number" ? val : val[0];
            if (connection) turnOnLight(connection, entityId, v);
          }}
        />
      )}
    </div>
  );
}

export function LightingCard() {
  const lights = [
    { id: ENTITIES.lighting.wohnzimmer, name: "Wohnzimmer" },
    { id: ENTITIES.lighting.standleuchte, name: "Standleuchte" },
    { id: ENTITIES.lighting.fotowand, name: "Fotowand" },
    { id: ENTITIES.lighting.tradfriBulb, name: "TRADFRI" },
    { id: ENTITIES.lighting.badezimmer, name: "Badezimmer" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Licht
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          {lights.map((light) => (
            <LightRow key={light.id} entityId={light.id} name={light.name} />
          ))}
        </div>

        <SceneSelector />
        <BlindsControl />
      </CardContent>
    </Card>
  );
}
