"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEntityNumericState, useEntityState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";
import { formatRange, formatPercent, formatTemperature } from "@/lib/utils/formatters";
import { BatteryGauge } from "./BatteryGauge";
import { ChargeStatus } from "./ChargeStatus";
import { CarControls } from "./CarControls";

export function CarOverviewCard() {
  const battery = useEntityNumericState(ENTITIES.car.battery);
  const range = useEntityNumericState(ENTITIES.car.range);
  const targetCharge = useEntityNumericState(ENTITIES.car.targetCharge);
  const connectivity = useEntityState(ENTITIES.car.connectivity);
  const exteriorTemp = useEntityNumericState(ENTITIES.car.exteriorTemp);
  const interiorTemp = useEntityNumericState(ENTITIES.car.interiorTemp);

  const isOnline = connectivity === "on";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Crest
        </CardTitle>
        <Badge
          variant="secondary"
          className={`rounded-full text-[11px] px-3 ${isOnline ? "bg-green-400/15 text-green-400" : "bg-white/[0.06] text-muted-foreground"}`}
        >
          {isOnline ? "Online" : "Offline"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Battery Hero */}
        <div className="flex items-center gap-6">
          <BatteryGauge percentage={battery} target={targetCharge} />
          <div className="flex flex-col gap-0.5">
            <span className="text-4xl font-light tracking-tight tabular-nums">
              {formatPercent(battery)}
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatRange(range)}
            </span>
            {targetCharge !== null && (
              <span className="text-xs text-muted-foreground/60">
                Ziel {formatPercent(targetCharge)}
              </span>
            )}
          </div>
        </div>

        <ChargeStatus />

        {/* Temperatures */}
        {(interiorTemp !== null || exteriorTemp !== null) && (
          <div className="flex gap-3">
            {interiorTemp !== null && (
              <div className="rounded-2xl bg-white/[0.04] px-4 py-2.5 flex-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Innen</span>
                <p className="text-base font-medium tabular-nums">{formatTemperature(interiorTemp)}</p>
              </div>
            )}
            {exteriorTemp !== null && (
              <div className="rounded-2xl bg-white/[0.04] px-4 py-2.5 flex-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Außen</span>
                <p className="text-base font-medium tabular-nums">{formatTemperature(exteriorTemp)}</p>
              </div>
            )}
          </div>
        )}

        <CarControls />
      </CardContent>
    </Card>
  );
}
