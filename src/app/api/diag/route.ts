// Diagnostic endpoint for debugging server-side HA connectivity from inside the addon.
// Reachable only via HA Ingress (the LAN middleware blocks it). Returns:
//   - which env vars are visible to the server process
//   - DNS lookup for the supervisor / homeassistant hostnames
//   - one quick fetch against each candidate base URL with the actual error message
//
// Pure read-only; deliberately verbose so we can copy/paste the response into a bug report.

import { promises as dns } from "node:dns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function envSnapshot(key: string): { set: boolean; length: number } {
  const v = process.env[key];
  return { set: v !== undefined && v !== "", length: v?.length ?? 0 };
}

async function lookupHost(host: string): Promise<string | { error: string }> {
  try {
    const { address, family } = await dns.lookup(host);
    return `${address} (IPv${family})`;
  } catch (err) {
    return { error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) };
  }
}

interface ProbeResult {
  url: string;
  ok?: boolean;
  status?: number;
  ms?: number;
  error?: string;
}

async function probe(url: string, authHeader: string | null): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: authHeader ? { Authorization: authHeader } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return { url, ok: res.ok, status: res.status, ms: Date.now() - t0 };
  } catch (err) {
    return {
      url,
      ms: Date.now() - t0,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }
}

export async function GET() {
  const env = {
    SUPERVISOR_TOKEN: envSnapshot("SUPERVISOR_TOKEN"),
    HASS_TOKEN: envSnapshot("HASS_TOKEN"),
    HASS_URL: process.env["HASS_URL"] ?? null,
    TIBBER_TOKEN: envSnapshot("TIBBER_TOKEN"),
    NODE_ENV: process.env["NODE_ENV"] ?? null,
    NEXT_PUBLIC_ASSET_PREFIX: process.env["NEXT_PUBLIC_ASSET_PREFIX"] ?? null,
  };

  const dnsResults = {
    supervisor: await lookupHost("supervisor"),
    homeassistant: await lookupHost("homeassistant"),
    "homeassistant.local": await lookupHost("homeassistant.local"),
  };

  const supToken = process.env["SUPERVISOR_TOKEN"];
  const hassToken = process.env["HASS_TOKEN"];
  const probes = await Promise.all([
    probe("http://supervisor/core/api/", supToken ? `Bearer ${supToken}` : null),
    probe("http://homeassistant:8123/api/", hassToken ? `Bearer ${hassToken}` : null),
    probe(
      `${(process.env["HASS_URL"] ?? "").replace(/\/$/, "")}/api/`,
      hassToken ? `Bearer ${hassToken}` : null
    ),
  ]);

  const payload = {
    env,
    dns: dnsResults,
    probes,
    timestamp: new Date().toISOString(),
  };
  // Also log to stdout so we can read the diagnosis from `addon logs` even if the HTTP
  // response is killed by the watchdog.
  process.stdout.write(`[diag] ${JSON.stringify(payload)}\n`);
  return Response.json(payload);
}
