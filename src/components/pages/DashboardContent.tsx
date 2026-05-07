"use client";

import { Header } from "@/components/layout/Header";
import { EnergyHero } from "@/components/energy/EnergyHero";
import { SpotCard } from "@/components/energy/SpotCard";
import { TeslaCard } from "@/components/car/TeslaCard";
import { ClimateCard } from "@/components/climate/ClimateCard";
import { ConsumersList } from "@/components/energy/ConsumersList";
import { ScenesGrid } from "@/components/scenes/ScenesGrid";

export function DashboardContent() {
  return (
    <main className="mx-auto max-w-[1400px] space-y-6 p-5 md:p-8">
      <Header />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-8"><EnergyHero /></div>
        <div className="md:col-span-4"><SpotCard /></div>
        <div className="md:col-span-6"><TeslaCard /></div>
        <div className="md:col-span-6"><ClimateCard /></div>
        <div className="md:col-span-7"><ConsumersList /></div>
        <div className="md:col-span-5"><ScenesGrid /></div>
      </div>
    </main>
  );
}
