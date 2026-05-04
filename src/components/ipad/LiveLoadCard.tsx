"use client";

import { useEntityNumericState } from "@/lib/hooks/useEntity";

const POWER_ENTITY = "sensor.tibber_pulse_mount_cleltze_leistung"; // kW
const PRICE_ENTITY = "sensor.mount_cleltze_strompreis"; // EUR/kWh
const COST_TODAY_ENTITY = "sensor.tibber_pulse_mount_cleltze_kumulierte_kosten";
const FEED_ENTITY = "sensor.tibber_pulse_mount_cleltze_einspeiseleistung"; // W

function formatFeed(watts: number | null): string {
  if (watts === null) return "—";
  if (Math.abs(watts) >= 1000) return `${(watts / 1000).toFixed(2)} kW`;
  return `${Math.round(watts)} W`;
}

export function LiveLoadCard() {
  const power = useEntityNumericState(POWER_ENTITY);
  const feed = useEntityNumericState(FEED_ENTITY);
  const price = useEntityNumericState(PRICE_ENTITY);
  const costToday = useEntityNumericState(COST_TODAY_ENTITY);

  const liveCtPerHour =
    power !== null && price !== null ? power * (price * 100) : null;

  return (
    <section className="surface-glass rounded-[var(--cockpit-radius-zone)] p-5 flex flex-col gap-2 min-h-0">
      <header className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cockpit-ink-faint)]">
          Live-Verbrauch
        </h2>
        {feed !== null && feed > 0 && (
          <span className="text-xs text-[var(--cockpit-ink-dim)]">
            Einspeisung{" "}
            <span className="text-[var(--system-green)] tabular-nums">{formatFeed(feed)}</span>
          </span>
        )}
      </header>

      <div className="flex items-baseline gap-3">
        <span className="display-num text-6xl font-medium text-[var(--cockpit-ink)]">
          {power !== null ? power.toFixed(2) : "—"}
        </span>
        <span className="text-2xl text-[var(--cockpit-ink-dim)]">kW</span>
        {liveCtPerHour !== null && (
          <span className="ml-auto text-base text-[var(--cockpit-ink-dim)] tabular-nums">
            ≈ {liveCtPerHour.toFixed(0)} ct/h
          </span>
        )}
      </div>

      <div className="text-base text-[var(--cockpit-ink-dim)]">
        Kosten heute{" "}
        <span className="text-[var(--cockpit-ink)] tabular-nums ml-1">
          {costToday !== null ? `${costToday.toFixed(2)} €` : "—"}
        </span>
      </div>
    </section>
  );
}
