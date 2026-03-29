"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEntityNumericState, useEntityState } from "@/lib/hooks/useEntity";
import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { startVacuum, stopVacuum, returnVacuumToDock } from "@/lib/hass/services";
import { formatPercent, formatArea, formatDuration } from "@/lib/utils/formatters";

const statusLabels: Record<string, string> = {
  docked: "Angedockt",
  charging: "Laden",
  cleaning: "Reinigt",
  returning: "Zurück",
  idle: "Bereit",
  paused: "Pause",
  error: "Fehler",
};

export function VacuumCard() {
  const { connection } = useHass();
  const vacuumState = useEntityState(ENTITIES.vacuum.entity);
  const battery = useEntityNumericState(ENTITIES.vacuum.battery);
  const status = useEntityState(ENTITIES.vacuum.status);
  const currentRoom = useEntityState(ENTITIES.vacuum.currentRoom);
  const cleaningArea = useEntityNumericState(ENTITIES.vacuum.cleaningArea);
  const cleaningTime = useEntityNumericState(ENTITIES.vacuum.cleaningTime);

  const displayStatus = statusLabels[status ?? ""] ?? statusLabels[vacuumState ?? ""] ?? status ?? vacuumState ?? "—";
  const isCleaning = vacuumState === "cleaning" || status === "cleaning";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          R2-Dreck2
        </CardTitle>
        <span className={`text-[11px] font-medium rounded-full px-2.5 py-1 ${
          isCleaning ? "bg-blue-400/15 text-blue-400" : "bg-white/[0.06] text-muted-foreground"
        }`}>
          {displayStatus}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Battery */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Batterie</span>
            <span className="font-medium tabular-nums">{formatPercent(battery)}</span>
          </div>
          <Progress value={battery ?? 0} className="h-1.5" />
        </div>

        {/* Info */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          {currentRoom && <span>{currentRoom}</span>}
          {cleaningArea !== null && <span>{formatArea(cleaningArea)}</span>}
          {cleaningTime !== null && cleaningTime > 0 && <span>{formatDuration(cleaningTime)}</span>}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {[
            { label: "Start", action: () => connection && startVacuum(connection, ENTITIES.vacuum.entity) },
            { label: "Stop", action: () => connection && stopVacuum(connection, ENTITIES.vacuum.entity) },
            { label: "Dock", action: () => connection && returnVacuumToDock(connection, ENTITIES.vacuum.entity) },
          ].map((btn) => (
            <button
              key={btn.label}
              className="flex-1 rounded-2xl bg-white/[0.04] py-2.5 text-xs font-medium transition-colors hover:bg-white/[0.08] active:bg-white/[0.12]"
              onClick={btn.action}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
