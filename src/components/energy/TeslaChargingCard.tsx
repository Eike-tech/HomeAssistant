"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEntityNumericState, useEntityState } from "@/lib/hooks/useEntity";
import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { formatPercent, formatRange, formatPower, formatEnergy, formatDuration } from "@/lib/utils/formatters";
import { callService } from "home-assistant-js-websocket";

const chargeStatusLabels: Record<string, { label: string; color: string }> = {
  charging: { label: "Laden", color: "bg-green-400/15 text-green-400" },
  stopped: { label: "Gestoppt", color: "bg-white/[0.06] text-muted-foreground" },
  complete: { label: "Voll", color: "bg-sky-400/15 text-sky-400" },
  disconnected: { label: "Getrennt", color: "bg-white/[0.06] text-muted-foreground" },
};

export function TeslaChargingCard() {
  const { connection } = useHass();
  const battery = useEntityNumericState(ENTITIES.car.battery);
  const range = useEntityNumericState(ENTITIES.car.range);
  const targetCharge = useEntityNumericState(ENTITIES.car.targetCharge);
  const chargingStatus = useEntityState(ENTITIES.car.chargingStatus);
  const isPlugged = useEntityState(ENTITIES.car.plugged) === "on";
  const chargeSwitch = useEntityState(ENTITIES.car.chargeSwitch);
  const chargerPower = useEntityNumericState(ENTITIES.car.chargerPower);
  const chargerVoltage = useEntityNumericState(ENTITIES.car.chargerVoltage);
  const chargerCurrent = useEntityNumericState(ENTITIES.car.chargerCurrent);
  const chargingSpeed = useEntityNumericState(ENTITIES.car.chargingSpeed);
  const energyAdded = useEntityNumericState(ENTITIES.car.energyAdded);
  const timeToFull = useEntityNumericState(ENTITIES.car.timeToFull);

  const isCharging = chargingStatus === "charging";
  const isChargeSwitchOn = chargeSwitch === "on";
  const statusInfo = chargeStatusLabels[chargingStatus ?? ""] ?? { label: isPlugged ? "Angeschlossen" : "Nicht verbunden", color: isPlugged ? "bg-blue-400/15 text-blue-400" : "bg-white/[0.06] text-muted-foreground" };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Tesla Crest
        </CardTitle>
        <span className={`text-[11px] font-medium rounded-full px-2.5 py-1 ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Battery */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Batterie</span>
            <span className="font-medium tabular-nums">
              {formatPercent(battery)}
              {targetCharge !== null && (
                <span className="text-muted-foreground text-xs ml-1">/ {targetCharge}%</span>
              )}
            </span>
          </div>
          <Progress value={battery ?? 0} className="h-1.5" />
        </div>

        {/* Range */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Reichweite</span>
          <span className="font-medium tabular-nums">{formatRange(range)}</span>
        </div>

        {/* Charging stats (when charging or recently charged) */}
        {(isCharging || (energyAdded !== null && energyAdded > 0)) && (
          <div className="grid grid-cols-2 gap-3">
            {chargerPower !== null && chargerPower > 0 && (
              <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Leistung</span>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatPower(chargerPower)}</p>
              </div>
            )}
            {chargerVoltage !== null && chargerVoltage > 5 && (
              <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Spannung / Strom</span>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">
                  {Math.round(chargerVoltage)}V / {chargerCurrent?.toFixed(1) ?? "—"}A
                </p>
              </div>
            )}
            {chargingSpeed !== null && chargingSpeed > 0 && (
              <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Geschwindigkeit</span>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{Math.round(chargingSpeed)} km/h</p>
              </div>
            )}
            {energyAdded !== null && energyAdded > 0 && (
              <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Geladen</span>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatEnergy(energyAdded)}</p>
              </div>
            )}
          </div>
        )}

        {/* Charge Switch */}
        {isPlugged && (
          <button
            className={`w-full rounded-2xl py-2.5 text-xs font-medium transition-colors ${
              isChargeSwitchOn
                ? "bg-red-400/10 text-red-400 hover:bg-red-400/20"
                : "bg-green-400/10 text-green-400 hover:bg-green-400/20"
            }`}
            onClick={() => {
              if (!connection) return;
              callService(connection, "switch", isChargeSwitchOn ? "turn_off" : "turn_on", { entity_id: ENTITIES.car.chargeSwitch });
            }}
          >
            {isChargeSwitchOn ? "Laden stoppen" : "Laden starten"}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
