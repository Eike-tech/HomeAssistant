"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useHass } from "./useHass";
import { fetchStatistics, type StatisticsEntry } from "@/lib/hass/history";
import { resolveStatisticIds } from "@/lib/hass/resolveStatisticIds";
import { fetchEnergyPrefs, getGridStatIds } from "@/lib/hass/energyPrefs";
import { ENTITIES } from "@/lib/hass/entities";

export type TimePeriod = "today" | "7d" | "30d" | "year";

export type ChartResolution = "hour" | "day";

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
  resolution: ChartResolution;
  kpis: Kpis;
  loading: boolean;
  error: string | null;
  recordedDays: number;
}

// ── Period helpers ──────────────────────────────────────────

export function getPeriodRange(period: TimePeriod): { start: Date; end: Date; resolution: ChartResolution; days: number } {
  const now = new Date();
  const end = now;

  switch (period) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return { start, end, resolution: "hour", days: 1 };
    }
    case "7d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end, resolution: "hour", days: 7 };
    }
    case "30d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end, resolution: "day", days: 30 };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const days = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / 86_400_000));
      return { start, end, resolution: "day", days };
    }
  }
}

function getPrevPeriodRange(period: TimePeriod, start: Date, end: Date): { prevStart: Date; prevEnd: Date } {
  switch (period) {
    case "today": {
      const ms = 24 * 3_600_000;
      return { prevStart: new Date(start.getTime() - ms), prevEnd: new Date(end.getTime() - ms) };
    }
    case "7d":
    case "30d": {
      const days = period === "7d" ? 7 : 30;
      const ms = days * 24 * 3_600_000;
      return { prevStart: new Date(start.getTime() - ms), prevEnd: new Date(end.getTime() - ms) };
    }
    case "year": {
      const prevStart = new Date(start);
      prevStart.setFullYear(prevStart.getFullYear() - 1);
      const prevEnd = new Date(end);
      prevEnd.setFullYear(prevEnd.getFullYear() - 1);
      return { prevStart, prevEnd };
    }
  }
}

// ── Label formatters ───────────────────────────────────────

