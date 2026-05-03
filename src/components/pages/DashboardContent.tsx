"use client";

import { Header } from "@/components/layout/Header";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EnergyHero } from "@/components/energy/EnergyHero";
import { SpotpreisHorizont } from "@/components/energy/SpotpreisHorizont";
import { ParticleFlow } from "@/components/energy/ParticleFlow";
import { RoomDots } from "@/components/energy/RoomDots";
import { TeslaCockpit } from "@/components/car/TeslaCockpit";
import { EnergyOverviewCard } from "@/components/energy/EnergyOverviewCard";
import { CarOverviewCard } from "@/components/car/CarOverviewCard";
import { ClimateCard } from "@/components/climate/ClimateCard";


import { VacuumCard } from "@/components/vacuum/VacuumCard";
import { NetworkCard } from "@/components/network/NetworkCard";
import { HouseholdCard } from "@/components/household/HouseholdCard";
import { PetsCard } from "@/components/pets/PetsCard";

export function DashboardContent() {
  return (
    <main className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
      <Header />
      <EnergyHero variant="dashboard" />
      <TeslaCockpit />
      <ParticleFlow />
      <RoomDots />
      <SpotpreisHorizont />
      <DashboardShell>
        <EnergyOverviewCard />
        <CarOverviewCard />
        <div className="space-y-5">
          <ClimateCard />
          <PetsCard />
          <VacuumCard />
        </div>
        <div className="space-y-5">
          <NetworkCard />
          <HouseholdCard />
        </div>
      </DashboardShell>
    </main>
  );
}
