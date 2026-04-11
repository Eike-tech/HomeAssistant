"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useHass } from "./useHass";
import { fetchStatistics, listStatisticIds, type StatisticsEntry } from "@/lib/hass/history";
import { ENTITIES } from "@/lib/hass/entities";

export type TimePeriod = "7d" | "30d" | "12m" | "year";

export interface ChartPoint {
  date: string;
  label: string;
  value: number;
}

export interface LoadCurvePoint {
  time: string;
  label: string;
  power: number;
}

export interface Kpis {
  totalConsumption: number;
  totalCost: number;
  avgDailyConsumption: number;
  avgDailyCost: number;
  prevTotalConsumption: number | null;
  prevTotalCost: number | null;
}

export interface HistoryData {
  consumption: ChartPoint[];
  cost: ChartPoint[];
  loadCurve: LoadCurvePoint[];
  spotPrice: ChartPoint[];
  kpis: Kpis;
  loading: boolean;
  error: string | null;
  recordedDays: number;
}

// ── Period helpers ──────────────────────────────────────────

function getPeriodRange(period: TimePeriod): { start: Date; end: Date; statPeriod: "day" | "month"; days: number } {
  const now = new Date();
  const end = now;

  switch (period) {
    case "7d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end, statPeriod: "day", days: 7 };
    }
    case "30d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end, statPeriod: "day", days: 30 };
    }
    case "12m": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 12);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { start, end, statPeriod: "month", days: 365 };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return { start, end, statPeriod: "month", days: Math.ceil((now.getTime() - start.getTime()) / 86400000) };
    }
  }
}

