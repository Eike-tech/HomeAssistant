"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { PeriodSelector } from "@/components/history/PeriodSelector";
import { KpiRow } from "@/components/history/KpiRow";
import { ConsumptionChart } from "@/components/history/ConsumptionChart";
import { CostChart } from "@/components/history/CostChart";
import { TopConsumersCard } from "@/components/auswertung/TopConsumersCard";
import { RoomHistoryCard } from "@/components/auswertung/RoomHistoryCard";
import { HeatmapCard } from "@/components/auswertung/HeatmapCard";
import { StandbyCard } from "@/components/auswertung/StandbyCard";
import { type TimePeriod } from "@/lib/hooks/useHistoryData";
import { useTibberHistory } from "@/lib/hooks/useTibberHistory";
import { useDeviceEnergyHistory } from "@/lib/hooks/useDeviceEnergyHistory";
import { useStandbyAnalysis } from "@/lib/hooks/useStandbyAnalysis";

const PERIOD_LABELS: Record<TimePeriod, string> = {
  today: "Heute",
  "7d": "Letzte 7 Tage",
  "30d": "Letzte 30 Tage",
  year: "Aktuelles Jahr",
};

export function AuswertungPage() {
  const [period, setPeriod] = useState<TimePeriod>("today");
  const data = useTibberHistory(period);
  const deviceData = useDeviceEnergyHistory(period);
  const standby = useStandbyAnalysis(period);

  const periodLabel = PERIOD_LABELS[period];

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
      <Header />

      <div className="flex items-center justify-between gap-4">
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <KpiRow kpis={data.kpis} loading={data.loading} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ConsumptionChart data={data.consumption} loading={data.loading} />
        <CostChart data={data.cost} loading={data.loading} />
      </div>

      {deviceData.unmappedLabels.length > 0 && (
        <div className="text-[10px] text-muted-foreground/70 -mb-3 px-1">
          Ohne kWh-Zähler (in HA Energie nicht hinterlegt): {deviceData.unmappedLabels.join(", ")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TopConsumersCard data={deviceData} periodLabel={periodLabel} />
        <RoomHistoryCard data={deviceData} periodLabel={periodLabel} />
      </div>

      <HeatmapCard />

      <StandbyCard data={standby} />
    </main>
  );
}
