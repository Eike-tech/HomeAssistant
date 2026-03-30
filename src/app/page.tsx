"use client";

import { useState } from "react";
import { HassProvider } from "@/lib/hooks/useHass";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, type Page } from "@/components/layout/Sidebar";
import { DashboardContent } from "@/components/pages/DashboardContent";
import { EnergiePage } from "@/components/pages/EnergiePage";

export default function DashboardPage() {
  const [activePage, setActivePage] = useState<Page>("dashboard");

  return (
    <HassProvider>
      <TooltipProvider>
        <div className="flex min-h-screen">
          <Sidebar activePage={activePage} onNavigate={setActivePage} />
          <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {activePage === "dashboard" && <DashboardContent />}
            {activePage === "energie" && <EnergiePage />}
          </div>
        </div>
      </TooltipProvider>
    </HassProvider>
  );
}
