"use client";

const DB_NAME = "auswertung-energy";
const DB_VERSION = 1;
const STORE_DAILY = "daily";
const STORE_STATE = "state";

export interface DailyEntry {
  /** Composite key: `${entityId}:${date}` (date as YYYY-MM-DD) */
  key: string;
  entityId: string;
  date: string;
  kWh: number;
  samples: number;
}

export interface SamplerState {
  entityId: string;
  lastTimestamp: number; // ms epoch
  lastPower: number; // Watts
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB not available"));
  }

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DAILY)) {
        const daily = db.createObjectStore(STORE_DAILY, { keyPath: "key" });
        daily.createIndex("by_entity", "entityId");
        daily.createIndex("by_date", "date");
      }
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE, { keyPath: "entityId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function makeKey(entityId: string, date: string): string {
  return `${entityId}:${date}`;
}

export async function getSamplerState(entityId: string): Promise<SamplerState | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STATE, "readonly");
    const req = tx.objectStore(STORE_STATE).get(entityId);
    req.onsuccess = () => resolve(req.result as SamplerState | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function setSamplerState(state: SamplerState): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STATE, "readwrite");
    tx.objectStore(STORE_STATE).put(state);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Add `kWhDelta` to the (entityId, date) bucket. Creates the bucket if missing.
 */
export async function addDailyKwh(entityId: string, date: string, kWhDelta: number): Promise<void> {
  if (kWhDelta <= 0) return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DAILY, "readwrite");
    const store = tx.objectStore(STORE_DAILY);
    const key = makeKey(entityId, date);
    const getReq = store.get(key);
    getReq.onsuccess = () => {
      const existing = getReq.result as DailyEntry | undefined;
      const next: DailyEntry = existing
        ? { ...existing, kWh: existing.kWh + kWhDelta, samples: existing.samples + 1 }
        : { key, entityId, date, kWh: kWhDelta, samples: 1 };
      store.put(next);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Return all daily entries for the given entity IDs in [startDate..endDate] (inclusive).
 */
export async function getDailyRange(
  entityIds: string[],
  startDate: string,
  endDate: string
): Promise<DailyEntry[]> {
  const db = await openDb();
  const idSet = new Set(entityIds);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DAILY, "readonly");
    const store = tx.objectStore(STORE_DAILY);
    const idx = store.index("by_date");
    const range = IDBKeyRange.bound(startDate, endDate, false, false);
    const out: DailyEntry[] = [];
    const cursorReq = idx.openCursor(range);
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return;
      const v = cursor.value as DailyEntry;
      if (idSet.has(v.entityId)) out.push(v);
      cursor.continue();
    };
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Earliest recorded date across the given entity IDs. Useful to display "data
 * available since …" hints. Returns null if nothing recorded yet.
 */
export async function getEarliestDate(entityIds: string[]): Promise<string | null> {
  const db = await openDb();
  const idSet = new Set(entityIds);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DAILY, "readonly");
    const store = tx.objectStore(STORE_DAILY);
    const idx = store.index("by_date");
    let earliest: string | null = null;
    const cursorReq = idx.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return;
      const v = cursor.value as DailyEntry;
      if (idSet.has(v.entityId)) {
        if (!earliest || v.date < earliest) earliest = v.date;
      }
      cursor.continue();
    };
    tx.oncomplete = () => resolve(earliest);
    tx.onerror = () => reject(tx.error);
  });
}

// ── Notifier so consumers can refresh after a write ────────

const ENERGY_UPDATE_EVENT = "auswertung-energy-update";

export function notifyEnergyUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ENERGY_UPDATE_EVENT));
}

export function onEnergyUpdate(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const wrapped = () => handler();
  window.addEventListener(ENERGY_UPDATE_EVENT, wrapped);
  return () => window.removeEventListener(ENERGY_UPDATE_EVENT, wrapped);
}
