"use client";

import { useEffect, useState } from "react";
import { Cloud, Leaf, Settings } from "lucide-react";
import { useEntity, useEntityNumericState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";
import { SmartAlerts } from "./SmartAlerts";
import { ThemeToggle } from "./ThemeToggle";

const WEEKDAYS = ["SONNTAG", "MONTAG", "DIENSTAG", "MITTWOCH", "DONNERSTAG", "FREITAG", "SAMSTAG"];
const MONTHS = ["JANUAR", "FEBRUAR", "MÄRZ", "APRIL", "MAI", "JUNI", "JULI", "AUGUST", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DEZEMBER"];

const weatherDescriptions: Record<string, string> = {
  "clear-night": "klar",
  cloudy: "bedeckt",
  fog: "neblig",
  hail: "Hagel",
  lightning: "Gewitter",
  "lightning-rainy": "Gewitter mit Regen",
  partlycloudy: "wolkig",
  pouring: "Regen",
  rainy: "regnerisch",
  snowy: "Schnee",
  "snowy-rainy": "Schnee/Regen",
  sunny: "sonnig",
  windy: "windig",
  "windy-variant": "windig",
  exceptional: "ungewöhnlich",
};

function greetingFor(hour: number): string {
  if (hour < 5) return "Gute Nacht";
  if (hour < 11) return "Guten Morgen";
  if (hour < 14) return "Hallo";
  if (hour < 18) return "Guten Nachmittag";
  return "Guten Abend";
}

export function Header() {
  const [time, setTime] = useState<Date | null>(null);
  const weather = useEntity(ENTITIES.general.weather);
  const person = useEntity(ENTITIES.general.person);
  const fossil = useEntityNumericState(ENTITIES.energy.fossilShare);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const personName =
    (person?.attributes?.friendly_name as string | undefined)?.split(" ")[0] ?? "";

  const dateLine = time
    ? `${WEEKDAYS[time.getDay()]} · ${time.getDate()}. ${MONTHS[time.getMonth()]} ${time.getFullYear()} · ${time.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`
    : "—";

  const greeting = time
    ? `${greetingFor(time.getHours())}${personName ? `, ${personName}` : ""}.`
    : "Hallo.";

  const tempVal = weather?.attributes?.temperature as number | undefined;
  const weatherText = weather?.state ? weatherDescriptions[weather.state] ?? weather.state : null;
  const greenShare = fossil != null ? Math.max(0, Math.round(100 - fossil)) : null;
  const greenIsHigh = (greenShare ?? 0) >= 50;

  return (
    <div className="space-y-3">
      <header
        className="flex items-end justify-between gap-4 border-b pb-5"
        style={{ borderColor: "var(--cockpit-edge-soft)" }}
      >
        <div>
          <div
            className="text-[11px] font-medium uppercase tracking-[0.05em]"
            suppressHydrationWarning
            style={{ color: "var(--cockpit-ink-dim)" }}
          >
            {dateLine}
          </div>
          <h1
            className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.025em]"
            suppressHydrationWarning
            style={{ color: "var(--cockpit-ink)" }}
          >
            {greeting}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {greenShare != null && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{
                background: greenIsHigh
                  ? "color-mix(in oklch, var(--system-green) 14%, transparent)"
                  : "color-mix(in oklch, var(--system-yellow) 14%, transparent)",
                color: greenIsHigh ? "var(--system-green)" : "var(--system-yellow)",
                border: `1px solid color-mix(in oklch, ${greenIsHigh ? "var(--system-green)" : "var(--system-yellow)"} 28%, transparent)`,
              }}
            >
              <Leaf className="h-3 w-3" strokeWidth={2.2} />
              {greenShare}% grün
            </span>
          )}
          {tempVal != null && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{
                background: "var(--surface-1)",
                color: "var(--cockpit-ink-dim)",
                border: "1px solid var(--cockpit-edge-soft)",
              }}
            >
              <Cloud className="h-3 w-3" strokeWidth={2} />
              {Math.round(tempVal)}°{weatherText ? ` ${weatherText}` : ""}
            </span>
          )}
          <ThemeToggle />
          <button
            type="button"
            aria-label="Einstellungen"
            className="grid h-9 w-9 place-items-center rounded-[10px] border transition-colors"
            style={{
              border: "1px solid var(--cockpit-edge-soft)",
              background: "var(--surface-1)",
              color: "var(--cockpit-ink-dim)",
            }}
          >
            <Settings className="h-4 w-4" strokeWidth={1.9} />
          </button>
        </div>
      </header>
      <SmartAlerts />
    </div>
  );
}
