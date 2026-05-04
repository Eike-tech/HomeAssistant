import { NextResponse } from "next/server";
import { fetchTibberPrices } from "@/lib/server/tibberClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const tokenSet = !!process.env.TIBBER_TOKEN;

  try {
    const { today, tomorrow } = await fetchTibberPrices();
    console.log(
      `[api/tibber/prices] success today=${today.length} tomorrow=${tomorrow.length}`
    );
    return NextResponse.json({ today, tomorrow });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message.includes("not configured") ? 503 : 502;
    console.error(`[api/tibber/prices] error status=${status}: ${message}`);
    return NextResponse.json({ error: message, tokenSet }, { status });
  }
}
