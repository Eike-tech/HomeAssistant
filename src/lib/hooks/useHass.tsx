"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  Connection,
  subscribeEntities,
  HassEntities,
} from "home-assistant-js-websocket";
import { connectToHA, type ConnectionState } from "@/lib/hass/connection";

interface HassContextType {
  connection: Connection | null;
  entities: HassEntities;
  connectionState: ConnectionState;
  error: string | null;
}

const HassContext = createContext<HassContextType>({
  connection: null,
  entities: {},
  connectionState: "connecting",
  error: null,
});

export function HassProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [entities, setEntities] = useState<HassEntities>({});
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const connect = useCallback(async () => {
    try {
      setConnectionState("connecting");
      setError(null);

      const conn = await connectToHA();

      conn.addEventListener("ready", () => {
        setConnectionState("connected");
      });

      conn.addEventListener("disconnected", () => {
        setConnectionState("disconnected");
      });

      conn.addEventListener("reconnect-error", () => {
        setConnectionState("error");
      });

      unsubRef.current = subscribeEntities(conn, (ents) => {
        setEntities(ents);
      });

      setConnection(conn);
      setConnectionState("connected");
    } catch (err) {
      setConnectionState("error");
      setError(err instanceof Error ? err.message : "Unknown connection error");
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      unsubRef.current?.();
      connection?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <HassContext.Provider value={{ connection, entities, connectionState, error }}>
      {children}
    </HassContext.Provider>
  );
}

export function useHass() {
  return useContext(HassContext);
}
