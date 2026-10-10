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

// Shape returned by the `calendar.get_events` service: start/end are plain strings —
// ISO date-time for timed events, "YYYY-MM-DD" for all-day events.
interface RawCalendarEvent {
  summary?: string;
  start?: string;
  end?: string;
  location?: string;
  description?: string;
}

interface GetEventsResponse {
  response?: Record<string, { events?: RawCalendarEvent[] }>;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const REFRESH_MS = 10 * 60 * 1000;

function normalize(entityId: string, raw: RawCalendarEvent): CalendarEvent | null {
  if (!raw.start) return null;
  return {
    entityId,
    summary: raw.summary ?? "",
    start: raw.start,
    end: raw.end ?? raw.start,
    allDay: DATE_ONLY.test(raw.start),
    location: raw.location,
    description: raw.description,
  };
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

        // HA has no `calendar/list_events` WS command — use the get_events service with
        // return_response. One call covers all calendars; the response is keyed by entity.
        const result = await connection!.sendMessagePromise<GetEventsResponse>({
          type: "call_service",
          domain: "calendar",
          service: "get_events",
          target: { entity_id: ids },
          service_data: {
            start_date_time: start.toISOString(),
            end_date_time: end.toISOString(),
          },
          return_response: true,
        });
        for (const [entityId, cal] of Object.entries(result?.response ?? {})) {
          for (const raw of cal.events ?? []) {
            const ev = normalize(entityId, raw);
            if (ev) all.push(ev);
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
