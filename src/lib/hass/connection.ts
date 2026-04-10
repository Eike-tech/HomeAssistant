import {
  createConnection,
  createLongLivedTokenAuth,
  Connection,
  ERR_CANNOT_CONNECT,
  ERR_INVALID_AUTH,
} from "home-assistant-js-websocket";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

interface RuntimeConfig {
  hassUrl: string;
  hassToken: string;
  ingressPath: string;
}

let cachedConfig: RuntimeConfig | null = null;

async function loadConfig(): Promise<RuntimeConfig> {
  if (cachedConfig) return cachedConfig;

  // Resolve config.json relative to the current page path (works with Ingress prefix)
  const base = window.location.pathname.replace(/\/[^/]*$/, "");
  const res = await fetch(`${base}/config.json`);
  if (!res.ok) {
    throw new Error(`Failed to load config.json (${res.status}) — is the add-on running?`);
  }
  cachedConfig = await res.json();
  return cachedConfig!;
}

export async function connectToHA(): Promise<Connection> {
  const config = await loadConfig();

  if (!config.hassUrl || !config.hassToken) {
    throw new Error(
      "Missing hassUrl or hassToken in config.json — configure hass_token in add-on settings"
    );
  }

  const auth = createLongLivedTokenAuth(config.hassUrl, config.hassToken);

  try {
    const connection = await createConnection({ auth });
    return connection;
  } catch (err) {
    if (err === ERR_CANNOT_CONNECT) {
      throw new Error(`Cannot connect to Home Assistant at ${config.hassUrl}`);
    }
    if (err === ERR_INVALID_AUTH) {
      throw new Error("Invalid Home Assistant access token — create a new long-lived token");
    }
    throw err;
  }
}
