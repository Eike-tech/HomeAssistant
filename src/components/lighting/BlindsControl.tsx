"use client";

import { Slider } from "@/components/ui/slider";
import { useEntity } from "@/lib/hooks/useEntity";
import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { openCover, closeCover, setCoverPosition } from "@/lib/hass/services";

export function BlindsControl() {
  const { connection } = useHass();
  const blind = useEntity(ENTITIES.lighting.blind);

  const position = (blind?.attributes?.current_position as number) ?? 0;
  const isOpen = blind?.state === "open";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Rollo</span>
        <div className="flex gap-1.5">
          <button
            className="rounded-full bg-white/[0.06] px-3 py-1 text-xs transition-colors hover:bg-white/[0.1]"
            onClick={() => { if (connection) openCover(connection, ENTITIES.lighting.blind); }}
          >
            Auf
          </button>
          <button
            className="rounded-full bg-white/[0.06] px-3 py-1 text-xs transition-colors hover:bg-white/[0.1]"
            onClick={() => { if (connection) closeCover(connection, ENTITIES.lighting.blind); }}
          >
            Zu
          </button>
        </div>
      </div>
      <Slider
        value={[position]}
        min={0}
        max={100}
        step={1}
        onValueCommitted={(val) => {
          const v = typeof val === "number" ? val : val[0];
          if (connection) setCoverPosition(connection, ENTITIES.lighting.blind, v);
        }}
      />
      <span className="text-xs text-muted-foreground">
        {isOpen ? `${position}% offen` : "Geschlossen"}
      </span>
    </div>
  );
}
