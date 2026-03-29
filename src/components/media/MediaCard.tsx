"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTITIES } from "@/lib/hass/entities";
import { MediaPlayer } from "./MediaPlayer";

const zones = [
  { id: ENTITIES.media.wohnzimmer, name: "Wohnzimmer" },
  { id: ENTITIES.media.buro, name: "Büro" },
  { id: ENTITIES.media.schlafzimmer, name: "Schlafzimmer" },
  { id: ENTITIES.media.bad, name: "Bad" },
];

export function MediaCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Media
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {zones.map((zone, i) => (
          <div key={zone.id}>
            {i > 0 && <div className="border-t border-white/[0.05] mb-4" />}
            <MediaPlayer entityId={zone.id} name={zone.name} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
