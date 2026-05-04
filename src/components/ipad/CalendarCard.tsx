"use client";

import { useMemo } from "react";
import { useCalendarEvents, type CalendarEvent } from "@/lib/hooks/useCalendarEvents";

interface DayGroup {
  key: string;
  date: Date;
  isToday: boolean;
  isTomorrow: boolean;
  events: CalendarEvent[];
}

function localKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startKey(ev: CalendarEvent): string {
  if (ev.allDay) return ev.start.slice(0, 10);
  return localKey(new Date(ev.start));
}

function formatDayLabel(date: Date, isToday: boolean, isTomorrow: boolean): string {
  if (isToday) return "Heute";
  if (isTomorrow) return "Morgen";
  return date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "short" });
}

function formatTime(ev: CalendarEvent): string {
  if (ev.allDay) return "ganztägig";
  const start = new Date(ev.start);
  const end = new Date(ev.end);
  const hh = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${hh(start)}–${hh(end)}`;
}

interface CalendarCardProps {
  entityIds: string[];
}

export function CalendarCard({ entityIds }: CalendarCardProps) {
  const { events, loading, error } = useCalendarEvents(entityIds, 8);

  const groups = useMemo<DayGroup[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayKey = localKey(today);
    const tomorrowKey = localKey(tomorrow);

    const byKey = new Map<string, DayGroup>();
    for (const ev of events) {
      const k = startKey(ev);
      let group = byKey.get(k);
      if (!group) {
        const [y, m, d] = k.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        group = {
          key: k,
          date,
          isToday: k === todayKey,
          isTomorrow: k === tomorrowKey,
          events: [],
        };
        byKey.set(k, group);
      }
      group.events.push(ev);
    }

    return Array.from(byKey.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(0, 5);
  }, [events]);

  return (
    <section className="surface-glass rounded-[var(--cockpit-radius-zone)] p-5 flex flex-col gap-3 h-full min-h-0">
      <header className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cockpit-ink-faint)]">
          Kalender
        </h2>
        {entityIds.length === 0 && (
          <span className="text-xs text-[var(--cockpit-ink-faint)]">keine Kalender konfiguriert</span>
        )}
      </header>

      {loading && groups.length === 0 && (
        <div className="text-sm text-[var(--cockpit-ink-dim)]">Lade Termine…</div>
      )}
      {error && (
        <div className="text-sm text-[var(--system-red)]">{error}</div>
      )}
      {!loading && groups.length === 0 && !error && entityIds.length > 0 && (
        <div className="text-sm text-[var(--cockpit-ink-dim)]">Keine Termine in den nächsten 8 Tagen.</div>
      )}

      <div className="grid grid-cols-5 gap-3 flex-1 min-h-0">
        {groups.map((g) => (
          <div
            key={g.key}
            className={
              "rounded-2xl p-3 flex flex-col gap-2 min-w-0 " +
              (g.isToday ? "bg-[oklch(1_0_0_/_0.08)]" : "surface-inset")
            }
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={
                  "text-xs font-medium uppercase tracking-wider truncate " +
                  (g.isToday ? "text-[var(--cockpit-ink)]" : "text-[var(--cockpit-ink-dim)]")
                }
              >
                {formatDayLabel(g.date, g.isToday, g.isTomorrow)}
              </span>
              <span className="text-[10px] text-[var(--cockpit-ink-faint)] tabular-nums">
                {String(g.date.getDate()).padStart(2, "0")}.{String(g.date.getMonth() + 1).padStart(2, "0")}
              </span>
            </div>
            <ul className="flex flex-col gap-1.5 overflow-hidden">
              {g.events.slice(0, 4).map((ev, i) => (
                <li key={`${ev.start}-${i}`} className="text-xs leading-snug">
                  <div className="text-[var(--cockpit-ink)] truncate">{ev.summary || "(ohne Titel)"}</div>
                  <div className="text-[10px] text-[var(--cockpit-ink-faint)] tabular-nums">
                    {formatTime(ev)}
                  </div>
                </li>
              ))}
              {g.events.length > 4 && (
                <li className="text-[10px] text-[var(--cockpit-ink-faint)]">
                  +{g.events.length - 4} weitere
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
