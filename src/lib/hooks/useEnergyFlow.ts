"use client";

import { useMemo } from "react";
import { useEntityNumericState, useEntityState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";

export interface DeviceNode {
  id: string;
  label: string;
  power: number; // Watts
}

export interface RoomNode {
  id: string;
  label: string;
  icon: string;
  devices: DeviceNode[];
  totalPower: number;
  color: string;
}

export interface EnergyFlow {
  rooms: RoomNode[];
  totalPower: number;
  sonstige: number;
}

function useConsumerPower(entityId: string): number {
  const val = useEntityNumericState(entityId);
  return val !== null && !isNaN(val) ? val : 0;
}

export function useEnergyFlow(): EnergyFlow {
  const totalKw = useEntityNumericState(ENTITIES.energy.power);
  const eve1 = useConsumerPower(ENTITIES.energy.eveEnergy1Power);
  const eve2 = useConsumerPower(ENTITIES.energy.eveEnergy2Power);
  const shelly = useConsumerPower(ENTITIES.energy.shellyPower);
  const chargerPower = useConsumerPower(ENTITIES.car.chargerPower);
  const isCharging = useEntityState(ENTITIES.car.chargingBinary);
  const appleTvBad = useConsumerPower(ENTITIES.energy.appleTvBadPower);
  const appleTvSchlaf = useConsumerPower(ENTITIES.energy.appleTvSchlafzimmerPower);
  const sonosBuro = useConsumerPower(ENTITIES.energy.sonosMoveBuroPower);
  const standleuchte = useConsumerPower(ENTITIES.energy.standleuchtePower);
  const fotowand = useConsumerPower(ENTITIES.energy.fotowandPower);
  const tradfriBulb = useConsumerPower(ENTITIES.energy.tradfriBulb2Power);
  const wohnzimmerSpeaker = useConsumerPower(ENTITIES.energy.wohnzimmerSpeakerPower);

  return useMemo(() => {
    const totalWatts = totalKw !== null ? totalKw * 1000 : 0;
    const teslaWatts = isCharging === "on" ? chargerPower * 1000 : 0;

    const rawRooms: RoomNode[] = [
      {
        id: "wohnzimmer", label: "Wohnzimmer", icon: "sofa", color: "#c084fc",
        devices: [
          { id: "entertainment", label: "Entertainment", power: eve2 },
          { id: "speaker", label: "Sonos", power: wohnzimmerSpeaker },
          { id: "standleuchte", label: "Standleuchte", power: standleuchte },
          { id: "fotowand", label: "Fotowand", power: fotowand },
          { id: "tradfri", label: "TRADFRI", power: tradfriBulb },
        ],
        totalPower: 0,
      },
      {
        id: "buero", label: "Büro", icon: "monitor", color: "#60a5fa",
        devices: [
          { id: "workstation", label: "Workstation", power: eve1 },
          { id: "sonos-buro", label: "Sonos Move", power: sonosBuro },
        ],
        totalPower: 0,
      },
      {
        id: "bad", label: "Bad", icon: "bath", color: "#38bdf8",
        devices: [
          { id: "appletv-bad", label: "Apple TV", power: appleTvBad },
        ],
        totalPower: 0,
      },
      {
        id: "schlafzimmer", label: "Schlafzimmer", icon: "bed", color: "#a78bfa",
        devices: [
          { id: "appletv-schlaf", label: "Apple TV", power: appleTvSchlaf },
        ],
        totalPower: 0,
      },
      {
        id: "garten", label: "Garten", icon: "tree", color: "#34d399",
        devices: [
          { id: "shelly", label: "Shelly", power: shelly },
        ],
        totalPower: 0,
      },
      {
        id: "tesla", label: "Tesla", icon: "car", color: "#f87171",
        devices: [
          { id: "charger", label: "Laden", power: teslaWatts },
        ],
        totalPower: 0,
      },
    ];

    // Calculate room totals and filter
    const rooms = rawRooms
      .map((room) => {
        const activeDevices = room.devices.filter((d) => d.power >= 0.5);
        return { ...room, devices: activeDevices, totalPower: activeDevices.reduce((sum, d) => sum + d.power, 0) };
      })
      .filter((room) => room.totalPower >= 0.5)
      .sort((a, b) => b.totalPower - a.totalPower);

    const knownTotal = rooms.reduce((sum, r) => sum + r.totalPower, 0);
    const sonstige = Math.max(0, totalWatts - knownTotal);

    return { rooms, totalPower: totalWatts, sonstige };
  }, [totalKw, eve1, eve2, shelly, chargerPower, isCharging, appleTvBad, appleTvSchlaf, sonosBuro, standleuchte, fotowand, tradfriBulb, wohnzimmerSpeaker]);
}
