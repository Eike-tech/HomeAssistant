import { Connection } from "home-assistant-js-websocket";
import { listStatisticIds, type StatisticIdInfo } from "./history";

export type StatisticIdMap = Record<string, string>;

let cachedAllIds: StatisticIdInfo[] | null = null;

export async function getAllStatisticIds(connection: Connection): Promise<StatisticIdInfo[]> {
  if (cachedAllIds) return cachedAllIds;
  cachedAllIds = await listStatisticIds(connection);
  return cachedAllIds;
}

export function clearStatisticIdsCache(): void {
  cachedAllIds = null;
}

/**
 * Resolve a set of entity IDs to their actual statistic IDs.
 * Tries exact match first, then partial (sensor name) match, then falls back to the entity ID.
 */
export async function resolveStatisticIds(
  connection: Connection,
  entityKeys: Record<string, string>
): Promise<StatisticIdMap> {
  const allIds = await getAllStatisticIds(connection);
  const resolved: StatisticIdMap = {};

  for (const [key, entityId] of Object.entries(entityKeys)) {
    const exact = allIds.find((s) => s.statistic_id === entityId);
    if (exact) {
      resolved[key] = exact.statistic_id;
      continue;
    }
    const parts = entityId.split(".");
    const sensorName = parts[parts.length - 1];
    const partial = allIds.find((s) => s.statistic_id.includes(sensorName));
    resolved[key] = partial ? partial.statistic_id : entityId;
  }

  return resolved;
}