function getPrevPeriodRange(period: TimePeriod, start: Date): { prevStart: Date; prevEnd: Date } {
  const prevStart = new Date(start);
  const prevEnd = new Date(start);
  switch (period) {
    case "7d": prevStart.setDate(prevStart.getDate() - 7); break;
    case "30d": prevStart.setDate(prevStart.getDate() - 30); break;
    case "12m": prevStart.setMonth(prevStart.getMonth() - 12); break;
    case "year": prevStart.setFullYear(prevStart.getFullYear() - 1); break;
  }
  return { prevStart, prevEnd };
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

function formatMonthLabel(monthKey: string): string {
  const d = new Date(monthKey + "-01T00:00:00");
  return d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
}

// ── Extract values from statistics entries ─────────────────

/** Get the delta value for each entry — prefer `change`, fall back to computing deltas from `sum` */
function extractDeltas(entries: StatisticsEntry[]): number[] {
  // If change is available, use it
  if (entries.length > 0 && entries[0].change !== undefined) {
    return entries.map((e) => e.change ?? 0);
  }
  // Fall back to sum deltas
  if (entries.length > 0 && entries[0].sum !== undefined) {
    return entries.map((e, i) => {
      if (i === 0) return e.sum ?? 0;
      const prev = entries[i - 1].sum ?? 0;
      const curr = e.sum ?? 0;
      return Math.max(0, curr - prev);
    });
  }
  // Last resort: use state or mean
  return entries.map((e) => e.state ?? e.mean ?? 0);
}

/** Get the first matching entries from a statistics result */
function getEntries(result: Record<string, StatisticsEntry[]>, preferredKey: string): StatisticsEntry[] {
  // Try exact key first
  if (result[preferredKey]?.length) return result[preferredKey];
  // Fall back to first non-empty key
  for (const entries of Object.values(result)) {
    if (entries?.length) return entries;
  }
  return [];
}

// ── Main hook ──────────────────────────────────────────────

const emptyKpis: Kpis = {
  totalConsumption: 0,
  totalCost: 0,
  avgDailyConsumption: 0,
  avgDailyCost: 0,
  prevTotalConsumption: null,
  prevTotalCost: null,
};

export function useHistoryData(period: TimePeriod): HistoryData {
  const { connection } = useHass();
  const [data, setData] = useState<HistoryData>({
    consumption: [],
    cost: [],
    loadCurve: [],
    spotPrice: [],
    kpis: emptyKpis,
    loading: true,
    error: null,
    recordedDays: 0,
  });

  // Cache resolved statistic IDs
  const resolvedIdsRef = useRef<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!connection) return;

    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // ── Resolve statistic IDs (once) ──
      if (Object.keys(resolvedIdsRef.current).length === 0) {
        const allIds = await listStatisticIds(connection);
        console.log("[Verlauf] Available statistic IDs:", allIds.map((s) => s.statistic_id));

        const entityKeys = {
          consumption: ENTITIES.energy.dailyConsumption,
          cost: ENTITIES.energy.dailyCost,
          power: ENTITIES.energy.power,
          spot: ENTITIES.energy.spotPrice,
        };

        for (const [key, entityId] of Object.entries(entityKeys)) {
          // Exact match
          const exact = allIds.find((s) => s.statistic_id === entityId);
          if (exact) {
            resolvedIdsRef.current[key] = exact.statistic_id;
          } else {
            // Partial match: find statistic that contains the entity's unique part
            const parts = entityId.split(".");
            const sensorName = parts[parts.length - 1];
            const partial = allIds.find((s) => s.statistic_id.includes(sensorName));
            if (partial) {
              console.log(`[Verlauf] Resolved ${entityId} → ${partial.statistic_id}`);
              resolvedIdsRef.current[key] = partial.statistic_id;
            } else {
              console.warn(`[Verlauf] No statistic found for ${entityId}`);
              resolvedIdsRef.current[key] = entityId; // use entity_id as fallback
            }
          }
        }
        console.log("[Verlauf] Resolved IDs:", resolvedIdsRef.current);
      }

      const ids = resolvedIdsRef.current;
      const { start, end, statPeriod } = getPeriodRange(period);
      const { prevStart, prevEnd } = getPrevPeriodRange(period, start);

      // Load curve: last 24h at 5-minute resolution
      const loadCurveStart = new Date();
      loadCurveStart.setHours(loadCurveStart.getHours() - 24);

      // Fetch all statistics in parallel
      const [consumptionStats, costStats, prevConsumptionStats, prevCostStats, loadCurveStats, spotStats] =
        await Promise.all([
          fetchStatistics(connection, [ids.consumption], start, end, statPeriod),
          fetchStatistics(connection, [ids.cost], start, end, statPeriod),
          fetchStatistics(connection, [ids.consumption], prevStart, prevEnd, statPeriod),
          fetchStatistics(connection, [ids.cost], prevStart, prevEnd, statPeriod),
          fetchStatistics(connection, [ids.power], loadCurveStart, new Date(), "5minute"),
          fetchStatistics(connection, [ids.spot], start, end, statPeriod),
        ]);

      console.log("[Verlauf] Raw stats:", {
        consumption: consumptionStats,
        cost: costStats,
        loadCurve: loadCurveStats,
        spot: spotStats,
      });

      // ── Consumption chart data ──
      const consumptionEntries = getEntries(consumptionStats, ids.consumption);
      const consumptionDeltas = extractDeltas(consumptionEntries);
      const consumption: ChartPoint[] = consumptionEntries.map((e, i) => {
        const dateStr = e.start.slice(0, 10);
        return {
          date: dateStr,
          label: statPeriod === "month" ? formatMonthLabel(e.start.slice(0, 7)) : formatDayLabel(dateStr),
          value: consumptionDeltas[i],
        };
      });

      // ── Cost chart data ──
      const costEntries = getEntries(costStats, ids.cost);
      const costDeltas = extractDeltas(costEntries);
      const cost: ChartPoint[] = costEntries.map((e, i) => {
        const dateStr = e.start.slice(0, 10);
        return {
          date: dateStr,
          label: statPeriod === "month" ? formatMonthLabel(e.start.slice(0, 7)) : formatDayLabel(dateStr),
          value: costDeltas[i],
        };
      });

      // ── KPIs ──
      const totalConsumption = consumptionDeltas.reduce((sum, v) => sum + v, 0);
      const totalCost = costDeltas.reduce((sum, v) => sum + v, 0);
      const numDays = consumptionEntries.length || 1;

      const prevConsumptionEntries = getEntries(prevConsumptionStats, ids.consumption);
      const prevCostEntries = getEntries(prevCostStats, ids.cost);
      const prevConsumptionDeltas = extractDeltas(prevConsumptionEntries);
      const prevCostDeltas = extractDeltas(prevCostEntries);
      const prevTotalConsumption = prevConsumptionEntries.length > 0
        ? prevConsumptionDeltas.reduce((sum, v) => sum + v, 0)
        : null;
      const prevTotalCost = prevCostEntries.length > 0
        ? prevCostDeltas.reduce((sum, v) => sum + v, 0)
        : null;

      // ── Load curve ──
      const loadCurveEntries = getEntries(loadCurveStats, ids.power);
      const loadCurve = loadCurveEntries.map((e) => {
        const d = new Date(e.start);
        return {
          time: e.start,
          label: d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
          power: e.mean ?? 0,
        };
      });

      // ── Spot price ──
      const spotEntries = getEntries(spotStats, ids.spot);
      const spotPrice = spotEntries.map((e) => ({
        date: e.start,
        label: statPeriod === "month"
          ? formatMonthLabel(e.start.slice(0, 7))
          : formatDayLabel(e.start.slice(0, 10)),
        value: (e.mean ?? 0) * 100, // EUR/kWh → ct/kWh
      }));

      console.log("[Verlauf] Processed:", {
        consumption: consumption.length,
        cost: cost.length,
        loadCurve: loadCurve.length,
        spotPrice: spotPrice.length,
      });

      setData({
        consumption,
        cost,
        loadCurve,
        spotPrice,
        kpis: {
          totalConsumption,
          totalCost,
          avgDailyConsumption: totalConsumption / numDays,
          avgDailyCost: totalCost / numDays,
          prevTotalConsumption,
          prevTotalCost,
        },
        loading: false,
        error: null,
        recordedDays: consumptionEntries.length,
      });
    } catch (err) {
      console.error("[Verlauf] Error loading history:", err);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Fehler beim Laden der Daten",
      }));
    }
  }, [connection, period]);

  useEffect(() => {
    load();
  }, [load]);

  return data;
}
