"use client";

import { useEffect, useMemo, useState } from "react";
import { useHass } from "./useHass";

export interface CalendarEvent {
  entityId: string;
  summary: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
  location?: string;
  description?: string;
}

interface RawCalendarEvent {
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
}

const REFRESH_MS = 10 * 60 * 1000;

function normalize(entityId: string, raw: RawCalendarEvent): CalendarEvent | null {
  const summary = raw.summary ?? "";
  const startDateTime = raw.start?.dateTime;
  const startDate = raw.start?.date;
  const endDateTime = raw.end?.dateTime;
  const endDate = raw.end?.date;

  if (startDateTime) {
    return {
      entityId,
      summary,
      start: startDateTime,
      end: endDateTime ?? startDateTime,
      allDay: false,
      location: raw.location,
      description: raw.description,
    };
  }
  if (startDate) {
    return {
      entityId,
      summary,
      start: startDate,
      end: endDate ?? startDate,
      allDay: true,
      location: raw.location,
      description: raw.description,
    };
  }
  return null;
}

export function useCalendarEvents(
  entityIds: string[],
  daysAhead: number = 8
): { events: CalendarEvent[]; loading: boolean; error: string | null } {
  const { connection, connectionState } = useHass();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilize entityIds key so the effect doesn't re-fire on every render
  const idsKey = useMemo(() => entityIds.slice().sort().join("|"), [entityIds]);

  useEffect(() => {
    if (!connection || connectionState !== "connected" || !idsKey) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + daysAhead);

        const ids = idsKey.split("|").filter(Boolean);
        const all: CalendarEvent[] = [];

        for (const entityId of ids) {
          try {
            const result = await connection!.sendMessagePromise<RawCalendarEvent[]>({
              type: "calendar/list_events",
              entity_id: entityId,
              start: start.toISOString(),
              end: end.toISOString(),
            });
            for (const raw of result ?? []) {
              const ev = normalize(entityId, raw);
              if (ev) all.push(ev);
            }
          } catch (err) {
            console.warn(`[useCalendarEvents] ${entityId} failed:`, err);
          }
        }

        all.sort((a, b) => a.start.localeCompare(b.start));
        if (cancelled) return;
        setEvents(all);
        setLoading(false);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("[useCalendarEvents] error:", err);
        setError(err instanceof Error ? err.message : "Fehler beim Laden");
        setLoading(false);
      }
    }

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [connection, connectionState, idsKey, daysAhead]);

  return { events, loading, error };
}
