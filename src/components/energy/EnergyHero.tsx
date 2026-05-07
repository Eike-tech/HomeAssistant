"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntity, useEntityNumericState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";
import { formatCurrency } from "@/lib/utils/formatters";

function timeAgo(iso: string | undefined): string {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 10) return "gerade eben";
  if (diff < 60) return `vor ${Math.round(diff)}s`;
  if (diff < 3600) return `vor ${Math.round(diff / 60)}min`;
  return `vor ${Math.round(diff / 3600)}h`;
}

function isStale(iso: string | undefined, thresholdMin = 5): boolean {
  if (!iso) return true;
  return (Date.now() - new Date(iso).getTime()) / 60000 > thresholdMin;
}

function useTick(interval = 10000) {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), interval);
    return () => clearInterval(id);
  }, [interval]);
}

function HeroNumber({ kw, stale }: { kw: number | null; stale: boolean }) {
  if (kw == null) {
    return (
      <span
        className="display-num leading-[0.9] text-[64px] font-light md:text-[88px]"
        style={{ color: "var(--cockpit-ink-faint)", letterSpacing: "-0.04em" }}
      >
        —
      </span>
    );
  }
  const showKw = kw >= 1;
  const value = showKw ? kw.toFixed(2).replace(".", ",") : Math.round(kw * 1000).toString();
  const unit = showKw ? "kW" : "W";
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="display-num leading-[0.9] text-[64px] font-light tabular-nums md:text-[88px]"
        style={{
          color: stale ? "var(--cockpit-ink-faint)" : "var(--cockpit-ink)",
          letterSpacing: "-0.04em",
        }}
      >
        {value}
      </span>
      <span
        className="text-[24px] font-light md:text-[28px]"
        style={{ color: "var(--cockpit-ink-dim)" }}
      >
        {unit}
      </span>
    </div>
  );
}

function Stat({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="min-w-0">
      <div
        className="text-[10px] font-medium uppercase tracking-[0.1em]"
        style={{ color: "var(--cockpit-ink-dim)" }}
      >
        {label}
      </div>
      <div
        className="mt-1 text-[22px] font-medium tabular-nums leading-tight"
        style={{ color: "var(--cockpit-ink)" }}
      >
        {primary}
      </div>
      <div
        className="font-mono text-[11px] tabular-nums"
        style={{ color: "var(--cockpit-ink-dim)" }}
      >
        {secondary}
      </div>
    </div>
  );
}

export function EnergyHero() {
  useTick(10000);
  const powerEntity = useEntity(ENTITIES.energy.power);
  const power = useEntityNumericState(ENTITIES.energy.power);
  const dailyCost = useEntityNumericState(ENTITIES.energy.dailyCost);
  const dailyKwh = useEntityNumericState(ENTITIES.energy.dailyConsumption);
  const monthlyCost = useEntityNumericState(ENTITIES.energy.monthlyCost);
  const monthlyKwh = useEntityNumericState(ENTITIES.energy.monthlyConsumption);
  const co2 = useEntityNumericState(ENTITIES.energy.co2Intensity);
  const fossil = useEntityNumericState(ENTITIES.energy.fossilShare);

  const stale = isStale(powerEntity?.last_updated);
  const ago = timeAgo(powerEntity?.last_updated);

  const fmtKwh = (v: number | null) =>
    v == null ? "—" : `${v.toFixed(1).replace(".", ",")} kWh`;
  const fmtCo2Sub = (v: number | null) =>
    v == null ? "g/kWh" : `${Math.round(v)}% fossil`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktueller Verbrauch</CardTitle>
        <span
          className="flex items-center gap-1.5 text-[11px] tabular-nums"
          style={{ color: stale ? "var(--signal-warn)" : "var(--cockpit-ink-dim)" }}
        >
          <span
            className="block h-1.5 w-1.5 rounded-full"
            style={{
              background: stale ? "var(--signal-warn)" : "var(--accent-live)",
              boxShadow: stale ? "none" : "0 0 0 3px var(--accent-live-glow)",
            }}
          />
          {stale ? `veraltet · ${ago}` : `live · ${ago}`}
        </span>
      </CardHeader>
      <CardContent className="space-y-7">
        <HeroNumber kw={power} stale={stale} />

        <div
          className="grid grid-cols-3 gap-4 border-t pt-5"
          style={{ borderColor: "var(--cockpit-edge-soft)" }}
        >
          <Stat
            label="Heute"
            primary={formatCurrency(dailyCost)}
            secondary={fmtKwh(dailyKwh)}
          />
          <Stat
            label="Diesen Monat"
            primary={formatCurrency(monthlyCost)}
            secondary={monthlyKwh != null ? `${Math.round(monthlyKwh)} kWh` : "—"}
          />
          <Stat
            label="CO₂ Intensität"
            primary={co2 != null ? `${Math.round(co2)}` : "—"}
            secondary={fmtCo2Sub(fossil)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
