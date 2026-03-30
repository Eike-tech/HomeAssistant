"use client";

import { useEntityState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";

function StatusPill({ label, active, color }: { label: string; active: boolean; color?: string }) {
  const activeColor = color ?? "green";
  const colorClasses = active
    ? `bg-${activeColor}-400/15 text-${activeColor}-400`
    : "bg-white/[0.04] text-muted-foreground";
  const dotColor = active ? `bg-${activeColor}-400` : "bg-muted-foreground/40";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${colorClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

const chargeStatusLabels: Record<string, { label: string; active: boolean }> = {
  charging: { label: "Lädt", active: true },
  stopped: { label: "Gestoppt", active: false },
  complete: { label: "Voll", active: false },
  disconnected: { label: "Getrennt", active: false },
};

export function ChargeStatus() {
  const chargingStatus = useEntityState(ENTITIES.car.chargingStatus);
  const plugged = useEntityState(ENTITIES.car.plugged);
  const cable = useEntityState(ENTITIES.car.cableConnected);

  const chargeInfo = chargeStatusLabels[chargingStatus ?? ""] ?? { label: chargingStatus ?? "—", active: false };

  return (
    <div className="flex flex-wrap gap-2">
      <StatusPill label="Stecker" active={plugged === "on"} />
      <StatusPill label="Kabel" active={cable === "on"} />
      <StatusPill label={chargeInfo.label} active={chargeInfo.active} />
    </div>
  );
}
