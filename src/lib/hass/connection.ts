import {
  createConnection,
  createLongLivedTokenAuth,
  Connection,
  ERR_CANNOT_CONNECT,
  ERR_INVALID_AUTH,
} from "home-assistant-js-websocket";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

export async function connectToHA(): Promise<Connection> {
  const url = process.env.NEXT_PUBLIC_HASS_URL;
  const token = process.env.NEXT_PUBLIC_HASS_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing NEXT_PUBLIC_HASS_URL or NEXT_PUBLIC_HASS_TOKEN in environment variables"
    );
  }

  const auth = createLongLivedTokenAuth(url, token);

  try {
    const connection = await createConnection({ auth, setupRetry: -1 });
    return connection;
  } catch (err) {
    if (err === ERR_CANNOT_CONNECT) {
      throw new Error(`Cannot connect to Home Assistant at ${url}`);
    }
    if (err === ERR_INVALID_AUTH) {
      throw new Error("Invalid Home Assistant access token");
    }
    throw err;
  }
}
