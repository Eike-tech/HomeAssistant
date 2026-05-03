"use client";

import { useMemo, useRef, useState } from "react";
import { useEntity } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";
import { interpolateAccent, formatOkLch } from "@/lib/utils/cockpitColor";

type Hour = {
  time: Date;
  price: number;       // ct/kWh
  /** local quantile 0..1 within the visible window — used for color */
  quantile: number;
  color: string;
};

type RawPriceItem = {
  start_time?: string;
  price_per_kwh?: number;
  price_eur_per_mwh?: number;
  price?: number;
};

function readPriceData(entity: ReturnType<typeof useEntity>): RawPriceItem[] {
  const attrs = entity?.attributes as { data?: unknown; marketdata?: unknown; prices?: unknown } | undefined;
  if (!attrs) return [];
  const candidate = attrs.data ?? attrs.marketdata ?? attrs.prices;
  return Array.isArray(candidate) ? (candidate as RawPriceItem[]) : [];
}

function parseRawPrice(item: RawPriceItem): number | null {
  const raw =
    item.price_per_kwh !== undefined
      ? Number(item.price_per_kwh)
      : item.price_eur_per_mwh !== undefined
        ? Number(item.price_eur_per_mwh) / 1000
        : Number(item.price ?? NaN);
  return Number.isFinite(raw) ? raw : null;
}

function buildHours(raw: RawPriceItem[]): Hour[] {
  if (raw.length === 0) return [];

  const now = new Date();
  const currentHourStart = new Date(now);
  currentHourStart.setMinutes(0, 0, 0);

  // From the current hour onwards, up to 24 entries
  const points = raw
    .map((item) => {
      const t = item.start_time ? new Date(item.start_time) : null;
      const eurPerKwh = parseRawPrice(item);
      if (!t || eurPerKwh === null) return null;
      return { time: t, price: eurPerKwh * 100 };
    })
    .filter((x): x is { time: Date; price: number } => x !== null)
    .filter((x) => x.time.getTime() >= currentHourStart.getTime())
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .slice(0, 24);

  if (points.length === 0) return [];

  // Local quantile = rank-based position within the visible window
  const sorted = [...points].sort((a, b) => a.price - b.price);
  const rankByPrice = new Map(sorted.map((p, i) => [p.price + p.time.getTime(), i]));

  return points.map((p) => {
    const rank = rankByPrice.get(p.price + p.time.getTime()) ?? 0;
    const quantile = points.length === 1 ? 0.5 : rank / (points.length - 1);
    const accent = interpolateAccent(quantile);
    return { time: p.time, price: p.price, quantile, color: formatOkLch(accent) };
  });
}

