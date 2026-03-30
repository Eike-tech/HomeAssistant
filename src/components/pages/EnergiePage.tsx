"use client";

import { Header } from "@/components/layout/Header";
import { EnergyFlowDiagram } from "@/components/energy/SankeyDiagram";
import { TeslaChargingCard } from "@/components/energy/TeslaChargingCard";
import { EnergyStatsCard } from "@/components/energy/EnergyStatsCard";
import { EnhancedSpotPriceChart } from "@/components/energy/EnhancedSpotPriceChart";

export function EnergiePage() {

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
      <Header />

      {/* Energy Flow Diagram */}
      <EnergyFlowDiagram />

      {/* Tesla + Stats Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TeslaChargingCard />
        <EnergyStatsCard />
      </div>

      {/* Price Chart */}
      <EnhancedSpotPriceChart />
    </main>
  );
}
