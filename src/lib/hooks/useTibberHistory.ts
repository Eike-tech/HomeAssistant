"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getPeriodRange,
  type ChartPoint,
  type ChartResolution,
  type HistoryData,
  type Kpis,
  type TimePeriod,
} from "./useHistoryData";

interface TibberNode {
  from: string;
  to: string;
  consumption: number | null;
  cost: number | null;
  unitPrice: number | null;
}

interface TibberApiResponse {
  resolution: "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUAL";
  period: string;
  nodes: TibberNode[];
}

const emptyKpis: Kpis = {
  totalConsumption: 0,
  totalCost: 0,
  avgDailyConsumption: 0,
  avgDailyCost: 0,
  prevTotalConsumption: null,
  prevTotalCost: null,
};

// ── Label helpers (mirror useHistoryData behaviour) ────────

function formatHourLabel(d: Date, period: TimePeriod): string {
  if (period === "today") {
    return `${String(d.getHours()).padStart(2, "0")}`;
  }
  if (d.getHours() === 0) {
    return d.toLocaleDateString("de-DE", { weekday: "short" });
  }
  return "";
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
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

// ── Main hook ──────────────────────────────────────────────

export function useTibberHistory(period: TimePeriod): HistoryData {
  const [data, setData] = useState<HistoryData>({
    consumption: [],
    cost: [],
    resolution: "day" as ChartResolution,
    kpis: emptyKpis,
    loading: true,
    error: null,
    recordedDays: 0,
  });

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Resolve API path relative to current page so the HA Ingress prefix is preserved
      // (matches the pattern used in `src/lib/hass/connection.ts` for config.json).
      const base =
        typeof window !== "undefined"
          ? window.location.pathname.replace(/\/$/, "").replace(/\/[^/]*$/, "")
          : "";
      const res = await fetch(`${base}/api/tibber/consumption?period=${period}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errBody.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as TibberApiResponse;
      const nodes = json.nodes ?? [];

      const { start, end, resolution, days } = getPeriodRange(period);
      console.log(
        `[Tibber] period=${period} resolution=${json.resolution} ` +
          `nodes=${nodes.length} ` +
          `range=[${start.toISOString()} → ${end.toISOString()}]` +
          (nodes.length > 0
            ? ` first=${nodes[0].from} last=${nodes[nodes.length - 1].from}`
            : "")
      );
      // Previous period bounds — same shift logic as useHistoryData
      const prevBounds = (() => {
        switch (period) {
          case "today": {
            const ms = 24 * 3_600_000;
            return { start: new Date(start.getTime() - ms), end: new Date(end.getTime() - ms) };
          }
          case "7d":
          case "30d": {
            const d = period === "7d" ? 7 : 30;
            const ms = d * 24 * 3_600_000;
            return { start: new Date(start.getTime() - ms), end: new Date(end.getTime() - ms) };
          }
          case "year": {
            const ps = new Date(start);
            ps.setFullYear(ps.getFullYear() - 1);
            const pe = new Date(end);
            pe.setFullYear(pe.getFullYear() - 1);
            return { start: ps, end: pe };
          }
        }
      })();

      // Each node's `from` is the bucket start. Filter into current vs previous.
      const isInRange = (n: TibberNode, lo: Date, hi: Date) => {
        const t = new Date(n.from).getTime();
        return t >= lo.getTime() && t < hi.getTime();
      };

      const currentNodes = nodes.filter((n) => isInRange(n, start, end));
      const prevNodes = nodes.filter((n) => isInRange(n, prevBounds.start, prevBounds.end));
      console.log(
        `[Tibber] filtered current=${currentNodes.length} prev=${prevNodes.length} ` +
          `(prev range=[${prevBounds.start.toISOString()} → ${prevBounds.end.toISOString()}])`
      );

      const labelFor = (d: Date) =>
        resolution === "hour" ? formatHourLabel(d, period) : formatDayLabel(d);
      const keyFor = (d: Date) => (resolution === "hour" ? localHourKey(d) : localDateKey(d));

      const consumption: ChartPoint[] = currentNodes.map((n) => {
        const d = new Date(n.from);
        return { date: keyFor(d), label: labelFor(d), value: Math.max(0, n.consumption ?? 0) };
      });
      const cost: ChartPoint[] = currentNodes.map((n) => {
        const d = new Date(n.from);
        return { date: keyFor(d), label: labelFor(d), value: Math.max(0, n.cost ?? 0) };
      });

      const totalConsumption = currentNodes.reduce(
        (s, n) => s + Math.max(0, n.consumption ?? 0),
        0
      );
      const totalCost = currentNodes.reduce((s, n) => s + Math.max(0, n.cost ?? 0), 0);

      const prevTotalConsumption =
        prevNodes.length > 0
          ? prevNodes.reduce((s, n) => s + Math.max(0, n.consumption ?? 0), 0)
          : null;
      const prevTotalCost =
        prevNodes.length > 0 ? prevNodes.reduce((s, n) => s + Math.max(0, n.cost ?? 0), 0) : null;

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
      console.error("[Tibber] load error:", err);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Fehler beim Laden",
      }));
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return data;
}
