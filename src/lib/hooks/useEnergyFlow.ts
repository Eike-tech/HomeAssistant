"use client";

import { useMemo } from "react";
import { useEntityNumericState } from "@/lib/hooks/useEntity";
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
  allRooms: RoomNode[];
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
  const trockner = useConsumerPower(ENTITIES.energy.trocknerPower);
  const waschmaschine = useConsumerPower(ENTITIES.energy.waschmaschinePower);
  const netzwerk = useConsumerPower(ENTITIES.energy.netzwerkPower);
  const geschirrspuler = useConsumerPower(ENTITIES.energy.geschirrspulerPower);
  const gefrierschrank = useConsumerPower(ENTITIES.energy.gefrierschrankPower);
  const appleTvBad = useConsumerPower(ENTITIES.energy.appleTvBadPower);
  const appleTvSchlaf = useConsumerPower(ENTITIES.energy.appleTvSchlafzimmerPower);
  const sonosBuro = useConsumerPower(ENTITIES.energy.sonosMoveBuroPower);
  const standleuchte = useConsumerPower(ENTITIES.energy.standleuchtePower);
  const fotowand = useConsumerPower(ENTITIES.energy.fotowandPower);
  const tradfriBulb = useConsumerPower(ENTITIES.energy.tradfriBulb2Power);
  const wohnzimmerSpeaker = useConsumerPower(ENTITIES.energy.wohnzimmerSpeakerPower);

  return useMemo(() => {
    const totalWatts = totalKw !== null ? totalKw * 1000 : 0;
    const rawRooms: RoomNode[] = [
      {
        id: "wohnzimmer", label: "Wohnzimmer", icon: "sofa", color: "#c084fc",
        devices: [
          { id: "entertainment", label: "Entertainment", power: eve2 },
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
          { id: "netzwerk", label: "Netzwerk", power: netzwerk },
        ],
        totalPower: 0,
      },
      {
        id: "bad", label: "Bad", icon: "bath", color: "#38bdf8",
        devices: [
          { id: "homepod-bad", label: "HomePod mini", power: appleTvBad },
        ],
        totalPower: 0,
      },
      {
        id: "schlafzimmer", label: "Schlafzimmer", icon: "bed", color: "#a78bfa",
        devices: [
          { id: "homepod-schlaf", label: "HomePod mini", power: appleTvSchlaf },
        ],
        totalPower: 0,
      },
      {
        id: "garten", label: "Garten", icon: "tree", color: "#34d399",
        devices: [
          { id: "shelly", label: "Außensteckdose", power: shelly },
        ],
        totalPower: 0,
      },
      {
        id: "hauswirtschaftsraum", label: "Hauswirtschaftsraum", icon: "washing-machine", color: "#38bdf8",
        devices: [
          { id: "waschmaschine", label: "Waschmaschine", power: waschmaschine },
          { id: "trockner", label: "Trockner", power: trockner },
          { id: "gefrierschrank", label: "Gefrierschrank", power: gefrierschrank },
        ],
        totalPower: 0,
      },
      {
        id: "kueche", label: "Küche", icon: "utensils", color: "#fb923c",
        devices: [
          { id: "geschirrspueler", label: "Geschirrspüler", power: geschirrspuler },
        ],
        totalPower: 0,
      },
    ];

    // All rooms with all devices + room totals (unfiltered), sorted by power
    const allRooms = rawRooms
      .map((room) => ({
        ...room,
        totalPower: room.devices.reduce((sum, d) => sum + d.power, 0),
      }))
      .sort((a, b) => b.totalPower - a.totalPower);

    // Filtered view for the flow diagram (only active rooms/devices)
    const rooms = allRooms
      .map((room) => {
        const activeDevices = room.devices.filter((d) => d.power >= 0.5);
        return { ...room, devices: activeDevices, totalPower: activeDevices.reduce((sum, d) => sum + d.power, 0) };
      })
      .filter((room) => room.totalPower >= 0.5);

    const knownTotal = rooms.reduce((sum, r) => sum + r.totalPower, 0);
    const sonstige = Math.max(0, totalWatts - knownTotal);

    return { rooms, allRooms, totalPower: totalWatts, sonstige };
  }, [totalKw, eve1, eve2, shelly, trockner, waschmaschine, netzwerk, geschirrspuler, gefrierschrank, appleTvBad, appleTvSchlaf, sonosBuro, standleuchte, fotowand, tradfriBulb, wohnzimmerSpeaker]);
}
