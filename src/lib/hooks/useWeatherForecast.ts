"use client";

import { useEffect, useState } from "react";
import { useHass } from "./useHass";

export interface WeatherForecastPoint {
  datetime: string;
  condition: string;
  temperature: number | null;
  precipitation?: number | null;
  precipitation_probability?: number | null;
  wind_speed?: number | null;
  cloud_coverage?: number | null;
}

interface SubscribeResponse {
  type: "hourly" | "daily" | "twice_daily";
  forecast: WeatherForecastPoint[];
}

export function useWeatherForecast(
  entityId: string,
  forecastType: "hourly" | "daily" = "hourly"
): { forecast: WeatherForecastPoint[]; error: string | null } {
  const { connection, connectionState } = useHass();
  const [forecast, setForecast] = useState<WeatherForecastPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connection || connectionState !== "connected") return;

    let unsub: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        unsub = await connection.subscribeMessage<SubscribeResponse>(
          (msg) => {
            if (cancelled) return;
            setForecast(msg.forecast ?? []);
          },
          {
            type: "weather/subscribe_forecast",
            forecast_type: forecastType,
            entity_id: entityId,
          }
        );
      } catch (err) {
        if (cancelled) return;
        console.error("[useWeatherForecast] subscribe error:", err);
        setError(err instanceof Error ? err.message : "Forecast unavailable");
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [connection, connectionState, entityId, forecastType]);

  return { forecast, error };
}
