"use client";

import { useEntityNumericState } from "@/lib/hooks/useEntity";

const POWER_ENTITY = "sensor.tibber_pulse_mount_cleltze_leistung";
const PRICE_ENTITY = "sensor.mount_cleltze_strompreis";
const COST_TODAY_ENTITY = "sensor.tibber_pulse_mount_cleltze_kumulierte_kosten";
const FEED_ENTITY = "sensor.tibber_pulse_mount_cleltze_einspeiseleistung";

function formatKw(watts: number | null): string {
  if (watts === null) return "—";
  if (Math.abs(watts) >= 1000) return `${(watts / 1000).toFixed(2)} kW`;
  return `${Math.round(watts)} W`;
}

export function LiveLoadCard() {
  const power = useEntityNumericState(POWER_ENTITY);
  const feed = useEntityNumericState(FEED_ENTITY);
  const price = useEntityNumericState(PRICE_ENTITY); // EUR/kWh
  const costToday = useEntityNumericState(COST_TODAY_ENTITY);

  // Live ct/h = current kW × current ct/kWh
  const liveCtPerHour =
    power !== null && price !== null ? (power / 1000) * (price * 100) : null;

  return (
    <section className="surface-glass rounded-[var(--cockpit-radius-zone)] p-5 flex flex-col justify-between gap-2 min-h-0">
      <header>
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cockpit-ink-faint)]">
          Live-Verbrauch
        </h2>
      </header>

      <div className="flex items-baseline gap-3">
        <span className="display-num text-6xl font-medium text-[var(--cockpit-ink)]">
          {power !== null ? (power / 1000).toFixed(2) : "—"}
        </span>
        <span className="text-2xl text-[var(--cockpit-ink-dim)]">kW</span>
        {liveCtPerHour !== null && (
          <span className="ml-auto text-base text-[var(--cockpit-ink-dim)] tabular-nums">
            ≈ {liveCtPerHour.toFixed(0)} ct/h
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between text-sm text-[var(--cockpit-ink-dim)]">
        <span>
          Kosten heute{" "}
          <span className="text-[var(--cockpit-ink)] tabular-nums">
            {costToday !== null ? `${costToday.toFixed(2)} €` : "—"}
          </span>
        </span>
        {feed !== null && feed > 0 && (
          <span>
            Einspeisung{" "}
            <span className="text-[var(--system-green)] tabular-nums">{formatKw(feed)}</span>
          </span>
        )}
      </div>
    </section>
  );
}
