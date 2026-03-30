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

function MaintenanceIndicator({ label, remainingSeconds }: { label: string; remainingSeconds: number | null }) {
  if (remainingSeconds === null) return null;
  const totalSeconds = label === "Filter" ? 150 * 3600 : label === "Sensor" ? 30 * 3600 : 300 * 3600;
  const pct = Math.min(100, Math.max(0, (remainingSeconds / totalSeconds) * 100));
  const days = Math.round(remainingSeconds / 86400);
  const isLow = pct < 15;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isLow ? "bg-red-400" : pct < 30 ? "bg-orange-400" : "bg-green-400/60"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] tabular-nums w-8 text-right ${isLow ? "text-red-400" : "text-muted-foreground"}`}>
        {days}d
      </span>
    </div>
  );
}

function DockStatus() {
  const freshWater = useEntityState(ENTITIES.vacuum.dockFreshWater);
  const dirtyWater = useEntityState(ENTITIES.vacuum.dockDirtyWater);
  const dockError = useEntityState(ENTITIES.vacuum.dockError);

  const hasIssue = freshWater === "on" || dirtyWater === "on" || (dockError && dockError !== "ok");
  if (!hasIssue) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {freshWater === "on" && (
        <span className="text-[10px] rounded-full px-2 py-0.5 bg-blue-400/15 text-blue-400">Frischwasser leer</span>
      )}
      {dirtyWater === "on" && (
        <span className="text-[10px] rounded-full px-2 py-0.5 bg-orange-400/15 text-orange-400">Schmutzwasser voll</span>
      )}
      {dockError && dockError !== "ok" && (
        <span className="text-[10px] rounded-full px-2 py-0.5 bg-red-400/15 text-red-400">Dock: {dockError}</span>
      )}
    </div>
  );
}

export function VacuumCard() {
  const { connection } = useHass();
  const vacuumState = useEntityState(ENTITIES.vacuum.entity);
  const battery = useEntityNumericState(ENTITIES.vacuum.battery);
  const status = useEntityState(ENTITIES.vacuum.status);
  const currentRoom = useEntityState(ENTITIES.vacuum.currentRoom);
  const cleaningArea = useEntityNumericState(ENTITIES.vacuum.cleaningArea);
  const cleaningTime = useEntityNumericState(ENTITIES.vacuum.cleaningTime);
  const filterRemaining = useEntityNumericState(ENTITIES.vacuum.filterRemaining);
  const mainBrush = useEntityNumericState(ENTITIES.vacuum.mainBrushRemaining);
  const sideBrush = useEntityNumericState(ENTITIES.vacuum.sideBrushRemaining);
  const sensorRemaining = useEntityNumericState(ENTITIES.vacuum.sensorRemaining);

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

        {/* Dock Status Warnings */}
        <DockStatus />

        {/* Maintenance Indicators */}
        <div className="space-y-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Wartung</span>
          <MaintenanceIndicator label="Filter" remainingSeconds={filterRemaining} />
          <MaintenanceIndicator label="Hauptbürste" remainingSeconds={mainBrush} />
          <MaintenanceIndicator label="Seitenbürste" remainingSeconds={sideBrush} />
          <MaintenanceIndicator label="Sensor" remainingSeconds={sensorRemaining} />
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
