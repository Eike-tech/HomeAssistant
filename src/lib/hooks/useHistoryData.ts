"use client";

import { useEffect, useState, useCallback } from "react";
import { useHass } from "./useHass";
import { fetchStatistics, type StatisticsResult } from "@/lib/hass/history";
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
}

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

function getPrevPeriodRange(period: TimePeriod): { start: Date; end: Date; statPeriod: "day" | "month" } {
  const { start: curStart, statPeriod } = getPeriodRange(period);

  switch (period) {
    case "7d": {
      const end = new Date(curStart);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      return { start, end, statPeriod };
    }
    case "30d": {
      const end = new Date(curStart);
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      return { start, end, statPeriod };
    }
    case "12m": {
      const end = new Date(curStart);
      const start = new Date(end);
      start.setMonth(start.getMonth() - 12);
      start.setDate(1);
      return { start, end, statPeriod };
    }
    case "year": {
      const end = new Date(curStart);
      const start = new Date(end.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      return { start, end, statPeriod };
    }
  }
}

function formatLabel(dateStr: string, period: "day" | "month"): string {
  const d = new Date(dateStr);
  if (period === "month") {
    return d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

function sumFromSumField(stats: StatisticsResult, entityId: string): number {
  const entries = stats[entityId];
  if (!entries?.length) return 0;
  // Use the difference between last and first sum value (reset-compensated)
  const first = entries[0].sum ?? 0;
  const last = entries[entries.length - 1].sum ?? 0;
  return Math.max(0, last - first);
}

function toChartPoints(stats: StatisticsResult, entityId: string, period: "day" | "month", field: "sum" | "mean" = "sum"): ChartPoint[] {
  const entries = stats[entityId];
  if (!entries?.length) return [];

  if (field === "mean") {
    return entries.map((e) => ({
      date: e.start,
      label: formatLabel(e.start, period),
      value: e.mean ?? 0,
    }));
  }

  // Compute deltas from consecutive sum values (reset-compensated, never negative)
  return entries.map((e, i) => {
    const prevSum = i > 0 ? (entries[i - 1].sum ?? 0) : (e.sum ?? 0);
    const curSum = e.sum ?? 0;
    const delta = i > 0 ? Math.max(0, curSum - prevSum) : 0;
    return {
      date: e.start,
      label: formatLabel(e.start, period),
      value: delta,
    };
  }).filter((_, i) => i > 0); // drop first entry (no previous to diff against)
}

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
  });

  const load = useCallback(async () => {
    if (!connection) return;

    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { start, end, statPeriod, days } = getPeriodRange(period);
      const prev = getPrevPeriodRange(period);

      // Load curve: always last 24h at 5-minute resolution
      const loadCurveStart = new Date();
      loadCurveStart.setHours(loadCurveStart.getHours() - 24);

      const consumptionId = ENTITIES.energy.dailyConsumption;
      const costId = ENTITIES.energy.dailyCost;
      const powerId = ENTITIES.energy.power;
      const spotId = ENTITIES.energy.spotPrice;

      const [currentStats, prevStats, loadCurveStats, spotStats] = await Promise.all([
        fetchStatistics(connection, [consumptionId, costId], start, end, statPeriod),
        fetchStatistics(connection, [consumptionId, costId], prev.start, prev.end, prev.statPeriod),
        fetchStatistics(connection, [powerId], loadCurveStart, new Date(), "5minute"),
        fetchStatistics(connection, [spotId], start, end, statPeriod),
      ]);

      const totalConsumption = sumFromSumField(currentStats, consumptionId);
      const totalCost = sumFromSumField(currentStats, costId);
      const divisor = statPeriod === "month" ? (days / 30) : days;

      const consumption = toChartPoints(currentStats, consumptionId, statPeriod, "sum");
      const cost = toChartPoints(currentStats, costId, statPeriod, "sum");

      const loadCurveEntries = loadCurveStats[powerId] ?? [];
      const loadCurve: LoadCurvePoint[] = loadCurveEntries.map((e) => {
        const d = new Date(e.start);
        return {
          time: e.start,
          label: d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
          power: e.mean ?? 0,
        };
      });

      const spotEntries = spotStats[spotId] ?? [];
      const spotPrice: ChartPoint[] = spotEntries.map((e) => ({
        date: e.start,
        label: formatLabel(e.start, statPeriod),
        value: (e.mean ?? 0) * 100, // EUR/kWh → ct/kWh
      }));

      const prevTotalConsumption = sumFromSumField(prevStats, consumptionId);
      const prevTotalCost = sumFromSumField(prevStats, costId);

      setData({
        consumption,
        cost,
        loadCurve,
        spotPrice,
        kpis: {
          totalConsumption,
          totalCost,
          avgDailyConsumption: days > 0 ? totalConsumption / divisor : 0,
          avgDailyCost: days > 0 ? totalCost / divisor : 0,
          prevTotalConsumption: prevTotalConsumption || null,
          prevTotalCost: prevTotalCost || null,
        },
        loading: false,
        error: null,
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
