"use client";

import { useEffect, useRef } from "react";
import { useHass } from "./useHass";
import { ALL_DEVICE_ENTITY_IDS } from "@/lib/hass/rooms";
import {
  addDailyKwh,
  getSamplerState,
  notifyEnergyUpdate,
  setSamplerState,
  type SamplerState,
} from "@/lib/storage/energyStore";

/** Maximum gap between two samples we still trust (30 min). */
const MAX_GAP_MS = 30 * 60 * 1000;

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parsePower(state: string | undefined): number | null {
  if (!state || state === "unknown" || state === "unavailable") return null;
  const num = parseFloat(state);
  return isNaN(num) ? null : num;
}

/**
 * Background recorder: observes power-state updates over the existing HA
 * WebSocket and persists per-device daily kWh totals to IndexedDB using
 * trapezoidal integration between consecutive samples.
 *
 * Mount once at the top of the app (e.g. in HassProvider's children) so it
 * keeps recording while the dashboard tab is open, regardless of which page
 * the user views.
 */
export function useEnergyRecorder(): void {
  const { entities, connection } = useHass();
  // In-memory cache of last sample per entity (avoids reading IDB on every WS update)
  const stateCacheRef = useRef<Map<string, SamplerState>>(new Map());
  const initializedRef = useRef(false);

  // Hydrate cache once when connection is up
  useEffect(() => {
    if (!connection || initializedRef.current) return;
    initializedRef.current = true;
    (async () => {
      for (const entityId of ALL_DEVICE_ENTITY_IDS) {
        try {
          const s = await getSamplerState(entityId);
          if (s) stateCacheRef.current.set(entityId, s);
        } catch (e) {
          console.warn("[Recorder] hydrate failed for", entityId, e);
        }
      }
    })();
  }, [connection]);

  // Process WS updates
  useEffect(() => {
    if (!connection) return;
    let anyWritten = false;

    const writes: Promise<unknown>[] = [];
    const cache = stateCacheRef.current;

    for (const entityId of ALL_DEVICE_ENTITY_IDS) {
      const entity = entities[entityId];
      if (!entity) continue;
      const power = parsePower(entity.state);
      if (power === null) continue;
      const tsString = entity.last_updated || entity.last_changed;
      if (!tsString) continue;
      const ts = Date.parse(tsString);
      if (isNaN(ts)) continue;

      const prev = cache.get(entityId);
      if (prev && prev.lastTimestamp === ts) continue; // no new data

      if (prev && prev.lastTimestamp > 0 && ts > prev.lastTimestamp) {
        const dtMs = ts - prev.lastTimestamp;
        if (dtMs > 0 && dtMs <= MAX_GAP_MS) {
          // Trapezoidal: (P1 + P2) / 2 × Δt
          const avgPower = (prev.lastPower + power) / 2;
          const kWhDelta = (avgPower * (dtMs / 3_600_000)) / 1000;
          if (kWhDelta > 0) {
            const dateKey = localDateKey(new Date(ts));
            writes.push(addDailyKwh(entityId, dateKey, kWhDelta));
            anyWritten = true;
          }
        }
      }

      const next: SamplerState = { entityId, lastTimestamp: ts, lastPower: power };
      cache.set(entityId, next);
      writes.push(setSamplerState(next));
    }

    if (writes.length > 0) {
      Promise.all(writes)
        .then(() => {
          if (anyWritten) notifyEnergyUpdate();
        })
        .catch((e) => console.warn("[Recorder] write failed", e));
    }
  }, [connection, entities]);
}
