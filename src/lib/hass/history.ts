import { Connection } from "home-assistant-js-websocket";

export interface StatisticsEntry {
  start: string | number;
  end: string | number;
  mean?: number;
  min?: number;
  max?: number;
  sum?: number;
  state?: number;
  change?: number;
}

export interface StatisticsResult {
  [entityId: string]: StatisticsEntry[];
}

export interface StatisticIdInfo {
  statistic_id: string;
  name: string | null;
  source: string;
  unit_of_measurement: string | null;
  has_mean: boolean;
  has_sum: boolean;
}

export async function fetchStatistics(
  connection: Connection,
  entityIds: string[],
  startTime: Date,
  endTime: Date,
  period: "5minute" | "hour" | "day" | "month" = "hour"
): Promise<StatisticsResult> {
  return connection.sendMessagePromise({
    type: "recorder/statistics_during_period",
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    statistic_ids: entityIds,
    period,
  });
}

export async function listStatisticIds(
  connection: Connection
): Promise<StatisticIdInfo[]> {
  return connection.sendMessagePromise({
    type: "recorder/list_statistic_ids",
  });
}
