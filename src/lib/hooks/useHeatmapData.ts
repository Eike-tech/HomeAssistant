"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useHass } from "./useHass";
import { fetchStatistics } from "@/lib/hass/history";
import { resolveStatisticIds, type StatisticIdMap } from "@/lib/hass/resolveStatisticIds";
import { ENTITIES } from "@/lib/hass/entities";

export interface HeatmapData {
  /** 7×24 matrix: bins[weekday][hour] = avg power (W). Monday = 0, Sunday = 6. */
  bins: number[][];
  min: number;
  max: number;
  loading: boolean;
  error: string | null;
}

const HEATMAP_DAYS = 30;
const POWER_KW_THRESHOLD = 1; // values <= 1 are kW (Tibber Pulse), values > 1 are W

const empty: HeatmapData = {
  bins: Array.from({ length: 7 }, () => Array(24).fill(0)),
  min: 0,
  max: 0,
  loading: true,
  error: null,
};

export function useHeatmapData(): HeatmapData {
  const { connection } = useHass();
  const [data, setData] = useState<HeatmapData>(empty);
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

      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - HEATMAP_DAYS);
      start.setHours(0, 0, 0, 0);

      const stats = await fetchStatistics(connection, [ids.power], start, end, "hour");
      const entries = stats[ids.power] ?? Object.values(stats)[0] ?? [];

      const sums: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
      const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

      for (const e of entries) {
        const startMs = typeof e.start === "string" ? new Date(e.start).getTime() : e.start * 1000;
        const d = new Date(startMs);
        // JS: 0 = Sunday … 6 = Saturday. We want Monday-first.
        const weekday = (d.getDay() + 6) % 7;
        const hour = d.getHours();
        let watts = e.mean ?? 0;
        if (Math.abs(watts) <= POWER_KW_THRESHOLD) watts *= 1000; // unit normalisation
        sums[weekday][hour] += watts;
        counts[weekday][hour] += 1;
      }

      const bins = sums.map((row, w) =>
        row.map((sum, h) => (counts[w][h] > 0 ? sum / counts[w][h] : 0))
      );

      let min = Infinity;
      let max = -Infinity;
      for (const row of bins) {
        for (const v of row) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      if (!isFinite(min)) min = 0;
      if (!isFinite(max)) max = 0;

      setData({ bins, min, max, loading: false, error: null });
    } catch (err) {
      console.error("[Auswertung] heatmap error:", err);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Fehler beim Laden",
      }));
    }
  }, [connection]);

  useEffect(() => {
    load();
  }, [load]);

  return data;
}
