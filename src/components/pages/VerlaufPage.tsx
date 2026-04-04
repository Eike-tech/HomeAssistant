"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { PeriodSelector } from "@/components/history/PeriodSelector";
import { KpiRow } from "@/components/history/KpiRow";
import { ConsumptionChart } from "@/components/history/ConsumptionChart";
import { CostChart } from "@/components/history/CostChart";
import { LoadCurveChart } from "@/components/history/LoadCurveChart";
import { SpotPriceHistoryChart } from "@/components/history/SpotPriceHistoryChart";
import { useHistoryData, type TimePeriod } from "@/lib/hooks/useHistoryData";

export function VerlaufPage() {
  const [period, setPeriod] = useState<TimePeriod>("7d");
  const data = useHistoryData(period);

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
      <Header />

      <PeriodSelector value={period} onChange={setPeriod} />

      <KpiRow kpis={data.kpis} loading={data.loading} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ConsumptionChart data={data.consumption} loading={data.loading} />
        <CostChart data={data.cost} loading={data.loading} />
      </div>

      <LoadCurveChart data={data.loadCurve} loading={data.loading} />

      <SpotPriceHistoryChart data={data.spotPrice} loading={data.loading} />
    </main>
  );
}
