import { Connection } from "home-assistant-js-websocket";

// ── Energy source types (subset relevant for grid + cost) ──────────

export interface EnergyFlowFrom {
  stat_energy_from: string;
  stat_cost: string | null;
  entity_energy_price?: string;
  number_energy_price?: number;
}

export interface EnergyFlowTo {
  stat_energy_to: string;
  stat_compensation: string | null;
}

export interface EnergyGridSource {
  type: "grid";
  flow_from: EnergyFlowFrom[];
  flow_to: EnergyFlowTo[];
  cost_adjustment_day?: number;
}

export interface EnergySolarSource {
  type: "solar";
  stat_energy_from: string;
  config_entry_solar_forecast?: string[] | null;
}

export interface EnergyBatterySource {
  type: "battery";
  stat_energy_from: string;
  stat_energy_to: string;
}

export interface EnergyGasSource {
  type: "gas";
  stat_energy_from: string;
  stat_cost?: string | null;
}

export type EnergySource =
  | EnergyGridSource
  | EnergySolarSource
  | EnergyBatterySource
  | EnergyGasSource
  | { type: string; [key: string]: unknown };

export interface EnergyDeviceConsumption {
  stat_consumption: string;
  name?: string;
  included_in_stat?: string;
}

export interface EnergyPrefs {
  energy_sources: EnergySource[];
  device_consumption: EnergyDeviceConsumption[];
}

// ── API ────────────────────────────────────────────────────────────

/**
 * Fetch the user's HA Energy dashboard preferences. The `device_consumption`
 * list and `energy_sources[]` are exactly what the HA Energy panel reads to
 * compute "Today's consumption", "Today's cost", and per-device totals.
 */
export async function fetchEnergyPrefs(connection: Connection): Promise<EnergyPrefs> {
  return connection.sendMessagePromise<EnergyPrefs>({ type: "energy/get_prefs" });
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Pick the grid energy + cost statistic IDs from the prefs. Returns null
 * fields when the user hasn't configured a grid source.
 */
export function getGridStatIds(prefs: EnergyPrefs): {
  consumption: string | null;
  cost: string | null;
  feedIn: string | null;
  compensation: string | null;
} {
  const gridSource = prefs.energy_sources.find(
    (s): s is EnergyGridSource => (s as { type: string }).type === "grid"
  );
  if (!gridSource) {
    return { consumption: null, cost: null, feedIn: null, compensation: null };
  }
  const flow = gridSource.flow_from[0];
  const out = gridSource.flow_to[0];
  return {
    consumption: flow?.stat_energy_from ?? null,
    cost: flow?.stat_cost ?? null,
    feedIn: out?.stat_energy_to ?? null,
    compensation: out?.stat_compensation ?? null,
  };
}
