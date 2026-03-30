"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntityState, useEntityNumericState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";

const statusLabels: Record<string, { label: string; color: string }> = {
  idle: { label: "Bereit", color: "text-muted-foreground" },
  running: { label: "Putzt", color: "text-blue-400" },
  charging: { label: "Laden", color: "text-green-400" },
};

function ToothbrushRow({ label, statusEntity, batteryEntity }: {
  label: string;
  statusEntity: string;
  batteryEntity: string;
}) {
  const status = useEntityState(statusEntity);
  const battery = useEntityNumericState(batteryEntity);
  const info = statusLabels[status ?? ""] ?? { label: status ?? "—", color: "text-muted-foreground" };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm">{label}</span>
        <span className={`text-[10px] font-medium ${info.color}`}>{info.label}</span>
      </div>
      {battery !== null && (
        <span className={`text-xs tabular-nums ${battery < 20 ? "text-red-400" : "text-muted-foreground"}`}>
          {Math.round(battery)}%
        </span>
      )}
    </div>
  );
}

export function HouseholdCard() {
  const dishwasherState = useEntityState(ENTITIES.household.dishwasher);
  const isOnline = dishwasherState === "home";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Haushalt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Dishwasher */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Spülmaschine</span>
          <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
            isOnline ? "bg-green-400/15 text-green-400" : "bg-white/[0.06] text-muted-foreground"
          }`}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        {/* Toothbrushes */}
        <div className="space-y-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Zahnbürsten</span>
          <ToothbrushRow
            label="IO Series 6"
            statusEntity={ENTITIES.household.toothbrush1}
            batteryEntity={ENTITIES.household.toothbrush1Battery}
          />
          <ToothbrushRow
            label="IO Series 5"
            statusEntity={ENTITIES.household.toothbrush2}
            batteryEntity={ENTITIES.household.toothbrush2Battery}
          />
        </div>
      </CardContent>
    </Card>
  );
}
