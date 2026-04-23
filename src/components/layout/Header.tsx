"use client";

import { useEffect, useState } from "react";
import { useEntity } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";
import { ConnectionStatus } from "./ConnectionStatus";
import { SmartAlerts } from "./SmartAlerts";
import { formatTemperature } from "@/lib/utils/formatters";

const weatherIcons: Record<string, string> = {
  "clear-night": "🌙",
  cloudy: "☁️",
  fog: "🌫️",
  hail: "🌨️",
  lightning: "⚡",
  "lightning-rainy": "⛈️",
  partlycloudy: "⛅",
  pouring: "🌧️",
  rainy: "🌧️",
  snowy: "❄️",
  "snowy-rainy": "🌨️",
  sunny: "☀️",
  windy: "💨",
  "windy-variant": "💨",
  exceptional: "⚠️",
};

function DoorIndicators() {
  const doorBuero = useEntity(ENTITIES.general.doorBuero);
  const doorWohnzimmer = useEntity(ENTITIES.general.doorWohnzimmer);
  const doorSchlafzimmer = useEntity(ENTITIES.general.doorSchlafzimmer);
  const doorBad = useEntity(ENTITIES.general.doorBad);

  const doors = [
    { entity: doorBuero, label: "Büro" },
    { entity: doorWohnzimmer, label: "Wohnzimmer" },
    { entity: doorSchlafzimmer, label: "Schlafzimmer" },
    { entity: doorBad, label: "Bad" },
  ];

  const anyOpen = doors.some((d) => d.entity?.state === "on");
  if (!doorBuero && !doorWohnzimmer && !doorSchlafzimmer && !doorBad) return null;

  return (
    <div className="flex items-center gap-1.5">
      {doors.map((d, i) => {
        const isOpen = d.entity?.state === "on";
        return (
          <div
            key={i}
            title={`${d.label}: ${isOpen ? "Offen" : "Geschlossen"}`}
            className={`h-2 w-2 rounded-full transition-colors ${
              isOpen ? "bg-red-400 animate-pulse" : "bg-green-400/60"
            }`}
          />
        );
      })}
      {anyOpen && <span className="text-[10px] text-red-400 font-medium ml-0.5">Offen</span>}
    </div>
  );
}

export function Header() {
  const [time, setTime] = useState<Date | null>(null);
  const weather = useEntity(ENTITIES.general.weather);
  const person = useEntity(ENTITIES.general.person);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const weatherIcon = weatherIcons[weather?.state ?? ""] ?? "🌤️";
  const temp = weather?.attributes?.temperature;
  const personState = person?.state === "home" ? "Zuhause" : "Unterwegs";
  const personName = person?.attributes?.friendly_name ?? "";

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between px-1 py-2">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-3 rounded-full pl-2 pr-4 py-1.5"
            style={{
              background: "linear-gradient(180deg, oklch(1 0 0 / 0.06), oklch(1 0 0 / 0.02))",
              boxShadow: "inset 0 1px 0 0 oklch(1 0 0 / 0.08), inset 0 0 0 1px oklch(1 0 0 / 0.04)",
              backdropFilter: "blur(18px) saturate(140%)",
              WebkitBackdropFilter: "blur(18px) saturate(140%)",
            }}
          >
            <span className="text-2xl leading-none">{weatherIcon}</span>
            <div className="flex flex-col">
              <span className="text-[17px] font-semibold tracking-tight leading-tight">
                {temp !== undefined ? formatTemperature(temp) : "—"}
              </span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                {personName ? `${personName} · ${personState}` : personState}
              </span>
            </div>
          </div>
          <DoorIndicators />
        </div>

        <div className="flex items-center gap-5">
          <ConnectionStatus />
          <time
            suppressHydrationWarning
            className="display-num text-[40px] font-extralight leading-none text-foreground/90"
          >
            {time ? time.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "\u2014"}
          </time>
        </div>
      </header>
      <SmartAlerts />
    </div>
  );
}
