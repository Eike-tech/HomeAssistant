// Server-only Tibber Cloud GraphQL client.
// Lives in src/lib/server so it never gets bundled for the browser.

const ENDPOINT = "https://api.tibber.com/v1-beta/gql";

export type TibberResolution = "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUAL";

export interface TibberConsumptionNode {
  from: string; // ISO 8601, bucket start (local timezone offset baked in)
  to: string;
  consumption: number | null; // kWh
  cost: number | null; // EUR (Tibber tariff incl. taxes/fees)
  unitPrice: number | null; // EUR/kWh
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

interface ConsumptionResponse {
  viewer: {
    homes: Array<{
      consumption: { nodes: TibberConsumptionNode[] } | null;
    }>;
  };
}

const QUERY = `query($resolution: EnergyResolution!, $last: Int!) {
  viewer {
    homes {
      consumption(resolution: $resolution, last: $last) {
        nodes { from to consumption cost unitPrice }
      }
    }
  }
}`;

export async function fetchTibberConsumption(
  resolution: TibberResolution,
  last: number
): Promise<TibberConsumptionNode[]> {
  const token = process.env.TIBBER_TOKEN;
  if (!token) {
    throw new Error("TIBBER_TOKEN is not configured");
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: QUERY, variables: { resolution, last } }),
    // Avoid Next.js fetch caching — we always want fresh data
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tibber API ${res.status}: ${text || res.statusText}`);
  }

  const json: GraphQLResponse<ConsumptionResponse> = await res.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(`Tibber GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  const nodes = json.data?.viewer?.homes?.[0]?.consumption?.nodes;
  return nodes ?? [];
}
