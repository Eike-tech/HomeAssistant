"use client";

import { useEffect, useCallback, useRef } from "react";
import { useEntityNumericState } from "./useEntity";
import { ENTITIES } from "@/lib/hass/entities";

const STORAGE_KEY = "ha-dashboard-daily-records";

export interface DailyRecord {
  date: string; // "2026-04-04"
  consumption: number; // kWh for that day
  cost: number; // EUR for that day
  updatedAt: string; // ISO timestamp of last update
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadRecords(): DailyRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveRecords(records: DailyRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/**
 * Records daily consumption & cost values to localStorage.
 *
 * How it works:
 * - On each render, reads the current daily consumption & cost from real-time entities
 * - Updates today's record (values only go up during the day)
 * - Previous days' records are already "final" (last value before midnight reset)
 * - Keeps up to 400 days of history
 */
export function useRecordedHistory() {
  const consumption = useEntityNumericState(ENTITIES.energy.dailyConsumption);
  const cost = useEntityNumericState(ENTITIES.energy.dailyCost);
  const lastWriteRef = useRef<string>("");

  const record = useCallback(() => {
    if (consumption === null && cost === null) return;

    const today = todayStr();
    // Debounce: only write once per minute
    const now = new Date().toISOString();
    if (lastWriteRef.current === today + now.slice(0, 16)) return;
    lastWriteRef.current = today + now.slice(0, 16);

    const records = loadRecords();
    const existingIdx = records.findIndex((r) => r.date === today);

    const newRecord: DailyRecord = {
      date: today,
      consumption: consumption ?? 0,
      cost: cost ?? 0,
      updatedAt: now,
    };

    if (existingIdx >= 0) {
      // Update today — keep the higher value (values only go up during the day)
      const existing = records[existingIdx];
      records[existingIdx] = {
        ...newRecord,
        consumption: Math.max(existing.consumption, newRecord.consumption),
        cost: Math.max(existing.cost, newRecord.cost),
      };
    } else {
      records.push(newRecord);
    }

    // Keep max 400 days, sorted by date
    records.sort((a, b) => a.date.localeCompare(b.date));
    const trimmed = records.slice(-400);

    saveRecords(trimmed);
  }, [consumption, cost]);

  // Record on every entity update
  useEffect(() => {
    record();
  }, [record]);

  // Also record every 60 seconds to catch updates while page is open
  useEffect(() => {
    const interval = setInterval(record, 60_000);
    return () => clearInterval(interval);
  }, [record]);
}

/**
 * Returns all recorded daily history entries.
 */
export function getRecordedHistory(): DailyRecord[] {
  return loadRecords();
}
