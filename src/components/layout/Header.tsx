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
  const [time, setTime] = useState(new Date());
  const weather = useEntity(ENTITIES.general.weather);
  const person = useEntity(ENTITIES.general.person);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const weatherIcon = weatherIcons[weather?.state ?? ""] ?? "🌤️";
  const temp = weather?.attributes?.temperature;
  const personState = person?.state === "home" ? "Zuhause" : "Unterwegs";
  const personName = person?.attributes?.friendly_name ?? "";

  return (
    <div className="space-y-2">
      <header className="flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{weatherIcon}</span>
            <div className="flex flex-col">
              <span className="text-xl font-semibold tracking-tight">
                {temp !== undefined ? formatTemperature(temp) : "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                {personName} · {personState}
              </span>
            </div>
          </div>
          <DoorIndicators />
        </div>

        <div className="flex items-center gap-5">
          <ConnectionStatus />
          <time className="text-3xl font-light tracking-tight tabular-nums text-foreground/80">
            {time.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
          </time>
        </div>
      </header>
      <SmartAlerts />
    </div>
  );
}
