import { Connection } from "home-assistant-js-websocket";

export interface EnergyDeviceConsumption {
  stat_consumption: string;
  name?: string;
  included_in_stat?: string;
}

export interface EnergyPrefs {
  energy_sources: unknown[];
  device_consumption: EnergyDeviceConsumption[];
}

/**
 * Fetch the user's HA Energy dashboard preferences. The `device_consumption`
 * list is the authoritative mapping of "Individual devices" the user
 * configured under Settings → Dashboards → Energy.
 */
export async function fetchEnergyPrefs(connection: Connection): Promise<EnergyPrefs> {
  return connection.sendMessagePromise<EnergyPrefs>({ type: "energy/get_prefs" });
}
