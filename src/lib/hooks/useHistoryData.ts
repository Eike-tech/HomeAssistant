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

type StatPeriod = "hour" | "day" | "month";

// ── Period helpers ──────────────────────────────────────────

export function getPeriodRange(period: TimePeriod): { start: Date; end: Date; statPeriod: StatPeriod; days: number } {
  const now = new Date();
  const end = now;

  switch (period) {
    case "7d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end, statPeriod: "hour", days: 7 };
    }
    case "30d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end, statPeriod: "hour", days: 30 };
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

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
}

// ── Timestamp helpers ──────────────────────────────────────

/** HA Statistics API returns `start` as either a Unix timestamp (seconds) or ISO string */
function startToDate(start: string | number): Date {
  if (typeof start === "string") return new Date(start);
  return new Date(start * 1000);
}

/** Local YYYY-MM-DD key (does not shift days across timezones like .toISOString().slice(0,10) does) */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local YYYY-MM key for monthly buckets */
function localMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// ── Aggregation ────────────────────────────────────────────

interface DailyBucket {
  key: string;
  date: Date;
  delta: number;
}

/**
 * Aggregate hourly statistics entries to daily totals using `Σ max(0, change)`.
 * Negative `change` values (from resets of daily-reset counters like
 * `kumulierte_kosten`) are clamped to zero, so the same logic works for both
 * lifetime counters and reset counters.
 */
function aggregateToDailyDeltas(entries: StatisticsEntry[]): DailyBucket[] {
  const buckets = new Map<string, DailyBucket>();
  for (const e of entries) {
    const d = startToDate(e.start);
    const key = localDateKey(d);
    const change = Math.max(0, e.change ?? 0);
    const existing = buckets.get(key);
    if (existing) {
      existing.delta += change;
    } else {
      buckets.set(key, {
        key,
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        delta: change,
      });
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

interface MonthlyBucket {
  key: string;
  date: Date;
  delta: number;
}

/** Map monthly statistics entries 1:1 to monthly buckets, clamping negative `change` to 0. */
function mapMonthlyDeltas(entries: StatisticsEntry[]): MonthlyBucket[] {
  return entries.map((e) => {
    const d = startToDate(e.start);
    return {
      key: localMonthKey(d),
      date: new Date(d.getFullYear(), d.getMonth(), 1),
      delta: Math.max(0, e.change ?? 0),
    };
  });
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

      // For 7d/30d (statPeriod=hour) cost comes from the daily-reset counter,
      // its negative reset spikes get clamped during aggregation.
      // For 12m/year (statPeriod=month) the monthly-reset counter is the right source.
      const costStatId = statPeriod === "month" ? ids.monthlyCost : ids.dailyCost;

      const [consumptionStats, costStats, prevConsumptionStats, prevCostStats] = await Promise.all([
        fetchStatistics(connection, [ids.meter], start, end, statPeriod),
        fetchStatistics(connection, [costStatId], start, end, statPeriod),
        fetchStatistics(connection, [ids.meter], prevStart, prevEnd, statPeriod),
        fetchStatistics(connection, [costStatId], prevStart, prevEnd, statPeriod),
      ]);

      const consumptionEntries = getEntries(consumptionStats, ids.meter);
      const costEntries = getEntries(costStats, costStatId);
      const prevConsumptionEntries = getEntries(prevConsumptionStats, ids.meter);
      const prevCostEntries = getEntries(prevCostStats, costStatId);

      let consumption: ChartPoint[];
      let cost: ChartPoint[];
      let totalConsumption: number;
      let totalCost: number;
      let numBuckets: number;
      let prevTotalConsumption: number | null;
      let prevTotalCost: number | null;

      if (statPeriod === "month") {
        const consumptionBuckets = mapMonthlyDeltas(consumptionEntries);
        const costBuckets = mapMonthlyDeltas(costEntries);
        consumption = consumptionBuckets.map((b) => ({ date: b.key, label: formatMonthLabel(b.date), value: b.delta }));
        cost = costBuckets.map((b) => ({ date: b.key, label: formatMonthLabel(b.date), value: b.delta }));
        totalConsumption = consumptionBuckets.reduce((s, b) => s + b.delta, 0);
        totalCost = costBuckets.reduce((s, b) => s + b.delta, 0);
        numBuckets = consumptionBuckets.length || 1;
        const prevC = mapMonthlyDeltas(prevConsumptionEntries);
        const prevK = mapMonthlyDeltas(prevCostEntries);
        prevTotalConsumption = prevC.length > 0 ? prevC.reduce((s, b) => s + b.delta, 0) : null;
        prevTotalCost = prevK.length > 0 ? prevK.reduce((s, b) => s + b.delta, 0) : null;
      } else {
        const consumptionBuckets = aggregateToDailyDeltas(consumptionEntries);
        const costBuckets = aggregateToDailyDeltas(costEntries);
        consumption = consumptionBuckets.map((b) => ({ date: b.key, label: formatDayLabel(b.date), value: b.delta }));
        cost = costBuckets.map((b) => ({ date: b.key, label: formatDayLabel(b.date), value: b.delta }));
        totalConsumption = consumptionBuckets.reduce((s, b) => s + b.delta, 0);
        totalCost = costBuckets.reduce((s, b) => s + b.delta, 0);
        numBuckets = consumptionBuckets.length || 1;
        const prevC = aggregateToDailyDeltas(prevConsumptionEntries);
        const prevK = aggregateToDailyDeltas(prevCostEntries);
        prevTotalConsumption = prevC.length > 0 ? prevC.reduce((s, b) => s + b.delta, 0) : null;
        prevTotalCost = prevK.length > 0 ? prevK.reduce((s, b) => s + b.delta, 0) : null;
      }

      setData({
        consumption,
        cost,
        kpis: {
          totalConsumption,
          totalCost,
          avgDailyConsumption: totalConsumption / numBuckets,
          avgDailyCost: totalCost / numBuckets,
          prevTotalConsumption,
          prevTotalCost,
        },
        loading: false,
        error: null,
        recordedDays: consumption.length,
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
