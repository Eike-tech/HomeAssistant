"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { formatEnergy, formatCurrency } from "@/lib/utils/formatters";
import type { Kpis } from "@/lib/hooks/useHistoryData";

interface KpiRowProps {
  kpis: Kpis;
  loading: boolean;
}

function DeltaBadge({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const isDown = pct < 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
        isDown ? "bg-green-400/15 text-green-400" : "bg-red-400/15 text-red-400"
      }`}
    >
      {isDown ? <ArrowDown className="h-2.5 w-2.5" /> : <ArrowUp className="h-2.5 w-2.5" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function Skeleton() {
  return <div className="h-5 w-16 animate-pulse rounded bg-white/[0.06]" />;
}

const kpiItems = [
  { key: "totalConsumption", label: "Gesamtverbrauch" },
  { key: "totalCost", label: "Gesamtkosten" },
  { key: "avgDailyConsumption", label: "Ø Tagesverbrauch" },
  { key: "avgDailyCost", label: "Ø Tageskosten" },
] as const;

function formatKpiValue(key: string, value: number): string {
  if (key.toLowerCase().includes("cost")) return formatCurrency(value);
  return formatEnergy(value);
}

export function KpiRow({ kpis, loading }: KpiRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {kpiItems.map((item) => {
        const value = kpis[item.key];
        const prev = item.key === "totalConsumption"
          ? kpis.prevTotalConsumption
          : item.key === "totalCost"
            ? kpis.prevTotalCost
            : null;

        return (
          <div
            key={item.key}
            className="rounded-2xl bg-white/[0.04] px-3 py-2.5"
          >
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
            <div className="mt-1 flex items-center gap-2">
              {loading ? (
                <Skeleton />
              ) : (
                <>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatKpiValue(item.key, value)}
                  </span>
                  <DeltaBadge current={value} previous={prev} />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
