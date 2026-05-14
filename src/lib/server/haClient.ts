// Server-only Home Assistant REST client.
//
// Resolution order for the base URL the Next.js server uses to talk to HA Core:
//   1. Supervisor core proxy (`http://supervisor/core/api`) when `SUPERVISOR_TOKEN` is
//      injected by the addon supervisor — this is the only path guaranteed to be
//      reachable from inside the addon container regardless of the user's HA URL setup.
//   2. Container-internal HA Core hostname (`http://homeassistant:8123/api`) with the
//      user-provided `hass_token` — works in any addon network because Docker DNS knows
//      the `homeassistant` hostname for HA Core. Used as a fallback when the supervisor
//      proxy isn't available (e.g. SUPERVISOR_TOKEN not in env).
//   3. Configured `HASS_URL` (last resort — only useful in local dev).
//
// `process.env[...]` with a bracketed key prevents Next.js' build-time tree shaker
// from inlining `undefined` when SUPERVISOR_TOKEN isn't set at build time.
//
// Every fetch has an 8 s budget via `AbortSignal.timeout` so that a flaky network
// degrades the iPad-legacy render to "empty cell" instead of hanging the full request
// (which used to crash the addon's healthcheck and trigger an endless watchdog restart).

// Top-level marker — proves to log inspection which haClient version actually loaded
// inside the container. If you don't see this in `addon logs`, the deployed image is
// not the one you think it is.
process.stdout.write(
  `[haClient] module loaded build=v1.18.2 supTok=${
    process.env["SUPERVISOR_TOKEN"] ? "yes" : "no"
  } hassTok=${process.env["HASS_TOKEN"] ? "yes" : "no"} hassUrl=${
    process.env["HASS_URL"] ?? "(unset)"
  }\n`
);

interface HassConfig {
  baseUrl: string;
  token: string;
  source: string;
}

let cachedConfig: HassConfig | null = null;
let loggedSource = false;

function resolveConfig(): HassConfig {
  if (cachedConfig) return cachedConfig;

  const supervisorToken = process.env["SUPERVISOR_TOKEN"];
  const hassToken = process.env["HASS_TOKEN"];
  const hassUrl = process.env["HASS_URL"];

  if (supervisorToken) {
    cachedConfig = {
      baseUrl: "http://supervisor/core/api",
      token: supervisorToken,
      source: "supervisor",
    };
  } else if (hassToken) {
    // Container-internal hostname first — addon network always knows `homeassistant`.
    // Only fall back to the configured HASS_URL if explicitly different (local dev).
    const isContainerInternalUrl =
      !hassUrl || /^http:\/\/(homeassistant|supervisor)(:\d+)?$/.test(hassUrl);
    cachedConfig = {
      baseUrl: isContainerInternalUrl
        ? "http://homeassistant:8123/api"
        : `${hassUrl!.replace(/\/$/, "")}/api`,
      token: hassToken,
      source: isContainerInternalUrl ? "ha-hostname" : "hass_url",
    };
  } else {
    throw new Error(
      "No HA token available — set SUPERVISOR_TOKEN (addon) or HASS_TOKEN (local dev)"
    );
  }

  if (!loggedSource) {
    console.log(`[haClient] base=${cachedConfig.baseUrl} source=${cachedConfig.source}`);
    loggedSource = true;
  }
  return cachedConfig;
}

const HA_FETCH_TIMEOUT_MS = 8000;

async function haFetch<T>(path: string): Promise<T> {
  const { baseUrl, token } = resolveConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(HA_FETCH_TIMEOUT_MS),
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

export interface HaForecastPoint {
  datetime: string;
  condition?: string;
  temperature?: number | null;
  templow?: number | null;
  precipitation?: number | null;
  precipitation_probability?: number | null;
  wind_speed?: number | null;
  humidity?: number | null;
}

/**
 * Calls weather.get_forecasts via REST (POST /api/services/weather/get_forecasts?return_response=true)
 * to retrieve a `daily` or `hourly` forecast. Modern HA no longer exposes `forecast` via the entity
 * state, so this service call is the only REST-friendly path.
 */
export async function fetchWeatherForecast(
  entityId: string,
  type: "daily" | "hourly" = "daily"
): Promise<HaForecastPoint[]> {
  try {
    const { baseUrl, token } = resolveConfig();
    const res = await fetch(`${baseUrl}/services/weather/get_forecasts?return_response=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entity_id: entityId, type }),
      cache: "no-store",
      signal: AbortSignal.timeout(HA_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      service_response?: Record<string, { forecast?: HaForecastPoint[] }>;
    };
    const fc = data?.service_response?.[entityId]?.forecast;
    return Array.isArray(fc) ? fc : [];
  } catch (err) {
    console.warn(`[haClient] forecast ${entityId} failed:`, err);
    return [];
  }
}
