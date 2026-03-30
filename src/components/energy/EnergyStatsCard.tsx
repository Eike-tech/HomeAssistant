"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntityNumericState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";
import { formatCurrency, formatEnergy } from "@/lib/utils/formatters";

export function EnergyStatsCard() {
  const dailyCost = useEntityNumericState(ENTITIES.energy.dailyCost);
  const dailyConsumption = useEntityNumericState(ENTITIES.energy.dailyConsumption);
  const monthlyCost = useEntityNumericState(ENTITIES.energy.monthlyCost);
  const monthlyConsumption = useEntityNumericState(ENTITIES.energy.monthlyConsumption);
  const co2 = useEntityNumericState(ENTITIES.energy.co2Intensity);
  const fossil = useEntityNumericState(ENTITIES.energy.fossilShare);
  const avgPower = useEntityNumericState(ENTITIES.energy.avgPower);
  const maxPower = useEntityNumericState(ENTITIES.energy.maxPower);
  const minPower = useEntityNumericState(ENTITIES.energy.minPower);

  const greenShare = fossil !== null ? Math.round(100 - fossil) : null;
  const isGreen = (greenShare ?? 0) >= 50;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Kosten & Verbrauch
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CO2 Badge */}
        {(co2 !== null || greenShare !== null) && (
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${isGreen ? "bg-green-400/10" : "bg-orange-400/10"}`}>
            <div className={`h-2 w-2 rounded-full ${isGreen ? "bg-green-400" : "bg-orange-400"}`} />
            <div className="flex flex-col">
              <span className={`text-xs font-medium ${isGreen ? "text-green-400" : "text-orange-400"}`}>
                {greenShare !== null ? `${greenShare}% erneuerbar` : "—"}
              </span>
              {co2 !== null && (
                <span className="text-[10px] text-muted-foreground tabular-nums">{Math.round(co2)} g CO2/kWh</span>
              )}
            </div>
          </div>
        )}

        {/* Cost Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Heute</span>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatCurrency(dailyCost)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{formatEnergy(dailyConsumption)}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Monat</span>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatCurrency(monthlyCost)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{formatEnergy(monthlyConsumption)}</p>
          </div>
        </div>

        {/* Power Stats */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Leistung heute</span>
          <div className="flex gap-4 text-xs">
            {minPower !== null && (
              <div>
                <span className="text-muted-foreground">Min </span>
                <span className="font-medium tabular-nums">{Math.round(minPower)} W</span>
              </div>
            )}
            {avgPower !== null && (
              <div>
                <span className="text-muted-foreground">Avg </span>
                <span className="font-medium tabular-nums">{Math.round(avgPower)} W</span>
              </div>
            )}
            {maxPower !== null && (
              <div>
                <span className="text-muted-foreground">Max </span>
                <span className="font-medium tabular-nums">{(maxPower / 1000).toFixed(1)} kW</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
