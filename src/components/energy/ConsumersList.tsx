"use client";

import { Monitor, Tv, Plug, WashingMachine, Snowflake, Router, Utensils, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntity } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";

interface ConsumerDef {
  id: string;
  entity: string;
  label: string;
  room: string;
  icon: LucideIcon;
}

const CONSUMERS: ConsumerDef[] = [
  { id: "ws", entity: ENTITIES.energy.eveEnergy1Power, label: "Workstation", room: "Arbeitszimmer", icon: Monitor },
  { id: "ent", entity: ENTITIES.energy.eveEnergy2Power, label: "Entertainment", room: "Wohnzimmer", icon: Tv },
  { id: "tro", entity: ENTITIES.energy.trocknerPower, label: "Trockner", room: "Hauswirtschaft", icon: WashingMachine },
  { id: "was", entity: ENTITIES.energy.waschmaschinePower, label: "Waschmaschine", room: "Hauswirtschaft", icon: WashingMachine },
  { id: "ges", entity: ENTITIES.energy.geschirrspulerPower, label: "Geschirrspüler", room: "Küche", icon: Utensils },
  { id: "gef", entity: ENTITIES.energy.gefrierschrankPower, label: "Gefrierschrank", room: "Küche", icon: Snowflake },
  { id: "net", entity: ENTITIES.energy.netzwerkPower, label: "Netzwerk", room: "Technik", icon: Router },
  { id: "aus", entity: ENTITIES.energy.shellyPower, label: "Außensteckdose", room: "Garten", icon: Plug },
];

function useWatts(entityId: string): number | null {
  const e = useEntity(entityId);
  if (!e) return null;
  const v = parseFloat(e.state);
  return Number.isNaN(v) ? null : v;
}

interface Row {
  def: ConsumerDef;
  watts: number;
}

function useConsumerRows(): Row[] {
  return CONSUMERS.map((def) => ({ def, watts: useWatts(def.entity) ?? 0 }));
}

export function ConsumersList() {
  const rows = useConsumerRows();
  const sorted = [...rows].sort((a, b) => b.watts - a.watts);
  const max = Math.max(1, ...sorted.map((r) => r.watts));
  const activeCount = sorted.filter((r) => r.watts > 1).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verbraucher · live</CardTitle>
        <span className="font-mono text-[11px] tabular-nums" style={{ color: "var(--cockpit-ink-dim)" }}>
          {activeCount}/{sorted.length} aktiv
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          {sorted.map(({ def, watts }) => {
            const Icon = def.icon;
            const active = watts > 1;
            const ink = active ? "var(--cockpit-ink)" : "var(--cockpit-ink-faint)";
            const subInk = active ? "var(--cockpit-ink-dim)" : "var(--cockpit-ink-faint)";
            return (
              <div
                key={def.id}
                className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: "1px solid var(--cockpit-edge-soft)" }}
              >
                <div
                  className="grid h-7 w-7 place-items-center rounded-lg"
                  style={{ background: "var(--surface-1)", color: ink }}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px]" style={{ color: ink }}>
                    {def.label}
                  </div>
                  <div className="font-mono text-[10px]" style={{ color: subInk }}>
                    {def.room}
                  </div>
                </div>
                <div
                  className="hidden h-1 w-[120px] flex-none overflow-hidden rounded-full sm:block"
                  style={{ background: "var(--surface-1)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (watts / max) * 100)}%`,
                      background: active ? "var(--cockpit-ink)" : "transparent",
                    }}
                  />
                </div>
                <div
                  className="w-[70px] text-right font-mono text-[13px] tabular-nums"
                  style={{ color: ink }}
                >
                  {active ? `${Math.round(watts)} W` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
