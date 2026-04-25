"use client";

import { useEffect, useState, useCallback } from "react";
import { ROOMS } from "@/lib/hass/rooms";
import { getDailyRange, getEarliestDate, onEnergyUpdate } from "@/lib/storage/energyStore";
import { getPeriodRange, type TimePeriod } from "./useHistoryData";

export interface DeviceEnergy {
  entityId: string;
  label: string;
  roomId: string;
  roomLabel: string;
  roomColor: string;
  kWh: number;
  /** Always "recorded" with the new persistent recorder. Kept for compatibility with the UI. */
  source: "recorded";
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
  /** Earliest day with any recorded data (YYYY-MM-DD). null = nothing recorded yet. */
  recordedSince: string | null;
  loading: boolean;
  error: string | null;
}

const empty: DeviceEnergyHistory = {
  devices: [],
  rooms: [],
  total: 0,
  recordedSince: null,
  loading: true,
  error: null,
};

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ALL_DEVICE_IDS = ROOMS.flatMap((r) => r.devices.map((d) => d.entityId));

export function useDeviceEnergyHistory(period: TimePeriod): DeviceEnergyHistory {
  const [data, setData] = useState<DeviceEnergyHistory>(empty);

  const load = useCallback(async () => {
    try {
      const { start, end } = getPeriodRange(period);
      const startKey = localDateKey(start);
      const endKey = localDateKey(end);

      const [entries, earliest] = await Promise.all([
        getDailyRange(ALL_DEVICE_IDS, startKey, endKey),
        getEarliestDate(ALL_DEVICE_IDS),
      ]);

      const totalsByDevice = new Map<string, number>();
      for (const e of entries) {
        totalsByDevice.set(e.entityId, (totalsByDevice.get(e.entityId) ?? 0) + e.kWh);
      }

      const devices: DeviceEnergy[] = [];
      for (const room of ROOMS) {
        for (const dev of room.devices) {
          devices.push({
            entityId: dev.entityId,
            label: dev.label,
            roomId: room.id,
            roomLabel: room.label,
            roomColor: room.color,
            kWh: totalsByDevice.get(dev.entityId) ?? 0,
            source: "recorded",
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
        recordedSince: earliest,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("[Auswertung] device energy load error:", err);
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

  // Re-load when the recorder writes new samples
  useEffect(() => {
    return onEnergyUpdate(() => {
      load();
    });
  }, [load]);

  return data;
}
