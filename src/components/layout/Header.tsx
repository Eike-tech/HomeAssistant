"use client";

import { useEffect, useState } from "react";
import { useEntity } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";
import { ConnectionStatus } from "./ConnectionStatus";
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
      </div>

      <div className="flex items-center gap-5">
        <ConnectionStatus />
        <time className="text-3xl font-light tracking-tight tabular-nums text-foreground/80">
          {time.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
        </time>
      </div>
    </header>
  );
}