/** Build SVG path strings for the horizon line and its filled area. */
function buildPaths(hours: Hour[], minP: number, maxP: number, vbW: number, vbH: number) {
  if (hours.length === 0) return { line: "", area: "" };

  const padTop = 12;
  const padBottom = 6;
  const drawH = vbH - padTop - padBottom;
  const range = Math.max(0.1, maxP - minP);

  const points = hours.map((h, i) => {
    const x = hours.length === 1 ? vbW / 2 : (i / (hours.length - 1)) * vbW;
    const y = padTop + drawH * (1 - (h.price - minP) / range);
    return { x, y };
  });

  // Smooth Bezier through points (cubic with horizontal tangent thirds)
  let line = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) / 3;
    line += ` C ${(p0.x + dx).toFixed(2)},${p0.y.toFixed(2)} ${(p1.x - dx).toFixed(2)},${p1.y.toFixed(2)} ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
  }

  const area = `${line} L ${points[points.length - 1].x.toFixed(2)},${vbH} L ${points[0].x.toFixed(2)},${vbH} Z`;

  return { line, area };
}

export function SpotpreisHorizont() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const spotEntity = useEntity(ENTITIES.energy.spotPrice);
  const tibberEntity = useEntity(ENTITIES.energy.tibberPrice);

  // Prefer Tibber attributes if available, otherwise EPEX
  const hours = useMemo(() => {
    const tibberRaw = readPriceData(tibberEntity);
    const epexRaw = readPriceData(spotEntity);
    const built = buildHours(tibberRaw.length > 0 ? tibberRaw : epexRaw);
    return built;
  }, [spotEntity, tibberEntity]);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (hours.length === 0) {
    return (
      <Zone>
        <Header />
        <div
          className="flex h-[120px] items-center justify-center text-sm md:h-[200px]"
          style={{ color: "var(--cockpit-ink-faint)" }}
        >
          Keine Preisdaten verfügbar
        </div>
      </Zone>
    );
  }

  const minP = Math.min(...hours.map((h) => h.price));
  const maxP = Math.max(...hours.map((h) => h.price));
  const vbW = 1000;
  const vbH = 200;
  const paths = buildPaths(hours, minP, maxP, vbW, vbH);

  // Position of "now" — between hour 0 and hour 1 based on current minutes
  const now = new Date();
  const minutesIntoHour = now.getMinutes() / 60;
  const nowIndex = Math.min(hours.length - 1, 0 + minutesIntoHour);
  const nowX = hours.length === 1 ? vbW / 2 : (nowIndex / (hours.length - 1)) * vbW;

  // Y-position of nowPrice (interpolated between hours[0] and hours[1])
  const range = Math.max(0.1, maxP - minP);
  const padTop = 12;
  const padBottom = 6;
  const drawH = vbH - padTop - padBottom;
  const interpPrice =
    hours.length === 1
      ? hours[0].price
      : hours[0].price + (hours[1].price - hours[0].price) * minutesIntoHour;
  const nowY = padTop + drawH * (1 - (interpPrice - minP) / range);

  // Hour-tick markers (6h, 12h, 18h positions)
  const hourMarkers = [6, 12, 18].filter((h) => h < hours.length);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xRel = (e.clientX - rect.left) / rect.width;
    const idx = Math.max(0, Math.min(hours.length - 1, Math.round(xRel * (hours.length - 1))));
    setHoverIdx(idx);
  };

  const tip = hoverIdx !== null ? hours[hoverIdx] : null;
  const tipX = hoverIdx !== null && hours.length > 1 ? (hoverIdx / (hours.length - 1)) * 100 : 50;

  return (
    <Zone>
      <Header current={hours[0]} />

      <div
        ref={containerRef}
        className="relative h-[120px] w-full md:h-[200px]"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIdx(null)}
      >
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <linearGradient id="horizon-fill" x1="0" x2="1" y1="0" y2="0">
              {hours.map((h, i) => (
                <stop
                  key={i}
                  offset={hours.length === 1 ? "50%" : `${(i / (hours.length - 1)) * 100}%`}
                  stopColor={h.color}
                />
              ))}
            </linearGradient>
          </defs>

          {/* Hour-tick guide lines */}
          {hourMarkers.map((h) => {
            const x = hours.length === 1 ? vbW / 2 : (h / (hours.length - 1)) * vbW;
            return (
              <line
                key={h}
                x1={x}
                x2={x}
                y1={vbH * 0.85}
                y2={vbH}
                stroke="var(--cockpit-edge-soft)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          <path d={paths.area} fill="url(#horizon-fill)" fillOpacity={0.35} />
          <path
            d={paths.line}
            fill="none"
            stroke="url(#horizon-fill)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* "now" vertical line */}
          <line
            x1={nowX}
            x2={nowX}
            y1={0}
            y2={vbH}
            stroke="var(--accent-live)"
            strokeOpacity={0.45}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {/* hover line */}
          {hoverIdx !== null && hours.length > 1 && (
            <line
              x1={(hoverIdx / (hours.length - 1)) * vbW}
              x2={(hoverIdx / (hours.length - 1)) * vbW}
              y1={0}
              y2={vbH}
              stroke="var(--cockpit-ink-dim)"
              strokeOpacity={0.5}
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* "now" dot — pixel-circular, on top of stretched SVG */}
        <div
          aria-hidden
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${(nowX / vbW) * 100}%`,
            top: `${(nowY / vbH) * 100}%`,
            background: "var(--accent-live)",
            boxShadow: "0 0 12px var(--accent-live-glow)",
            animation: "card-in var(--motion-base) var(--ease-out)",
          }}
        />

        {/* tooltip */}
        {tip && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg px-2.5 py-1.5 text-[11px] tabular-nums backdrop-blur-md"
            style={{
              left: `${tipX}%`,
              top: 0,
              background: "oklch(0.18 0.01 240 / 0.85)",
              boxShadow: "inset 0 1px 0 var(--cockpit-edge-strong), 0 8px 20px oklch(0 0 0 / 0.4)",
              color: "var(--cockpit-ink)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "var(--cockpit-ink-dim)" }}>
              {tip.time.getHours().toString().padStart(2, "0")}:00 ·{" "}
            </span>
            <span className="font-mono" style={{ color: tip.color }}>
              {tip.price.toFixed(1).replace(".", ",")} ct
            </span>
          </div>
        )}
      </div>

      {/* Hour labels under the chart */}
      <div
        className="mt-2 hidden grid-cols-4 text-[10px] tabular-nums md:grid"
        style={{ color: "var(--cockpit-ink-faint)" }}
      >
        <span>{formatTimeLabel(hours[0]?.time, "now")}</span>
        <span className="text-center">{formatTimeLabel(hours[6]?.time, "+6h")}</span>
        <span className="text-center">{formatTimeLabel(hours[12]?.time, "+12h")}</span>
        <span className="text-right">{formatTimeLabel(hours[18]?.time, "+18h")}</span>
      </div>
    </Zone>
  );
}

function formatTimeLabel(t: Date | undefined, fallback: string) {
  if (!t) return fallback;
  return `${t.getHours().toString().padStart(2, "0")}:00`;
}

function Header({ current }: { current?: Hour }) {
  return (
    <div className="mb-3 flex items-center justify-between md:mb-4">
      <span
        className="text-[11px] font-medium uppercase tracking-[0.08em]"
        style={{ color: "var(--cockpit-ink-dim)" }}
      >
        Spotpreis Horizont 24h
      </span>
      {current && (
        <span
          className="font-mono text-sm tabular-nums"
          style={{ color: current.color }}
        >
          {current.price.toFixed(1).replace(".", ",")} ct/kWh
        </span>
      )}
    </div>
  );
}

function Zone({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        padding: "var(--cockpit-pad-zone)",
        borderRadius: "var(--cockpit-radius-zone)",
        background: `
          radial-gradient(120% 100% at 50% 0%, var(--accent-live-glow), transparent 60%),
          var(--cockpit-canvas-soft)
        `,
        boxShadow: "inset 0 1px 0 0 var(--cockpit-edge-soft)",
        transition: "background var(--motion-slow) var(--ease-out)",
      }}
    >
      {children}
    </section>
  );
}
