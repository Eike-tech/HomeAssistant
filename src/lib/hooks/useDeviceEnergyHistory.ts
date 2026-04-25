"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useHass } from "./useHass";
import { fetchStatistics, type StatisticsEntry } from "@/lib/hass/history";
import { resolveStatisticIds, type StatisticIdMap } from "@/lib/hass/resolveStatisticIds";
import { ROOMS, ALL_DEVICE_ENTITY_IDS } from "@/lib/hass/rooms";
import { getPeriodRange, type TimePeriod } from "./useHistoryData";

export interface DeviceEnergy {
  entityId: string;
  label: string;
  roomId: string;
  roomLabel: string;
  roomColor: string;
  kWh: number;
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

function startToMs(start: string | number): number {
  if (typeof start === "string") return new Date(start).getTime();
  return start * 1000;
}

/** Integrate mean(W) over interval-hours into kWh */
function integrate(entries: StatisticsEntry[]): number {
  let kWh = 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const startMs = startToMs(e.start);
    const endMs = e.end !== undefined ? startToMs(e.end) : startMs + 3600 * 1000;
    const hours = Math.max(0, (endMs - startMs) / 3_600_000);
    const meanW = e.mean ?? 0;
    kWh += (meanW * hours) / 1000;
  }
  return kWh;
}

const emptyState: DeviceEnergyHistory = {
  devices: [],
  rooms: [],
  total: 0,
  loading: true,
  error: null,
};

export function useDeviceEnergyHistory(period: TimePeriod): DeviceEnergyHistory {
  const { connection } = useHass();
  const [data, setData] = useState<DeviceEnergyHistory>(emptyState);
  const resolvedIdsRef = useRef<StatisticIdMap | null>(null);

  const load = useCallback(async () => {
    if (!connection) return;
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      if (!resolvedIdsRef.current) {
        const map: Record<string, string> = {};
        ALL_DEVICE_ENTITY_IDS.forEach((id) => (map[id] = id));
        resolvedIdsRef.current = await resolveStatisticIds(connection, map);
      }
      const ids = resolvedIdsRef.current;

      const { start, end } = getPeriodRange(period);
      const statPeriod = period === "12m" || period === "year" ? "day" : "hour";

      const requestedIds = ALL_DEVICE_ENTITY_IDS.map((id) => ids[id] ?? id);
      const stats = await fetchStatistics(connection, requestedIds, start, end, statPeriod);

      const devices: DeviceEnergy[] = [];
      for (const room of ROOMS) {
        for (const dev of room.devices) {
          const statId = ids[dev.entityId] ?? dev.entityId;
          const entries = stats[statId] ?? stats[dev.entityId] ?? [];
          const kWh = integrate(entries);
          devices.push({
            entityId: dev.entityId,
            label: dev.label,
            roomId: room.id,
            roomLabel: room.label,
            roomColor: room.color,
            kWh,
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
