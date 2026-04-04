"use client";

import { Dog, MapPin, Battery, BatteryCharging, Moon, Activity, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntity, useEntityNumericState, useEntityState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";
import { formatPercent } from "@/lib/utils/formatters";

interface PetData {
  name: string;
  trackerEntity: string;
  batteryEntity: string;
  statusEntity: string;
  activityEntity: string;
  goalEntity: string;
  daySleepEntity: string;
  nightSleepEntity: string;
  chargingEntity: string;
  powerSavingEntity: string;
}

const pets: PetData[] = [
  {
    name: "Nala",
    trackerEntity: ENTITIES.pets.nalaTracker,
    batteryEntity: ENTITIES.pets.nalaBattery,
    statusEntity: ENTITIES.pets.nalaStatus,
    activityEntity: ENTITIES.pets.nalaActivity,
    goalEntity: ENTITIES.pets.nalaGoal,
    daySleepEntity: ENTITIES.pets.nalaDaySleep,
    nightSleepEntity: ENTITIES.pets.nalaNightSleep,
    chargingEntity: ENTITIES.pets.nalaCharging,
    powerSavingEntity: ENTITIES.pets.nalaPowerSaving,
  },
  {
    name: "Biene",
    trackerEntity: ENTITIES.pets.bieneTracker,
    batteryEntity: ENTITIES.pets.bieneBattery,
    statusEntity: ENTITIES.pets.bieneStatus,
    activityEntity: ENTITIES.pets.bieneActivity,
    goalEntity: ENTITIES.pets.bieneGoal,
    daySleepEntity: ENTITIES.pets.bieneDaySleep,
    nightSleepEntity: ENTITIES.pets.bieneNightSleep,
    chargingEntity: ENTITIES.pets.bieneCharging,
    powerSavingEntity: ENTITIES.pets.bienePowerSaving,
  },
];

function formatMin(minutes: number | null): string {
  if (minutes === null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function PetTile({ pet }: { pet: PetData }) {
  const tracker = useEntity(pet.trackerEntity);
  const battery = useEntityNumericState(pet.batteryEntity);
  const activity = useEntityNumericState(pet.activityEntity);
  const goal = useEntityNumericState(pet.goalEntity);
  const daySleep = useEntityNumericState(pet.daySleepEntity);
  const nightSleep = useEntityNumericState(pet.nightSleepEntity);
  const charging = useEntityState(pet.chargingEntity);
  const powerSaving = useEntityState(pet.powerSavingEntity);

  const isHome = tracker?.state === "home";
  const isCharging = charging === "on";
  const activityPct = activity !== null && goal !== null && goal > 0
    ? Math.min(100, Math.round((activity / goal) * 100))
    : null;
  const totalSleep = (daySleep ?? 0) + (nightSleep ?? 0);

  return (
    <div className="rounded-2xl bg-white/[0.04] px-4 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dog className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium">{pet.name}</span>
        </div>
        <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
          isHome ? "bg-green-400/15 text-green-400" : "bg-amber-400/15 text-amber-400"
        }`}>
          {isHome ? "Zuhause" : "Unterwegs"}
        </span>
      </div>

      {/* Battery */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {isCharging ? <BatteryCharging className="h-3.5 w-3.5 text-green-400" /> : <Battery className="h-3.5 w-3.5" />}
          <span className="tabular-nums">{formatPercent(battery)}</span>
          {isCharging && <span className="text-green-400 text-[10px]">Laden</span>}
        </div>
        {powerSaving === "on" && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400">
            <Zap className="h-2.5 w-2.5" />
            Energiesparen
          </span>
        )}
      </div>

      {/* Activity Progress */}
      {activityPct !== null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Activity className="h-3 w-3" />
              Aktivität
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatMin(activity)} / {formatMin(goal)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                activityPct >= 100 ? "bg-green-400" : activityPct >= 60 ? "bg-amber-400" : "bg-white/30"
              }`}
              style={{ width: `${activityPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Sleep */}
      {totalSleep > 0 && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Moon className="h-3 w-3" />
            Schlaf
          </span>
          <span className="tabular-nums">{formatMin(totalSleep)}</span>
        </div>
      )}
    </div>
  );
}

export function PetsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Hunde
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {pets.map((pet) => (
            <PetTile key={pet.name} pet={pet} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
