"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEntityNumericState, useEntityState } from "@/lib/hooks/useEntity";
import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { formatRange, formatPercent, formatTemperature } from "@/lib/utils/formatters";
import { BatteryGauge } from "./BatteryGauge";
import { ChargeStatus } from "./ChargeStatus";
import { CarControls } from "./CarControls";
import { callService } from "home-assistant-js-websocket";
import { MapPin, Shield, ShieldOff, Thermometer, Wind } from "lucide-react";

function DoorWindowStatus() {
  const doors = [
    { entity: ENTITIES.car.doorDriverFront, label: "VL" },
    { entity: ENTITIES.car.doorDriverRear, label: "HL" },
    { entity: ENTITIES.car.doorPassengerFront, label: "VR" },
    { entity: ENTITIES.car.doorPassengerRear, label: "HR" },
  ];
  const windows = [
    { entity: ENTITIES.car.windowDriverFront, label: "VL" },
    { entity: ENTITIES.car.windowDriverRear, label: "HL" },
    { entity: ENTITIES.car.windowPassengerFront, label: "VR" },
    { entity: ENTITIES.car.windowPassengerRear, label: "HR" },
  ];

  const doorStates = doors.map((d) => ({ ...d, open: useEntityState(d.entity) === "on" }));
  const windowStates = windows.map((w) => ({ ...w, open: useEntityState(w.entity) === "on" }));

  const anyDoorOpen = doorStates.some((d) => d.open);
  const anyWindowOpen = windowStates.some((w) => w.open);

  if (!anyDoorOpen && !anyWindowOpen) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {doorStates.filter((d) => d.open).map((d) => (
        <span key={d.label} className="text-[10px] rounded-full px-2 py-0.5 bg-red-400/15 text-red-400">
          Tür {d.label}
        </span>
      ))}
      {windowStates.filter((w) => w.open).map((w) => (
        <span key={w.label} className="text-[10px] rounded-full px-2 py-0.5 bg-orange-400/15 text-orange-400">
          Fenster {w.label}
        </span>
      ))}
    </div>
  );
}

function ComfortControls() {
  const { connection } = useHass();
  const defrost = useEntityState(ENTITIES.car.defrost);
  const sentryMode = useEntityState(ENTITIES.car.sentryMode);
  const seatLeft = useEntityState(ENTITIES.car.seatHeaterLeft);
  const seatRight = useEntityState(ENTITIES.car.seatHeaterRight);
  const steeringWheel = useEntityState(ENTITIES.car.steeringWheelHeater);

  const isDefrosting = defrost === "on";
  const isSentry = sentryMode === "on";

  return (
    <div className="space-y-2.5">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Komfort</span>
      <div className="flex gap-2">
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-medium transition-colors ${
            isDefrosting ? "bg-sky-400/15 text-sky-400" : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
          }`}
          onClick={() => {
            if (!connection) return;
            callService(connection, "switch", isDefrosting ? "turn_off" : "turn_on", { entity_id: ENTITIES.car.defrost });
          }}
        >
          <Wind className="h-3.5 w-3.5" />
          Entfrosten
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-medium transition-colors ${
            isSentry ? "bg-green-400/15 text-green-400" : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
          }`}
          onClick={() => {
            if (!connection) return;
            callService(connection, "switch", isSentry ? "turn_off" : "turn_on", { entity_id: ENTITIES.car.sentryMode });
          }}
        >
          {isSentry ? <Shield className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
          Wächter
        </button>
      </div>
      {/* Seat heater status (read-only indicators) */}
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        {seatLeft && seatLeft !== "off" && <span>Sitz L: {seatLeft}</span>}
        {seatRight && seatRight !== "off" && <span>Sitz R: {seatRight}</span>}
        {steeringWheel && steeringWheel !== "off" && <span>Lenkrad: {steeringWheel}</span>}
      </div>
    </div>
  );
}

export function CarOverviewCard() {
  const battery = useEntityNumericState(ENTITIES.car.battery);
  const range = useEntityNumericState(ENTITIES.car.range);
  const targetCharge = useEntityNumericState(ENTITIES.car.targetCharge);
  const connectivity = useEntityState(ENTITIES.car.connectivity);
  const awake = useEntityState(ENTITIES.car.awake);
  const location = useEntityState(ENTITIES.car.location);
  const exteriorTemp = useEntityNumericState(ENTITIES.car.exteriorTemp);
  const interiorTemp = useEntityNumericState(ENTITIES.car.interiorTemp);

  const isOnline = connectivity === "on";
  const isAwake = awake === "on";
  const locationLabel = location === "home" ? "Zuhause" : location === "not_home" ? "Unterwegs" : location ?? "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Crest
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={`rounded-full text-[11px] px-3 ${isOnline ? "bg-green-400/15 text-green-400" : "bg-white/[0.06] text-muted-foreground"}`}
          >
            {isOnline ? (isAwake ? "Wach" : "Online") : "Offline"}
          </Badge>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {locationLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Battery Hero */}
        <div className="flex items-center gap-6">
          <BatteryGauge percentage={battery} target={targetCharge} />
          <div className="flex flex-col gap-0.5">
            <span className="text-4xl font-light tracking-tight tabular-nums">
              {formatPercent(battery)}
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatRange(range)}
            </span>
            {targetCharge !== null && (
              <span className="text-xs text-muted-foreground/60">
                Ziel {formatPercent(targetCharge)}
              </span>
            )}
          </div>
        </div>

        <ChargeStatus />
        <DoorWindowStatus />

        {/* Temperatures */}
        {(interiorTemp !== null || exteriorTemp !== null) && (
          <div className="flex gap-3">
            {interiorTemp !== null && (
              <div className="rounded-2xl bg-white/[0.04] px-4 py-2.5 flex-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Innen</span>
                <p className="text-base font-medium tabular-nums">{formatTemperature(interiorTemp)}</p>
              </div>
            )}
            {exteriorTemp !== null && (
              <div className="rounded-2xl bg-white/[0.04] px-4 py-2.5 flex-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Außen</span>
                <p className="text-base font-medium tabular-nums">{formatTemperature(exteriorTemp)}</p>
              </div>
            )}
          </div>
        )}

        <ComfortControls />
        <CarControls />
      </CardContent>
    </Card>
  );
}
