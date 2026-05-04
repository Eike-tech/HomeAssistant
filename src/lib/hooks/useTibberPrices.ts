"use client";

import { useEffect, useState } from "react";

export type TibberPriceLevel =
  | "VERY_CHEAP"
  | "CHEAP"
  | "NORMAL"
  | "EXPENSIVE"
  | "VERY_EXPENSIVE"
  | "NONE";

export interface TibberPriceNode {
  startsAt: string;
  total: number;
  energy: number;
  tax: number;
  level: TibberPriceLevel;
}

export interface TibberPricesData {
  today: TibberPriceNode[];
  tomorrow: TibberPriceNode[];
  loading: boolean;
  error: string | null;
}

const REFRESH_MS = 15 * 60 * 1000;

export function useTibberPrices(): TibberPricesData {
  const [state, setState] = useState<TibberPricesData>({
    today: [],
    tomorrow: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const base =
          typeof window !== "undefined"
            ? window.location.pathname.replace(/\/[^/]*$/, "")
            : "";
        const res = await fetch(`${base}/api/tibber/prices`, { cache: "no-store" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(`HTTP ${res.status} – ${body.error ?? res.statusText}`);
        }
        const json = (await res.json()) as { today: TibberPriceNode[]; tomorrow: TibberPriceNode[] };
        if (cancelled) return;
        setState({
          today: json.today ?? [],
          tomorrow: json.tomorrow ?? [],
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[useTibberPrices] load error:", err);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Fehler beim Laden",
        }));
      }
    }

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return state;
}