function formatHourLabel(d: Date, period: TimePeriod): string {
  if (period === "today") {
    return `${String(d.getHours()).padStart(2, "0")}`;
  }
  // 7d: weekday name only at hour 0 — keeps 168 bars readable
  if (d.getHours() === 0) {
    return d.toLocaleDateString("de-DE", { weekday: "short" });
  }
  return "";
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

// ── Timestamp helpers ──────────────────────────────────────

function startToDate(start: string | number): Date {
  if (typeof start === "string") return new Date(start);
  return new Date(start * 1000);
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localHourKey(d: Date): string {
  return `${localDateKey(d)}T${String(d.getHours()).padStart(2, "0")}`;
}

// ── Bucket mapping ─────────────────────────────────────────

interface Bucket {
  key: string;
  date: Date;
  delta: number;
}

function mapHourlyEntries(entries: StatisticsEntry[]): Bucket[] {
  return entries.map((e) => {
    const d = startToDate(e.start);
    return {
      key: localHourKey(d),
      date: d,
      delta: Math.max(0, e.change ?? 0),
    };
  });
}

function mapDailyEntries(entries: StatisticsEntry[]): Bucket[] {
  return entries.map((e) => {
    const d = startToDate(e.start);
    return {
      key: localDateKey(d),
      date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      delta: Math.max(0, e.change ?? 0),
    };
  });
}

/** Aggregate hourly buckets to daily, summing positive `delta`s per local day. */
function aggregateHourlyToDaily(hourly: Bucket[]): Bucket[] {
  const buckets = new Map<string, Bucket>();
  for (const h of hourly) {
    const dayKey = localDateKey(h.date);
    const existing = buckets.get(dayKey);
    if (existing) {
      existing.delta += h.delta;
    } else {
      buckets.set(dayKey, {
        key: dayKey,
        date: new Date(h.date.getFullYear(), h.date.getMonth(), h.date.getDate()),
        delta: h.delta,
      });
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Map cost statistics entries to chart buckets, handling the case where the
 * cost was fetched at a different resolution than the chart needs.
 */
function mapCostBuckets(
  entries: StatisticsEntry[],
  chartResolution: ChartResolution,
  fetchResolution: "hour" | "day"
): Bucket[] {
  if (fetchResolution === "hour") {
    const hourly = mapHourlyEntries(entries);
    return chartResolution === "hour" ? hourly : aggregateHourlyToDaily(hourly);
  }
  // fetchResolution === "day"
  return mapDailyEntries(entries);
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
    resolution: "day",
    kpis: emptyKpis,
    loading: true,
    error: null,
    recordedDays: 0,
  });

  const resolvedIdsRef = useRef<{
    consumption: string;
    cost: string;
    /** true = lifetime counter (HA Energy stat_cost). false = daily-reset fallback. */
    costIsLifetime: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    if (!connection) return;

    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      if (!resolvedIdsRef.current) {
        // Pull the same stat IDs that HA's Energy dashboard uses (so values
        // match exactly what the user sees in HA's own "Heute" tile).
        const prefs = await fetchEnergyPrefs(connection).catch((e) => {
          console.warn("[Auswertung] energy/get_prefs failed, falling back to ENTITIES", e);
          return null;
        });
        const grid = prefs ? getGridStatIds(prefs) : { consumption: null, cost: null };

        const fallback = await resolveStatisticIds(connection, {
          meter: ENTITIES.energy.meterReading,
          dailyCost: ENTITIES.energy.dailyCost,
        });

        resolvedIdsRef.current = {
          consumption: grid.consumption ?? fallback.meter,
          cost: grid.cost ?? fallback.dailyCost,
          costIsLifetime: grid.cost !== null,
        };

        console.log(
          "[Auswertung] history stat IDs",
          resolvedIdsRef.current,
          "(grid prefs:",
          grid,
          ")"
        );
      }

      const ids = resolvedIdsRef.current;
      const { start, end, resolution, days } = getPeriodRange(period);
      const { prevStart, prevEnd } = getPrevPeriodRange(period, start, end);

      // Meter is a lifetime counter — fetch at chart resolution directly.
      // Cost: when from HA Energy prefs (`stat_cost`) it's also a lifetime
      // counter and works at any resolution. When falling back to the
      // daily-reset `kumulierte_kosten`, fetch hourly and aggregate locally
      // so midnight resets get clamped instead of producing negative buckets.
      const costFetchResolution: "hour" | "day" = ids.costIsLifetime ? resolution : "hour";

      const [consumptionStats, costStats, prevConsumptionStats, prevCostStats] = await Promise.all([
        fetchStatistics(connection, [ids.consumption], start, end, resolution),
        fetchStatistics(connection, [ids.cost], start, end, costFetchResolution),
        fetchStatistics(connection, [ids.consumption], prevStart, prevEnd, resolution),
        fetchStatistics(connection, [ids.cost], prevStart, prevEnd, costFetchResolution),
      ]);

      const consumptionEntries = getEntries(consumptionStats, ids.consumption);
      const costEntries = getEntries(costStats, ids.cost);
      const prevConsumptionEntries = getEntries(prevConsumptionStats, ids.consumption);
      const prevCostEntries = getEntries(prevCostStats, ids.cost);

      const consumptionBuckets =
        resolution === "hour" ? mapHourlyEntries(consumptionEntries) : mapDailyEntries(consumptionEntries);
      const costBuckets = mapCostBuckets(costEntries, resolution, costFetchResolution);
      const prevConsumptionBuckets =
        resolution === "hour" ? mapHourlyEntries(prevConsumptionEntries) : mapDailyEntries(prevConsumptionEntries);
      const prevCostBuckets = mapCostBuckets(prevCostEntries, resolution, costFetchResolution);

      const labelFor = (d: Date) => (resolution === "hour" ? formatHourLabel(d, period) : formatDayLabel(d));

      const consumption: ChartPoint[] = consumptionBuckets.map((b) => ({
        date: b.key,
        label: labelFor(b.date),
        value: b.delta,
      }));
      const cost: ChartPoint[] = costBuckets.map((b) => ({
        date: b.key,
        label: labelFor(b.date),
        value: b.delta,
      }));

      const totalConsumption = consumptionBuckets.reduce((s, b) => s + b.delta, 0);
      const totalCost = costBuckets.reduce((s, b) => s + b.delta, 0);
      const prevTotalConsumption =
        prevConsumptionBuckets.length > 0 ? prevConsumptionBuckets.reduce((s, b) => s + b.delta, 0) : null;
      const prevTotalCost = prevCostBuckets.length > 0 ? prevCostBuckets.reduce((s, b) => s + b.delta, 0) : null;

      setData({
        consumption,
        cost,
        resolution,
        kpis: {
          totalConsumption,
          totalCost,
          avgDailyConsumption: totalConsumption / days,
          avgDailyCost: totalCost / days,
          prevTotalConsumption,
          prevTotalCost,
        },
        loading: false,
        error: null,
        recordedDays: days,
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
