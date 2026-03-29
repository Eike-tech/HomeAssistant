import { Connection } from "home-assistant-js-websocket";

export interface StatisticsResult {
  [entityId: string]: Array<{
    start: string;
    end: string;
    mean?: number;
    min?: number;
    max?: number;
    sum?: number;
    state?: number;
    change?: number;
  }>;
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
