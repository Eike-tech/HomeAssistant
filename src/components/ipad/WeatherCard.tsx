"use client";

import { useMemo } from "react";
import { useEntity } from "@/lib/hooks/useEntity";
import { useWeatherForecast } from "@/lib/hooks/useWeatherForecast";

const WEATHER_ENTITY = "weather.forecast_home";

const CONDITION_GLYPH: Record<string, string> = {
  "clear-night": "🌙",
  cloudy: "☁︎",
  fog: "🌫",
  hail: "🌨",
  lightning: "⚡︎",
  "lightning-rainy": "⛈",
  partlycloudy: "⛅︎",
  pouring: "🌧",
  rainy: "🌦",
  snowy: "❄︎",
  "snowy-rainy": "🌨",
  sunny: "☀︎",
  windy: "🌬",
  "windy-variant": "🌬",
  exceptional: "✦",
};

function glyph(condition: string | null | undefined): string {
  if (!condition) return "·";
  return CONDITION_GLYPH[condition] ?? "·";
}

export function WeatherCard() {
  const entity = useEntity(WEATHER_ENTITY);
  const { forecast } = useWeatherForecast(WEATHER_ENTITY, "hourly");

  const tempNow =
    typeof entity?.attributes?.temperature === "number"
      ? (entity.attributes.temperature as number)
      : null;
  const condition = entity?.state ?? null;

  const next6 = useMemo(() => {
    const now = Date.now();
    return forecast
      .filter((p) => new Date(p.datetime).getTime() >= now - 30 * 60 * 1000)
      .slice(0, 6);
  }, [forecast]);

  return (
    <section className="surface-glass rounded-[var(--cockpit-radius-zone)] p-5 flex flex-col gap-3 min-h-0">
      <header>
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cockpit-ink-faint)]">
          Wetter
        </h2>
      </header>

      <div className="flex items-center gap-4">
        <span className="text-5xl leading-none" aria-hidden>
          {glyph(condition)}
        </span>
        <div className="flex flex-col">
          <span className="display-num text-5xl font-medium text-[var(--cockpit-ink)]">
            {tempNow !== null ? `${Math.round(tempNow)}°` : "—"}
          </span>
          <span className="text-xs text-[var(--cockpit-ink-dim)] capitalize">
            {condition ? condition.replace(/-/g, " ") : ""}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1.5 mt-1">
        {next6.length === 0 &&
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="surface-inset rounded-xl py-2.5 px-1.5 text-center text-[var(--cockpit-ink-faint)] text-base"
            >
              —
            </div>
          ))}
        {next6.map((p) => {
          const d = new Date(p.datetime);
          return (
            <div
              key={p.datetime}
              className="surface-inset rounded-xl py-2.5 px-1.5 flex flex-col items-center gap-1"
            >
              <span className="text-sm text-[var(--cockpit-ink-dim)] tabular-nums">
                {String(d.getHours()).padStart(2, "0")}
              </span>
              <span className="text-lg leading-none" aria-hidden>
                {glyph(p.condition)}
              </span>
              <span className="text-base text-[var(--cockpit-ink)] tabular-nums">
                {p.temperature !== null && p.temperature !== undefined
                  ? `${Math.round(p.temperature)}°`
                  : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
