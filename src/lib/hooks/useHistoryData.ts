"use client";

import { useEffect, useState, useCallback } from "react";
import { useHass } from "./useHass";
import { fetchStatistics } from "@/lib/hass/history";
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
      const { prevStart, prevEnd } = getPrevPeriodRange(period, start);

      const consumptionId = ENTITIES.energy.dailyConsumption;
      const costId = ENTITIES.energy.dailyCost;
      const powerId = ENTITIES.energy.power;
      const spotId = ENTITIES.energy.spotPrice;

      // Load curve: last 24h at 5-minute resolution
      const loadCurveStart = new Date();
      loadCurveStart.setHours(loadCurveStart.getHours() - 24);

      // Fetch all statistics in parallel
      const [consumptionStats, costStats, prevConsumptionStats, prevCostStats, loadCurveStats, spotStats] =
        await Promise.all([
          fetchStatistics(connection, [consumptionId], start, end, statPeriod),
          fetchStatistics(connection, [costId], start, end, statPeriod),
          fetchStatistics(connection, [consumptionId], prevStart, prevEnd, statPeriod),
          fetchStatistics(connection, [costId], prevStart, prevEnd, statPeriod),
          fetchStatistics(connection, [powerId], loadCurveStart, new Date(), "5minute"),
          fetchStatistics(connection, [spotId], start, end, statPeriod),
        ]);

      // ── Consumption chart data ──
      const consumptionEntries = consumptionStats[consumptionId] ?? [];
      const consumption: ChartPoint[] = consumptionEntries.map((e) => {
        const dateStr = e.start.slice(0, 10);
        return {
          date: dateStr,
          label: statPeriod === "month" ? formatMonthLabel(e.start.slice(0, 7)) : formatDayLabel(dateStr),
          value: e.change ?? 0,
        };
      });

      // ── Cost chart data ──
      const costEntries = costStats[costId] ?? [];
      const cost: ChartPoint[] = costEntries.map((e) => {
        const dateStr = e.start.slice(0, 10);
        return {
          date: dateStr,
          label: statPeriod === "month" ? formatMonthLabel(e.start.slice(0, 7)) : formatDayLabel(dateStr),
          value: e.change ?? 0,
        };
      });

      // ── KPIs ──
      const totalConsumption = consumptionEntries.reduce((sum, e) => sum + (e.change ?? 0), 0);
      const totalCost = costEntries.reduce((sum, e) => sum + (e.change ?? 0), 0);
      const numDays = consumptionEntries.length || 1;

      const prevConsumptionEntries = prevConsumptionStats[consumptionId] ?? [];
      const prevCostEntries = prevCostStats[costId] ?? [];
      const prevTotalConsumption = prevConsumptionEntries.length > 0
        ? prevConsumptionEntries.reduce((sum, e) => sum + (e.change ?? 0), 0)
        : null;
      const prevTotalCost = prevCostEntries.length > 0
        ? prevCostEntries.reduce((sum, e) => sum + (e.change ?? 0), 0)
        : null;

      // ── Load curve ──
      const loadCurveEntries = loadCurveStats[powerId] ?? [];
      const loadCurve = loadCurveEntries.map((e) => {
        const d = new Date(e.start);
        return {
          time: e.start,
          label: d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
          power: e.mean ?? 0,
        };
      });

      // ── Spot price ──
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
        recordedDays: consumptionEntries.length,
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
