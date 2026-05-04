// Server-only Home Assistant REST client.
// Inside the add-on container, prefers the Supervisor core-proxy (`http://supervisor/core/api`)
// with the auto-injected SUPERVISOR_TOKEN. Outside (local dev), falls back to HASS_URL +
// HASS_TOKEN.

interface HassConfig {
  baseUrl: string;
  token: string;
}

function resolveConfig(): HassConfig {
  const supervisorToken = process.env.SUPERVISOR_TOKEN;
  if (supervisorToken) {
    return { baseUrl: "http://supervisor/core/api", token: supervisorToken };
  }
  const hassUrl = process.env.HASS_URL;
  const hassToken = process.env.HASS_TOKEN;
  if (!hassUrl || !hassToken) {
    throw new Error(
      "Neither SUPERVISOR_TOKEN nor HASS_URL+HASS_TOKEN configured for server-side HA calls"
    );
  }
  return { baseUrl: `${hassUrl.replace(/\/$/, "")}/api`, token: hassToken };
}

async function haFetch<T>(path: string): Promise<T> {
  const { baseUrl, token } = resolveConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`HA ${path}: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface HaState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export async function fetchHaState(entityId: string): Promise<HaState | null> {
  try {
    return await haFetch<HaState>(`/states/${entityId}`);
  } catch (err) {
    console.warn(`[haClient] state ${entityId} failed:`, err);
    return null;
  }
}

export async function fetchHaStates(entityIds: string[]): Promise<Record<string, HaState | null>> {
  const results = await Promise.all(entityIds.map((id) => fetchHaState(id)));
  return Object.fromEntries(entityIds.map((id, i) => [id, results[i]]));
}

export interface HaCalendarEvent {
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
}

export async function fetchHaCalendarEvents(
  entityId: string,
  start: Date,
  end: Date
): Promise<HaCalendarEvent[]> {
  try {
    const path = `/calendars/${entityId}?start=${encodeURIComponent(
      start.toISOString()
    )}&end=${encodeURIComponent(end.toISOString())}`;
    const events = await haFetch<HaCalendarEvent[]>(path);
    return events ?? [];
  } catch (err) {
    console.warn(`[haClient] calendar ${entityId} failed:`, err);
    return [];
  }
}
