import { NextRequest, NextResponse } from "next/server";
import { fetchTibberConsumption, type TibberResolution } from "@/lib/server/tibberClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Period = "today" | "7d" | "30d" | "year";

function mapPeriod(period: string): { resolution: TibberResolution; last: number } {
  switch (period as Period) {
    case "today":
      // 48 hourly buckets cover today + yesterday-same-time for prev-period KPI
      return { resolution: "HOURLY", last: 48 };
    case "7d":
      // 14 days of hourly buckets cover current + previous 7-day window
      return { resolution: "HOURLY", last: 336 };
    case "30d":
      return { resolution: "DAILY", last: 60 };
    case "year":
      // ~2 years of daily buckets to cover current year + previous year same range
      return { resolution: "DAILY", last: 730 };
    default:
      return { resolution: "HOURLY", last: 48 };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "today";
  const { resolution, last } = mapPeriod(period);

  try {
    const nodes = await fetchTibberConsumption(resolution, last);
    return NextResponse.json({ resolution, period, nodes });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message.includes("not configured") ? 503 : 502;
    console.error("[api/tibber] error:", message);
    return NextResponse.json({ error: message }, { status });
  }
}
