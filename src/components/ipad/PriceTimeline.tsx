"use client";

import { useMemo } from "react";
import { useTibberPrices, type TibberPriceNode } from "@/lib/hooks/useTibberPrices";

const HOUR_MS = 3_600_000;

interface ProcessedHour {
  hour: number;
  total: number;
  startsAt: Date;
  isPast: boolean;
  isCurrent: boolean;
  isCheapest: boolean;
}

function process(today: TibberPriceNode[]): {
  hours: ProcessedHour[];
  min: number;
  max: number;
  avg: number;
} {
  if (today.length === 0) {
    return { hours: [], min: 0, max: 0, avg: 0 };
  }

  const now = new Date();
  const currentHourStart = new Date(now);
  currentHourStart.setMinutes(0, 0, 0);

  const totals = today.map((n) => n.total);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const avg = totals.reduce((s, x) => s + x, 0) / totals.length;

  // Indices of cheapest 3 future hours (incl. current)
  const cheapestSet = new Set<number>(
    today
      .map((n, i) => ({ i, total: n.total, t: new Date(n.startsAt).getTime() }))
      .filter((x) => x.t >= currentHourStart.getTime())
      .sort((a, b) => a.total - b.total)
      .slice(0, 3)
      .map((x) => x.i)
  );

  const hours: ProcessedHour[] = today.map((n, i) => {
    const startsAt = new Date(n.startsAt);
    const t = startsAt.getTime();
    return {
      hour: startsAt.getHours(),
      total: n.total,
      startsAt,
      isPast: t < currentHourStart.getTime(),
      isCurrent: t === currentHourStart.getTime(),
      isCheapest: cheapestSet.has(i),
    };
  });

  return { hours, min, max, avg };
}

function colorFor(total: number, min: number, max: number): string {
  if (max === min) return "oklch(0.6 0.16 145)";
  const q = (total - min) / (max - min);
  // green -> yellow -> red
  if (q < 0.5) {
    // green to yellow
    const t = q / 0.5;
    const hue = 145 - 55 * t; // 145 -> 90
    const chroma = 0.16 + 0.04 * t;
    return `oklch(0.72 ${chroma.toFixed(3)} ${hue.toFixed(0)})`;
  }
  const t = (q - 0.5) / 0.5;
  const hue = 90 - 65 * t; // 90 -> 25
  const chroma = 0.2 + 0.02 * t;
  return `oklch(${(0.72 - 0.04 * t).toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(0)})`;
}

function formatPrice(eurPerKwh: number): string {
  return `${(eurPerKwh * 100).toFixed(1)} ct`;
}

export function PriceTimeline() {
  const { today, tomorrow, loading, error } = useTibberPrices();
  const { hours, min, max, avg } = useMemo(() => process(today), [today]);
  const tomorrowAvailable = tomorrow.length > 0;
  const tomorrowAvg = tomorrowAvailable
    ? tomorrow.reduce((s, n) => s + n.total, 0) / tomorrow.length
    : null;

  const currentHour = hours.find((h) => h.isCurrent);

  return (
    <section className="surface-glass rounded-[var(--cockpit-radius-zone)] p-5 flex flex-col gap-3 min-h-0">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cockpit-ink-faint)]">
            Strompreise heute
          </h2>
          {currentHour && (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="display-num text-5xl font-medium text-[var(--cockpit-ink)]">
                {formatPrice(currentHour.total)}
              </span>
              <span className="text-sm text-[var(--cockpit-ink-dim)]">jetzt</span>
            </div>
          )}
        </div>
        <div className="text-right text-xs text-[var(--cockpit-ink-dim)] space-y-1">
          <div>
            Min <span className="text-[var(--cockpit-ink)] tabular-nums">{formatPrice(min)}</span> ·{" "}
            Ø <span className="text-[var(--cockpit-ink)] tabular-nums">{formatPrice(avg)}</span> ·{" "}
            Max <span className="text-[var(--cockpit-ink)] tabular-nums">{formatPrice(max)}</span>
          </div>
          {tomorrowAvg !== null && (
            <div>
              Morgen Ø <span className="text-[var(--cockpit-ink)] tabular-nums">{formatPrice(tomorrowAvg)}</span>
            </div>
          )}
        </div>
      </header>

      <div className="relative flex-1 flex items-stretch gap-[3px] min-h-[160px]">
        {loading && hours.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--cockpit-ink-dim)] text-sm">
            Lade Preise…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--system-red)] text-sm">
            {error}
          </div>
        )}
        {hours.map((h) => {
          const heightPct = max === min ? 50 : 18 + ((h.total - min) / (max - min)) * 78;
          return (
            <div
              key={h.startsAt.toISOString()}
              className="flex-1 flex flex-col justify-end items-center gap-1.5"
              title={`${h.hour}:00  ${formatPrice(h.total)}`}
            >
              {h.isCheapest && !h.isPast && (
                <span
                  className="block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "var(--cockpit-ink)" }}
                  aria-hidden
                />
              )}
              <div
                className="w-full rounded-md"
                style={{
                  height: `${heightPct}%`,
                  background: colorFor(h.total, min, max),
                  opacity: h.isPast ? 0.32 : 1,
                  boxShadow: h.isCurrent
                    ? `0 0 0 2px var(--cockpit-ink), 0 0 16px ${colorFor(h.total, min, max)}`
                    : undefined,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] tabular-nums text-[var(--cockpit-ink-faint)] tracking-wider px-1">
        {[0, 6, 12, 18, 23].map((h) => (
          <span key={h}>{String(h).padStart(2, "0")}</span>
        ))}
      </div>
    </section>
  );
}
