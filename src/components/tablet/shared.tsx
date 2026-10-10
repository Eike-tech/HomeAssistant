"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { callService } from "home-assistant-js-websocket";
import { useHass } from "@/lib/hooks/useHass";

// ─── Formatting ────────────────────────────────────────────────

export function num(entity: HassEntity | null | undefined): number | null {
  if (!entity) return null;
  const n = parseFloat(entity.state);
  return Number.isFinite(n) ? n : null;
}

export function fmt(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function hhmm(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Watt value of a power sensor, honouring kW/W units. */
export function watts(entity: HassEntity | null | undefined): number | null {
  const v = num(entity);
  if (v === null) return null;
  const unit = String(entity?.attributes?.unit_of_measurement ?? "W");
  return unit.toLowerCase() === "kw" ? v * 1000 : v;
}

// ─── Clock ─────────────────────────────────────────────────────

export function useNow(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ─── Service calls ─────────────────────────────────────────────

export function useService() {
  const { connection } = useHass();
  return (domain: string, service: string, data: Record<string, unknown>) => {
    if (!connection) return Promise.resolve();
    return callService(connection, domain, service, data).catch((err) => {
      console.error(`[tablet] ${domain}.${service} failed`, err);
    });
  };
}

// ─── Primitives ────────────────────────────────────────────────

export function Caption({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="tc-caption" style={style}>
      {children}
    </div>
  );
}

// ─── Icons (stroke, currentColor) ──────────────────────────────

type IconProps = { size?: number; strokeWidth?: number; style?: CSSProperties };

function Svg({ size = 24, strokeWidth = 1.6, style, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  cloud: (p: IconProps) => (
    <Svg {...p}>
      <path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 11.1 3.5 3.5 0 0 0 7 18z" />
    </Svg>
  ),
  rain: (p: IconProps) => (
    <Svg {...p}>
      <path d="M7 16h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 9.1 3.5 3.5 0 0 0 7 16z" />
      <path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2" />
    </Svg>
  ),
  sun: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  ),
  partly: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="9" cy="9" r="3" />
      <path d="M9 3v1M3 9h1M4.8 4.8l.7.7M13.2 4.8l-.7.7" />
      <path d="M10 18h8a3.5 3.5 0 0 0 .4-6.97A5 5 0 0 0 9.2 12.2 3 3 0 0 0 10 18z" />
    </Svg>
  ),
  moon: (p: IconProps) => (
    <Svg {...p}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </Svg>
  ),
  snow: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
    </Svg>
  ),
  fog: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 9h16M3 13h18M5 17h14" />
    </Svg>
  ),
  storm: (p: IconProps) => (
    <Svg {...p}>
      <path d="M7 15h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 8.1 3.5 3.5 0 0 0 7 15z" />
      <path d="M12 15l-2 4h4l-2 4" />
    </Svg>
  ),
  wind: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3" />
    </Svg>
  ),
  lock: (p: IconProps) => (
    <Svg {...p}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  ),
  unlock: (p: IconProps) => (
    <Svg {...p}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-2" />
    </Svg>
  ),
  plug: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" />
    </Svg>
  ),
  up: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 15l6-6 6 6" />
    </Svg>
  ),
  down: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  ),
  minus: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 12h12" />
    </Svg>
  ),
  prev: (p: IconProps) => (
    <Svg {...p}>
      <path d="M19 20L9 12l10-8z" />
      <path d="M5 19V5" />
    </Svg>
  ),
  next: (p: IconProps) => (
    <Svg {...p}>
      <path d="M5 4l10 8-10 8z" />
      <path d="M19 5v14" />
    </Svg>
  ),
  play: (p: IconProps) => (
    <Svg {...p}>
      <path d="M7 4l13 8-13 8z" fill="currentColor" />
    </Svg>
  ),
  pause: (p: IconProps) => (
    <Svg {...p}>
      <path d="M8 5v14M16 5v14" strokeWidth={3} />
    </Svg>
  ),
  music: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </Svg>
  ),
  volume: (p: IconProps) => (
    <Svg {...p}>
      <path d="M11 5L6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </Svg>
  ),
  auto: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" />
    </Svg>
  ),
};

const CONDITION_ICON: Record<string, keyof typeof Icon> = {
  "clear-night": "moon",
  cloudy: "cloud",
  fog: "fog",
  hail: "snow",
  lightning: "storm",
  "lightning-rainy": "storm",
  partlycloudy: "partly",
  pouring: "rain",
  rainy: "rain",
  snowy: "snow",
  "snowy-rainy": "snow",
  sunny: "sun",
  windy: "wind",
  "windy-variant": "wind",
};

const CONDITION_LABEL: Record<string, string> = {
  "clear-night": "Klar",
  cloudy: "Bedeckt",
  fog: "Nebel",
  hail: "Hagel",
  lightning: "Gewitter",
  "lightning-rainy": "Gewitter",
  partlycloudy: "Teils bewölkt",
  pouring: "Starkregen",
  rainy: "Regen",
  snowy: "Schnee",
  "snowy-rainy": "Schneeregen",
  sunny: "Sonnig",
  windy: "Windig",
  "windy-variant": "Windig",
  exceptional: "Unwetter",
};

export function WeatherIcon({ condition, ...p }: IconProps & { condition: string | null | undefined }) {
  const key = (condition && CONDITION_ICON[condition]) || "cloud";
  const C = Icon[key];
  return <C {...p} />;
}

export function conditionLabel(condition: string | null | undefined): string {
  if (!condition) return "—";
  return CONDITION_LABEL[condition] ?? condition;
}
