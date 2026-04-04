"use client";

import { useState } from "react";
import { Database } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PeriodSelector } from "@/components/history/PeriodSelector";
import { KpiRow } from "@/components/history/KpiRow";
import { ConsumptionChart } from "@/components/history/ConsumptionChart";
import { CostChart } from "@/components/history/CostChart";
import { LoadCurveChart } from "@/components/history/LoadCurveChart";
import { SpotPriceHistoryChart } from "@/components/history/SpotPriceHistoryChart";
import { useHistoryData, type TimePeriod } from "@/lib/hooks/useHistoryData";
import { useRecordedHistory } from "@/lib/hooks/useRecordedHistory";

export function VerlaufPage() {
  const [period, setPeriod] = useState<TimePeriod>("7d");
  const data = useHistoryData(period);

  // Activate the recorder — writes daily values to localStorage
  useRecordedHistory();

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
      <Header />

      <div className="flex items-center justify-between gap-4">
        <PeriodSelector value={period} onChange={setPeriod} />
        {data.recordedDays > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Database className="h-3 w-3" />
            <span>{data.recordedDays} Tage aufgezeichnet</span>
          </div>
        )}
      </div>

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
