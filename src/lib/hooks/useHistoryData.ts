"use client";

import { useEffect, useState, useCallback } from "react";
import { useHass } from "./useHass";
import { fetchStatistics } from "@/lib/hass/history";
import { ENTITIES } from "@/lib/hass/entities";
import { getRecordedHistory, type DailyRecord } from "./useRecordedHistory";

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

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

function formatMonthLabel(monthKey: string): string {
  // monthKey = "2026-04"
  const d = new Date(monthKey + "-01T00:00:00");
  return d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
}

// ── Recorded data processing ───────────────────────────────

function filterRecords(records: DailyRecord[], start: Date): DailyRecord[] {
  const startStr = start.toISOString().slice(0, 10);
  return records.filter((r) => r.date >= startStr);
}

function recordsToDaily(records: DailyRecord[]): { consumption: ChartPoint[]; cost: ChartPoint[] } {
  return {
    consumption: records.map((r) => ({ date: r.date, label: formatDayLabel(r.date), value: r.consumption })),
    cost: records.map((r) => ({ date: r.date, label: formatDayLabel(r.date), value: r.cost })),
  };
}

function recordsToMonthly(records: DailyRecord[]): { consumption: ChartPoint[]; cost: ChartPoint[] } {
  const months = new Map<string, { consumption: number; cost: number }>();
  for (const r of records) {
    const monthKey = r.date.slice(0, 7); // "2026-04"
    const existing = months.get(monthKey) ?? { consumption: 0, cost: 0 };
    existing.consumption += r.consumption;
    existing.cost += r.cost;
    months.set(monthKey, existing);
  }

  const sortedKeys = [...months.keys()].sort();
  return {
    consumption: sortedKeys.map((k) => ({ date: k, label: formatMonthLabel(k), value: months.get(k)!.consumption })),
    cost: sortedKeys.map((k) => ({ date: k, label: formatMonthLabel(k), value: months.get(k)!.cost })),
  };
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

  const load = useCallback(async () => {
    if (!connection) return;

    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { start, end, statPeriod, days } = getPeriodRange(period);

      // ── Recorded data (consumption & cost from localStorage) ──
      const allRecords = getRecordedHistory();
      const periodRecords = filterRecords(allRecords, start);

      const { consumption, cost } = statPeriod === "month"
        ? recordsToMonthly(periodRecords)
        : recordsToDaily(periodRecords);

      const totalConsumption = periodRecords.reduce((sum, r) => sum + r.consumption, 0);
      const totalCost = periodRecords.reduce((sum, r) => sum + r.cost, 0);
      const numDays = periodRecords.length || 1;

      // ── Previous period for delta comparison ──
      const prevStart = new Date(start);
      const prevEnd = new Date(start);
      switch (period) {
        case "7d": prevStart.setDate(prevStart.getDate() - 7); break;
        case "30d": prevStart.setDate(prevStart.getDate() - 30); break;
        case "12m": prevStart.setMonth(prevStart.getMonth() - 12); break;
        case "year": prevStart.setFullYear(prevStart.getFullYear() - 1); break;
      }
      const prevRecords = allRecords.filter((r) => {
        return r.date >= prevStart.toISOString().slice(0, 10) && r.date < prevEnd.toISOString().slice(0, 10);
      });
      const prevTotalConsumption = prevRecords.length > 0
        ? prevRecords.reduce((sum, r) => sum + r.consumption, 0)
        : null;
      const prevTotalCost = prevRecords.length > 0
        ? prevRecords.reduce((sum, r) => sum + r.cost, 0)
        : null;

      // ── HA Statistics (load curve & spot price — mean values are reliable) ──
      const loadCurveStart = new Date();
      loadCurveStart.setHours(loadCurveStart.getHours() - 24);

      const powerId = ENTITIES.energy.power;
      const spotId = ENTITIES.energy.spotPrice;

      const [loadCurveStats, spotStats] = await Promise.all([
        fetchStatistics(connection, [powerId], loadCurveStart, new Date(), "5minute"),
        fetchStatistics(connection, [spotId], start, end, statPeriod),
      ]);

      const loadCurveEntries = loadCurveStats[powerId] ?? [];
      const loadCurve = loadCurveEntries.map((e) => {
        const d = new Date(e.start);
        return {
          time: e.start,
          label: d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
          power: e.mean ?? 0,
        };
      });

      const spotEntries = spotStats[spotId] ?? [];
      const spotPrice = spotEntries.map((e) => ({
        date: e.start,
        label: statPeriod === "month"
          ? formatMonthLabel(e.start.slice(0, 7))
          : formatDayLabel(e.start.slice(0, 10)),
        value: (e.mean ?? 0) * 100, // EUR/kWh → ct/kWh
      }));

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
        recordedDays: allRecords.length,
      });
    } catch (err) {
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
