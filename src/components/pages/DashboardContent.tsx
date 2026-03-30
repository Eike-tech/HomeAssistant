"use client";

import { Header } from "@/components/layout/Header";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EnergyOverviewCard } from "@/components/energy/EnergyOverviewCard";
import { SpotPriceChart } from "@/components/energy/SpotPriceChart";
import { CarOverviewCard } from "@/components/car/CarOverviewCard";
import { ClimateCard } from "@/components/climate/ClimateCard";
import { LightingCard } from "@/components/lighting/LightingCard";
import { MediaCard } from "@/components/media/MediaCard";
import { VacuumCard } from "@/components/vacuum/VacuumCard";
import { NetworkCard } from "@/components/network/NetworkCard";
import { HouseholdCard } from "@/components/household/HouseholdCard";

export function DashboardContent() {
  return (
    <main className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
      <Header />
      <DashboardShell>
        <EnergyOverviewCard />
        <CarOverviewCard />
        <div className="space-y-5">
          <ClimateCard />
          <VacuumCard />
        </div>

        <SpotPriceChart />
        <LightingCard />

        <div className="space-y-5">
          <MediaCard />
          <NetworkCard />
          <HouseholdCard />
        </div>
      </DashboardShell>
    </main>
  );
}
