"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useHass } from "./useHass";
import { fetchStatistics, type StatisticsEntry } from "@/lib/hass/history";
import { getAllStatisticIds } from "@/lib/hass/resolveStatisticIds";
import { ROOMS, deriveEnergyCandidates } from "@/lib/hass/rooms";
import { getPeriodRange, type TimePeriod } from "./useHistoryData";

export interface DeviceEnergy {
  entityId: string;
  label: string;
  roomId: string;
  roomLabel: string;
  roomColor: string;
  kWh: number;
  /** "energy" if a kWh counter sibling was found, "power" if integrating power. */
  source: "energy" | "power";
}

export interface RoomEnergy {
  id: string;
  label: string;
  color: string;
  icon: string;
  kWh: number;
  share: number; // 0..1 of total devices
}

export interface DeviceEnergyHistory {
  devices: DeviceEnergy[];
  rooms: RoomEnergy[];
  total: number;
  loading: boolean;
  error: string | null;
}

interface DeviceResolution {
  entityId: string;
  statId: string;
  mode: "energy" | "power";
  unit: string | null;
}

const empty: DeviceEnergyHistory = {
  devices: [],
  rooms: [],
  total: 0,
  loading: true,
  error: null,
};

function startToMs(start: string | number): number {
  if (typeof start === "string") return new Date(start).getTime();
  return start * 1000;
}

/** Sum of clamped `change` values across the period. Works for both lifetime and reset counters. */
function sumChange(entries: StatisticsEntry[]): number {
  return entries.reduce((sum, e) => sum + Math.max(0, e.change ?? 0), 0);
}

/** Integrate `mean × interval-hours` to kWh. Used as fallback when no energy sibling exists. */
function integratePower(entries: StatisticsEntry[]): number {
  let kWh = 0;
  for (const e of entries) {
    const startMs = startToMs(e.start);
    const endMs = e.end !== undefined ? startToMs(e.end) : startMs + 3600 * 1000;
    const hours = Math.max(0, (endMs - startMs) / 3_600_000);
    kWh += ((e.mean ?? 0) * hours) / 1000;
  }
  return kWh;
}

/** Convert raw counter delta to kWh based on the sensor unit. */
function toKwh(value: number, unit: string | null): number {
  if (!unit) return value;
  const u = unit.toLowerCase();
  if (u === "kwh") return value;
  if (u === "wh") return value / 1000;
  if (u === "mwh") return value * 1000;
  return value;
}

export function useDeviceEnergyHistory(period: TimePeriod): DeviceEnergyHistory {
  const { connection } = useHass();
  const [data, setData] = useState<DeviceEnergyHistory>(empty);
  const resolutionRef = useRef<DeviceResolution[] | null>(null);

  const load = useCallback(async () => {
    if (!connection) return;
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // ── Resolve once per session: prefer energy counter siblings, fall back to power
      if (!resolutionRef.current) {
        const allStats = await getAllStatisticIds(connection);
        const byId = new Map(allStats.map((s) => [s.statistic_id, s]));

        const resolution: DeviceResolution[] = [];
        for (const room of ROOMS) {
          for (const dev of room.devices) {
            const candidates = deriveEnergyCandidates(dev.entityId);
            const energyMatch = candidates
              .map((c) => byId.get(c))
              .find(
                (info) =>
                  info !== undefined &&
                  info.has_sum &&
                  info.unit_of_measurement !== null &&
                  ["kwh", "wh", "mwh"].includes(info.unit_of_measurement.toLowerCase())
              );

            if (energyMatch) {
              resolution.push({
                entityId: dev.entityId,
                statId: energyMatch.statistic_id,
                mode: "energy",
                unit: energyMatch.unit_of_measurement,
              });
            } else {
              const fallback = byId.get(dev.entityId);
              resolution.push({
                entityId: dev.entityId,
                statId: dev.entityId,
                mode: "power",
                unit: fallback?.unit_of_measurement ?? null,
              });
            }
          }
        }

        resolutionRef.current = resolution;
        console.log(
          "[Auswertung] Device energy resolution:",
          resolution.map((r) => `${r.entityId} → ${r.statId} (${r.mode}, ${r.unit ?? "?"})`)
        );
      }

      const resolution = resolutionRef.current;
      const { start, end } = getPeriodRange(period);
      const statPeriod = period === "12m" || period === "year" ? "month" : "hour";

      const requestedIds = resolution.map((r) => r.statId);
      const stats = await fetchStatistics(connection, requestedIds, start, end, statPeriod);

      const devices: DeviceEnergy[] = [];
      for (const room of ROOMS) {
        for (const dev of room.devices) {
          const res = resolution.find((r) => r.entityId === dev.entityId);
          if (!res) continue;
          const entries = stats[res.statId] ?? [];
          const kWh =
            res.mode === "energy" ? toKwh(sumChange(entries), res.unit) : integratePower(entries);
          devices.push({
            entityId: dev.entityId,
            label: dev.label,
            roomId: room.id,
            roomLabel: room.label,
            roomColor: room.color,
            kWh,
            source: res.mode,
          });
        }
      }

      const total = devices.reduce((s, d) => s + d.kWh, 0);

      const rooms: RoomEnergy[] = ROOMS.map((room) => {
        const kWh = devices.filter((d) => d.roomId === room.id).reduce((s, d) => s + d.kWh, 0);
        return {
          id: room.id,
          label: room.label,
          color: room.color,
          icon: room.icon,
          kWh,
          share: total > 0 ? kWh / total : 0,
        };
      })
        .filter((r) => r.kWh > 0)
        .sort((a, b) => b.kWh - a.kWh);

      setData({
        devices: devices.sort((a, b) => b.kWh - a.kWh),
        rooms,
        total,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("[Auswertung] device energy error:", err);
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
