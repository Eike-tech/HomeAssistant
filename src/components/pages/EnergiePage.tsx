"use client";

import { Header } from "@/components/layout/Header";
import { EnergyFlowDiagram } from "@/components/energy/SankeyDiagram";
import { EnergyStatsCard } from "@/components/energy/EnergyStatsCard";
import { RoomBreakdownCard } from "@/components/energy/RoomBreakdownCard";
import { EnhancedSpotPriceChart } from "@/components/energy/EnhancedSpotPriceChart";

export function EnergiePage() {

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
      <Header />

      {/* Energy Flow Diagram */}
      <EnergyFlowDiagram />

      {/* Room breakdown — all consumers grouped by room */}
      <RoomBreakdownCard />

      {/* Energy Stats */}
      <EnergyStatsCard />

      {/* Price Chart */}
      <EnhancedSpotPriceChart />
    </main>
  );
}
