"use client";

import { useMemo } from "react";
import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { ROOMS } from "@/lib/hass/rooms";

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

function parsePower(state: string | undefined): number {
  if (!state) return 0;
  const num = parseFloat(state);
  return isNaN(num) ? 0 : num;
}

export function useEnergyFlow(): EnergyFlow {
  const { entities } = useHass();

  return useMemo(() => {
    const totalKw = parsePower(entities[ENTITIES.energy.power]?.state);
    const totalWatts = totalKw * 1000;

    const rawRooms: RoomNode[] = ROOMS.map((room) => ({
      id: room.id,
      label: room.label,
      icon: room.icon,
      color: room.color,
      devices: room.devices.map((d) => ({
        id: d.id,
        label: d.label,
        power: parsePower(entities[d.entityId]?.state),
      })),
      totalPower: 0,
    }));

    const allRooms = rawRooms
      .map((room) => ({
        ...room,
        totalPower: room.devices.reduce((sum, d) => sum + d.power, 0),
      }))
      .sort((a, b) => b.totalPower - a.totalPower);

    const rooms = allRooms
      .map((room) => {
        const activeDevices = room.devices.filter((d) => d.power >= 0.5);
        return { ...room, devices: activeDevices, totalPower: activeDevices.reduce((sum, d) => sum + d.power, 0) };
      })
      .filter((room) => room.totalPower >= 0.5);

    const knownTotal = rooms.reduce((sum, r) => sum + r.totalPower, 0);
    const sonstige = Math.max(0, totalWatts - knownTotal);

    return { rooms, allRooms, totalPower: totalWatts, sonstige };
  }, [entities]);
}
