"use client";

import { Header } from "@/components/layout/Header";
import { EnergyHero } from "@/components/energy/EnergyHero";
import { SpotpreisHorizont } from "@/components/energy/SpotpreisHorizont";
import { ParticleFlow } from "@/components/energy/ParticleFlow";
import { RoomDots } from "@/components/energy/RoomDots";
import { EnergyStatsCard } from "@/components/energy/EnergyStatsCard";
import { RoomBreakdownCard } from "@/components/energy/RoomBreakdownCard";

export function EnergiePage() {

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
      <Header />

      <EnergyHero variant="energie" />

      <SpotpreisHorizont />

      <ParticleFlow />

      <RoomDots />

      {/* Detail-Views — bleiben vorerst, werden in Phase 5 als Cockpit-Zonen restyled */}
      <RoomBreakdownCard />
      <EnergyStatsCard />
    </main>
  );
}
