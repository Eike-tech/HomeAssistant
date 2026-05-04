"use client";

import { useEffect, useState } from "react";
import { PriceTimeline } from "./PriceTimeline";
import { LiveLoadCard } from "./LiveLoadCard";
import { WasteCard } from "./WasteCard";
import { WeatherCard } from "./WeatherCard";
import { CalendarCard } from "./CalendarCard";

const DEFAULT_CALENDARS = ["calendar.family"];

function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useIpadCalendars(): string[] {
  const [list, setList] = useState<string[]>(DEFAULT_CALENDARS);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = window.location.pathname.replace(/\/[^/]*$/, "");
        const res = await fetch(`${base}/config.json`, { cache: "no-store" });
        if (!res.ok) return;
        const cfg = (await res.json()) as { ipadCalendarEntities?: string[] };
        if (!cancelled && Array.isArray(cfg.ipadCalendarEntities) && cfg.ipadCalendarEntities.length > 0) {
          setList(cfg.ipadCalendarEntities);
        }
      } catch {
        // keep defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return list;
}

export function IpadShell() {
  const now = useClock();
  const calendars = useIpadCalendars();

  const time = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main className="h-screen w-screen overflow-hidden p-5 grid gap-3 grid-cols-[2fr_1fr] grid-rows-[auto_minmax(0,2.4fr)_minmax(0,2fr)_minmax(0,2fr)]">
      <header className="col-span-2 flex items-end justify-between px-1">
        <div>
          <div className="display-num text-[64px] leading-none font-light text-[var(--cockpit-ink)]">
            {time}
          </div>
          <div className="text-sm text-[var(--cockpit-ink-dim)] capitalize mt-0.5">{date}</div>
        </div>
      </header>

      <PriceTimeline />
      <WeatherCard />

      <LiveLoadCard />
      <WasteCard />

      <div className="col-span-2 min-h-0">
        <CalendarCard entityIds={calendars} />
      </div>
    </main>
  );
}
