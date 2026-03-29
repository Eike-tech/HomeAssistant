"use client";

import { useEntityState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-green-400/15 text-green-400"
          : "bg-white/[0.04] text-muted-foreground"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-green-400" : "bg-muted-foreground/40"}`} />
      {label}
    </span>
  );
}

export function ChargeStatus() {
  const charging = useEntityState(ENTITIES.car.charging);
  const plugged = useEntityState(ENTITIES.car.plugged);
  const cableLock = useEntityState(ENTITIES.car.cableLock);

  return (
    <div className="flex flex-wrap gap-2">
      <StatusPill label="Stecker" active={plugged === "on"} />
      <StatusPill label="Kabel" active={cableLock === "locked"} />
      <StatusPill label={charging === "on" ? "Lädt" : "Standby"} active={charging === "on"} />
    </div>
  );
}
