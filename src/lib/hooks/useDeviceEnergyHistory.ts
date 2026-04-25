"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useHass } from "./useHass";
import { fetchStatistics } from "@/lib/hass/history";
import { getAllStatisticIds } from "@/lib/hass/resolveStatisticIds";
import { fetchEnergyPrefs } from "@/lib/hass/energyPrefs";
import { ROOMS, deriveEnergyCandidates } from "@/lib/hass/rooms";
import { getPeriodRange, type TimePeriod } from "./useHistoryData";

export interface DeviceEnergy {
  entityId: string;
  label: string;
  roomId: string;
  roomLabel: string;
  roomColor: string;
  kWh: number;
  /** "prefs" = configured under HA Energy "Individual devices"; "counter" = auto-discovered kWh sibling */
  source: "prefs" | "counter";
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
  /** Devices in ROOMS that we couldn't resolve to any kWh statistic. */
  unmappedLabels: string[];
  loading: boolean;
  error: string | null;
}

interface DeviceResolution {
  entityId: string;
  statId: string;
  source: "prefs" | "counter";
  unit: string | null;
}

const empty: DeviceEnergyHistory = {
  devices: [],
  rooms: [],
  total: 0,
  unmappedLabels: [],
  loading: true,
  error: null,
};

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
  const resolutionRef = useRef<{ resolution: DeviceResolution[]; unmapped: string[] } | null>(null);

  const load = useCallback(async () => {
    if (!connection) return;
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // ── Resolve once per session ─────────────────────────────
      if (!resolutionRef.current) {
        const [prefs, allStats] = await Promise.all([
          fetchEnergyPrefs(connection).catch((e) => {
            console.warn("[Auswertung] energy/get_prefs failed, will fall back to counter discovery", e);
            return null;
          }),
          getAllStatisticIds(connection),
        ]);

        const prefsStatIds = new Set(prefs?.device_consumption.map((d) => d.stat_consumption) ?? []);
        const byId = new Map(allStats.map((s) => [s.statistic_id, s]));

        const resolution: DeviceResolution[] = [];
        const unmapped: string[] = [];

        for (const room of ROOMS) {
          for (const dev of room.devices) {
            const candidates = deriveEnergyCandidates(dev.entityId);

            // 1) Prefer a candidate that's in HA Energy "Individual devices"
            let statId = candidates.find((c) => prefsStatIds.has(c));
            let source: "prefs" | "counter" = "prefs";

            // 2) Fallback: any kWh-counter sibling that exists in long-term stats
            if (!statId) {
              for (const c of candidates) {
                const info = byId.get(c);
                if (
                  info &&
                  info.has_sum &&
                  info.unit_of_measurement &&
                  ["kwh", "wh", "mwh"].includes(info.unit_of_measurement.toLowerCase())
                ) {
                  statId = c;
                  source = "counter";
                  break;
                }
              }
            }

            if (statId) {
              const info = byId.get(statId);
              resolution.push({
                entityId: dev.entityId,
                statId,
                source,
                unit: info?.unit_of_measurement ?? "kWh",
              });
            } else {
              unmapped.push(dev.label);
            }
          }
        }

        resolutionRef.current = { resolution, unmapped };
        console.log(
          "[Auswertung] Device→energy mapping:",
          resolution.map((r) => `${r.entityId} → ${r.statId} (${r.source}, ${r.unit ?? "?"})`)
        );
        if (unmapped.length > 0) {
          console.log("[Auswertung] Unmapped devices (no kWh counter found):", unmapped);
        }
      }

      const { resolution, unmapped } = resolutionRef.current;

      if (resolution.length === 0) {
        setData({
          devices: [],
          rooms: [],
          total: 0,
          unmappedLabels: unmapped,
          loading: false,
          error: null,
        });
        return;
      }

      // ── Fetch statistics for all resolved IDs ────────────────
      const { start, end } = getPeriodRange(period);
      const statPeriod: "hour" | "month" = period === "12m" || period === "year" ? "month" : "hour";

      const ids = resolution.map((r) => r.statId);
      const stats = await fetchStatistics(connection, ids, start, end, statPeriod);

      const devices: DeviceEnergy[] = [];
      for (const room of ROOMS) {
        for (const dev of room.devices) {
          const res = resolution.find((r) => r.entityId === dev.entityId);
          if (!res) continue;
          const entries = stats[res.statId] ?? [];
          const sum = entries.reduce((s, e) => s + Math.max(0, e.change ?? 0), 0);
          const kWh = toKwh(sum, res.unit);
          devices.push({
            entityId: dev.entityId,
            label: dev.label,
            roomId: room.id,
            roomLabel: room.label,
            roomColor: room.color,
            kWh,
            source: res.source,
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
        unmappedLabels: unmapped,
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
