"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useHass } from "./useHass";
import { fetchStatistics, type StatisticsEntry } from "@/lib/hass/history";
import { resolveStatisticIds, type StatisticIdMap } from "@/lib/hass/resolveStatisticIds";
import { ENTITIES } from "@/lib/hass/entities";

export type TimePeriod = "7d" | "30d" | "12m" | "year";

export interface ChartPoint {
  date: string;
  label: string;
  value: number;
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
  kpis: Kpis;
  loading: boolean;
  error: string | null;
  recordedDays: number;
}

// ── Period helpers ──────────────────────────────────────────

export function getPeriodRange(period: TimePeriod): { start: Date; end: Date; statPeriod: "day" | "month"; days: number } {
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

// ── Timestamp helpers ──────────────────────────────────────

/** HA Statistics API returns `start` as a Unix timestamp (seconds) — convert to ISO string */
function startToIso(start: string | number): string {
  if (typeof start === "string") return start;
  return new Date(start * 1000).toISOString();
}

// ── Extract values from statistics entries ─────────────────

/** Get the delta value for each entry — prefer `change`, fall back to computing deltas from `sum` */
function extractDeltas(entries: StatisticsEntry[]): number[] {
  if (entries.length > 0 && entries[0].change !== undefined) {
    return entries.map((e) => Math.max(0, e.change ?? 0));
  }
  if (entries.length > 0 && entries[0].sum !== undefined) {
    return entries.map((e, i) => {
      if (i === 0) return e.sum ?? 0;
      const prev = entries[i - 1].sum ?? 0;
      const curr = e.sum ?? 0;
      return Math.max(0, curr - prev);
    });
  }
  return entries.map((e) => Math.max(0, e.state ?? e.mean ?? 0));
}

/**
 * For periodic-reset counters (e.g. daily/monthly cost): the bucket-end `state`
 * is the period total just before reset. Prefer `state`, fall back to `max`.
 */
function extractStateValues(entries: StatisticsEntry[]): number[] {
  return entries.map((e) => Math.max(0, e.state ?? e.max ?? e.mean ?? 0));
}

function getEntries(result: Record<string, StatisticsEntry[]>, preferredKey: string): StatisticsEntry[] {
  if (result[preferredKey]?.length) return result[preferredKey];
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
    kpis: emptyKpis,
    loading: true,
    error: null,
    recordedDays: 0,
  });

  const resolvedIdsRef = useRef<StatisticIdMap | null>(null);

  const load = useCallback(async () => {
    if (!connection) return;

    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      if (!resolvedIdsRef.current) {
        resolvedIdsRef.current = await resolveStatisticIds(connection, {
          meter: ENTITIES.energy.meterReading,
          dailyCost: ENTITIES.energy.dailyCost,
          monthlyCost: ENTITIES.energy.monthlyCost,
        });
      }

      const ids = resolvedIdsRef.current;
      const { start, end, statPeriod } = getPeriodRange(period);
      const { prevStart, prevEnd } = getPrevPeriodRange(period, start);

      // Cost source depends on period: daily-reset counter for short ranges,
      // monthly-reset counter for long ranges. Both are read via bucket-end `state`.
      const costStatId = statPeriod === "month" ? ids.monthlyCost : ids.dailyCost;

      const [consumptionStats, costStats, prevConsumptionStats, prevCostStats] = await Promise.all([
        fetchStatistics(connection, [ids.meter], start, end, statPeriod),
        fetchStatistics(connection, [costStatId], start, end, statPeriod),
        fetchStatistics(connection, [ids.meter], prevStart, prevEnd, statPeriod),
        fetchStatistics(connection, [costStatId], prevStart, prevEnd, statPeriod),
      ]);

      const consumptionEntries = getEntries(consumptionStats, ids.meter);
      const consumptionDeltas = extractDeltas(consumptionEntries);
      const consumption: ChartPoint[] = consumptionEntries.map((e, i) => {
        const iso = startToIso(e.start);
        const dateStr = iso.slice(0, 10);
        return {
          date: dateStr,
          label: statPeriod === "month" ? formatMonthLabel(iso.slice(0, 7)) : formatDayLabel(dateStr),
          value: consumptionDeltas[i],
        };
      });

      const costEntries = getEntries(costStats, costStatId);
      const costValues = extractStateValues(costEntries);
      const cost: ChartPoint[] = costEntries.map((e, i) => {
        const iso = startToIso(e.start);
        const dateStr = iso.slice(0, 10);
        return {
          date: dateStr,
          label: statPeriod === "month" ? formatMonthLabel(iso.slice(0, 7)) : formatDayLabel(dateStr),
          value: costValues[i],
        };
      });

      const totalConsumption = consumptionDeltas.reduce((sum, v) => sum + v, 0);
      const totalCost = costValues.reduce((sum, v) => sum + v, 0);
      const numDays = consumptionEntries.length || 1;

      const prevConsumptionEntries = getEntries(prevConsumptionStats, ids.meter);
      const prevCostEntries = getEntries(prevCostStats, costStatId);
      const prevConsumptionDeltas = extractDeltas(prevConsumptionEntries);
      const prevCostValues = extractStateValues(prevCostEntries);
      const prevTotalConsumption = prevConsumptionEntries.length > 0
        ? prevConsumptionDeltas.reduce((sum, v) => sum + v, 0)
        : null;
      const prevTotalCost = prevCostEntries.length > 0
        ? prevCostValues.reduce((sum, v) => sum + v, 0)
        : null;

      setData({
        consumption,
        cost,
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
      console.error("[Auswertung] Error loading history:", err);
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
