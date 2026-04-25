"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useHass } from "./useHass";
import { fetchStatistics } from "@/lib/hass/history";
import { resolveStatisticIds, type StatisticIdMap } from "@/lib/hass/resolveStatisticIds";
import { ENTITIES } from "@/lib/hass/entities";
import { getPeriodRange, type TimePeriod } from "./useHistoryData";

export interface StandbyPoint {
  date: string;
  label: string;
  watts: number;
}

export interface StandbyAnalysis {
  median: number;
  trendDelta: number; // second-half median - first-half median (W)
  points: StandbyPoint[];
  loading: boolean;
  error: string | null;
}

const POWER_KW_THRESHOLD = 1;

const empty: StandbyAnalysis = {
  median: 0,
  trendDelta: 0,
  points: [],
  loading: true,
  error: null,
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function useStandbyAnalysis(period: TimePeriod): StandbyAnalysis {
  const { connection } = useHass();
  const [data, setData] = useState<StandbyAnalysis>(empty);
  const resolvedIdsRef = useRef<StatisticIdMap | null>(null);

  const load = useCallback(async () => {
    if (!connection) return;
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      if (!resolvedIdsRef.current) {
        resolvedIdsRef.current = await resolveStatisticIds(connection, {
          power: ENTITIES.energy.power,
        });
      }
      const ids = resolvedIdsRef.current;

      const { start, end } = getPeriodRange(period);
      const stats = await fetchStatistics(connection, [ids.power], start, end, "day");
      const entries = stats[ids.power] ?? Object.values(stats)[0] ?? [];

      const points: StandbyPoint[] = entries.map((e) => {
        const startMs = typeof e.start === "string" ? new Date(e.start).getTime() : e.start * 1000;
        const d = new Date(startMs);
        let w = e.min ?? 0;
        if (Math.abs(w) <= POWER_KW_THRESHOLD) w *= 1000;
        return {
          date: d.toISOString().slice(0, 10),
          label: d.toLocaleDateString("de-DE", { day: "numeric", month: "short" }),
          watts: w,
        };
      });

      const watts = points.map((p) => p.watts);
      const overallMedian = median(watts);
      const half = Math.floor(watts.length / 2);
      const firstHalf = median(watts.slice(0, half));
      const secondHalf = median(watts.slice(half));
      const trendDelta = secondHalf - firstHalf;

      setData({
        median: overallMedian,
        trendDelta,
        points,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("[Auswertung] standby error:", err);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Fehler beim Laden",
      }));
    }
  }, [connection, period]);

  useEffect(() => {
    load();
  }, [load]);

  return data;
}
