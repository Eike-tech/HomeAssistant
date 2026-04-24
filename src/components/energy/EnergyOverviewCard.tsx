"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntity, useEntityNumericState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";
import {
  formatPower,
  formatCurrency,
  formatEnergy,
} from "@/lib/utils/formatters";

function timeAgo(isoString: string | undefined): string {
  if (!isoString) return "—";
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 10) return "gerade eben";
  if (diff < 60) return `vor ${Math.round(diff)}s`;
  if (diff < 3600) return `vor ${Math.round(diff / 60)}min`;
  if (diff < 86400) return `vor ${Math.round(diff / 3600)}h`;
  return `vor ${Math.round(diff / 86400)}d`;
}

function useRelativeTime(isoString: string | undefined) {
  const [text, setText] = useState("—");
  useEffect(() => {
    setText(timeAgo(isoString));
    const interval = setInterval(() => setText(timeAgo(isoString)), 10000);
    return () => clearInterval(interval);
  }, [isoString]);
  return text;
}

function isStale(isoString: string | undefined, thresholdMinutes = 5): boolean {
  if (!isoString) return true;
  return (Date.now() - new Date(isoString).getTime()) / 60000 > thresholdMinutes;
}

const consumers = [
  { entity: ENTITIES.energy.eveEnergy1Power, name: "Workstation" },
  { entity: ENTITIES.energy.eveEnergy2Power, name: "Entertainment" },
  { entity: ENTITIES.energy.shellyPower, name: "Außensteckdose" },
  { entity: ENTITIES.energy.trocknerPower, name: "Trockner" },
  { entity: ENTITIES.energy.waschmaschinePower, name: "Waschmaschine" },
  { entity: ENTITIES.energy.geschirrspulerPower, name: "Geschirrspüler" },
  { entity: ENTITIES.energy.gefrierschrankPower, name: "Gefrierschrank" },
  { entity: ENTITIES.energy.netzwerkPower, name: "Netzwerk" },
];

function ConsumerRow({ entity, name }: { entity: string; name: string }) {
  const e = useEntity(entity);
  const power = e ? parseFloat(e.state) : null;
  const watts = power ?? 0;
  const isActive = watts > 1;
  const stale = isStale(e?.last_updated);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className={`h-1.5 w-1.5 rounded-full transition-colors ${stale ? "bg-orange-400" : isActive ? "bg-green-400" : "bg-muted-foreground/30"}`} />
        <span className="text-sm">{name}</span>
      </div>
      <span className={`text-sm font-medium tabular-nums ${stale ? "text-orange-400/70" : isActive ? "text-foreground" : "text-muted-foreground"}`}>
        {power !== null && !isNaN(power) ? `${Math.round(power)} W` : "—"}
      </span>
    </div>
  );
}

function Co2Badge() {
  const co2 = useEntityNumericState(ENTITIES.energy.co2Intensity);
  const fossil = useEntityNumericState(ENTITIES.energy.fossilShare);

  if (co2 === null && fossil === null) return null;

  const greenShare = fossil !== null ? Math.round(100 - fossil) : null;
  const isGreen = (greenShare ?? 0) >= 50;

  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${isGreen ? "bg-green-400/10" : "bg-orange-400/10"}`}>
      <div className={`h-2 w-2 rounded-full ${isGreen ? "bg-green-400" : "bg-orange-400"}`} />
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${isGreen ? "text-green-400" : "text-orange-400"}`}>
          {greenShare !== null ? `${greenShare}% erneuerbar` : "—"}
        </span>
        {co2 !== null && (
          <span className="text-[10px] text-muted-foreground tabular-nums">{Math.round(co2)} g CO₂/kWh</span>
        )}
      </div>
    </div>
  );
}

export function EnergyOverviewCard() {
  const powerEntity = useEntity(ENTITIES.energy.power);
  const power = useEntityNumericState(ENTITIES.energy.power);
  const dailyCost = useEntityNumericState(ENTITIES.energy.dailyCost);
  const dailyConsumption = useEntityNumericState(ENTITIES.energy.dailyConsumption);
  const monthlyCost = useEntityNumericState(ENTITIES.energy.monthlyCost);
  const monthlyConsumption = useEntityNumericState(ENTITIES.energy.monthlyConsumption);

  const lastUpdated = powerEntity?.last_updated;
  const stale = isStale(lastUpdated);
  const agoText = useRelativeTime(lastUpdated);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Energie</CardTitle>
        <span className={`text-[11px] tabular-nums ${stale ? "text-orange-400" : "text-muted-foreground/60"}`}>
          {agoText}
        </span>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hero: Total Power */}
        <div>
          <span
            className={`display-num text-[56px] font-extralight leading-none ${stale ? "text-muted-foreground/50" : ""}`}
          >
            {formatPower(power)}
          </span>
          <p className="text-xs text-muted-foreground mt-2">Gesamtverbrauch</p>
        </div>

        {/* CO2 / Green Energy Badge */}
        <Co2Badge />

        {/* Individual Consumers */}
        <div className="space-y-2.5">
          <span className="text-[11px] uppercase tracking-[0.08em] font-medium text-muted-foreground/80">Verbraucher</span>
          {consumers.map((c) => (
            <ConsumerRow key={c.entity} entity={c.entity} name={c.name} />
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="surface-inset rounded-2xl px-4 py-3">
            <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground/80">Heute</span>
            <p className="mt-1.5 display-num text-[22px] font-semibold leading-none">{formatCurrency(dailyCost)}</p>
            <p className="text-xs text-muted-foreground tabular-nums mt-1">{formatEnergy(dailyConsumption)}</p>
          </div>
          <div className="surface-inset rounded-2xl px-4 py-3">
            <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground/80">Monat</span>
            <p className="mt-1.5 display-num text-[22px] font-semibold leading-none">{formatCurrency(monthlyCost)}</p>
            <p className="text-xs text-muted-foreground tabular-nums mt-1">{formatEnergy(monthlyConsumption)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
