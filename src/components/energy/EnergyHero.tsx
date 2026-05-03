"use client";

import { useEntity, useEntityNumericState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";
import { formatCurrency, formatEnergy } from "@/lib/utils/formatters";

type EnergyHeroProps = {
  variant?: "dashboard" | "energie";
};

function formatHeroPower(kw: number | null): { value: string; unit: string } {
  if (kw === null) return { value: "—", unit: "" };
  if (kw < 10) {
    const w = Math.round(kw * 1000);
    return {
      value: new Intl.NumberFormat("de-DE", { useGrouping: true }).format(w),
      unit: "W",
    };
  }
  return {
    value: kw.toFixed(1).replace(".", ","),
    unit: "kW",
  };
}

function formatSpotCt(eurPerKwh: number | null): string {
  if (eurPerKwh === null) return "—";
  return `${(eurPerKwh * 100).toFixed(1).replace(".", ",")} ct/kWh`;
}

function isStale(isoString: string | undefined, thresholdMinutes = 5): boolean {
  if (!isoString) return true;
  return (Date.now() - new Date(isoString).getTime()) / 60000 > thresholdMinutes;
}

/** 5 pips that fill from the left as the spot-price quantile rises (cheap → expensive). */
function QuantilePips({ quantile }: { quantile: number | null }) {
  const lit = quantile === null ? 0 : Math.max(1, Math.min(5, Math.ceil(quantile * 5)));
  return (
    <div className="flex items-center gap-1" aria-label={`Preis-Rang ${lit} von 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="block h-1 w-3.5 rounded-full transition-colors duration-[var(--motion-base)]"
          style={{
            background: i < lit ? "var(--accent-live)" : "var(--cockpit-ink-faint)",
          }}
        />
      ))}
    </div>
  );
}

export function EnergyHero({ variant = "dashboard" }: EnergyHeroProps) {
  const powerEntity = useEntity(ENTITIES.energy.power);
  const power = useEntityNumericState(ENTITIES.energy.power);
  const dailyCost = useEntityNumericState(ENTITIES.energy.dailyCost);
  const dailyConsumption = useEntityNumericState(ENTITIES.energy.dailyConsumption);
  const spotPrice = useEntityNumericState(ENTITIES.energy.spotPrice);
  const quantile = useEntityNumericState(ENTITIES.energy.spotQuantile);

  const stale = isStale(powerEntity?.last_updated);
  const { value: powerValue, unit: powerUnit } = formatHeroPower(power);

  return (
    <section
      className="relative overflow-hidden"
      style={{
        padding: "var(--cockpit-pad-zone)",
        borderRadius: "var(--cockpit-radius-zone)",
        background: `
          radial-gradient(140% 110% at 50% -30%, var(--accent-live-glow), transparent 65%),
          var(--cockpit-canvas-soft)
        `,
        boxShadow: "inset 0 1px 0 0 var(--cockpit-edge-strong)",
        transition: "background var(--motion-slow) var(--ease-out)",
      }}
      data-variant={variant}
    >
      {/* Top caption row */}
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.08em]"
          style={{ color: "var(--cockpit-ink-dim)" }}
        >
          Aktueller Verbrauch
        </span>
        <span
          className="flex items-center gap-1.5 text-[11px] tabular-nums"
          style={{ color: stale ? "var(--signal-warn)" : "var(--cockpit-ink-faint)" }}
        >
          <span
            className="block h-1.5 w-1.5 rounded-full"
            style={{
              background: stale ? "var(--signal-warn)" : "var(--accent-live)",
              boxShadow: stale ? "none" : "0 0 8px var(--accent-live-glow)",
            }}
          />
          {stale ? "veraltet" : "live"}
        </span>
      </div>

      {/* Hero — power */}
      <div className="mt-6 flex items-baseline gap-2 md:mt-10 md:gap-3">
        <span
          className="display-num font-light leading-[0.9] text-[72px] md:text-[128px]"
          style={{
            color: stale ? "var(--cockpit-ink-faint)" : "var(--cockpit-ink)",
            letterSpacing: "-0.04em",
          }}
        >
          {powerValue}
        </span>
        {powerUnit && (
          <span
            className="display-num text-[28px] md:text-[40px] font-light leading-none"
            style={{ color: "var(--cockpit-ink-dim)" }}
          >
            {powerUnit}
          </span>
        )}
      </div>

      {/* Spot price + ranking row */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 md:mt-6">
        <div
          className="flex items-center gap-2 text-sm tabular-nums"
          style={{ color: "var(--cockpit-ink)", fontVariantNumeric: "tabular-nums" }}
        >
          <span style={{ color: "var(--cockpit-ink-dim)" }}>Spot</span>
          <span className="font-mono">{formatSpotCt(spotPrice)}</span>
        </div>
        <QuantilePips quantile={quantile} />
      </div>

      {/* Bottom stats row */}
      <div
        className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-4 md:mt-8"
        style={{ borderColor: "var(--cockpit-edge-soft)" }}
      >
        <Stat label="Heute" value={formatCurrency(dailyCost)} />
        <Divider />
        <Stat label="Verbrauch" value={formatEnergy(dailyConsumption)} mono />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="text-[10px] font-medium uppercase tracking-[0.08em]"
        style={{ color: "var(--cockpit-ink-dim)" }}
      >
        {label}
      </span>
      <span
        className={`text-base tabular-nums ${mono ? "font-mono" : ""}`}
        style={{ color: "var(--cockpit-ink)" }}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <span
      className="hidden h-3 w-px md:block"
      style={{ background: "var(--cockpit-edge-strong)" }}
      aria-hidden
    />
  );
}
