import { ENTITIES } from "./entities";

export interface RoomDevice {
  id: string;
  label: string;
  entityId: string;
}

export interface RoomDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  devices: RoomDevice[];
}

export const ROOMS: RoomDef[] = [
  {
    id: "wohnzimmer",
    label: "Wohnzimmer",
    icon: "sofa",
    color: "#c084fc",
    devices: [
      { id: "entertainment", label: "Entertainment", entityId: ENTITIES.energy.eveEnergy2Power },
      { id: "standleuchte", label: "Standleuchte", entityId: ENTITIES.energy.standleuchtePower },
      { id: "fotowand", label: "Fotowand", entityId: ENTITIES.energy.fotowandPower },
      { id: "tradfri", label: "TRADFRI", entityId: ENTITIES.energy.tradfriBulb2Power },
    ],
  },
  {
    id: "buero",
    label: "Büro",
    icon: "monitor",
    color: "#60a5fa",
    devices: [
      { id: "workstation", label: "Workstation", entityId: ENTITIES.energy.eveEnergy1Power },
      { id: "sonos-buro", label: "Sonos Move", entityId: ENTITIES.energy.sonosMoveBuroPower },
      { id: "netzwerk", label: "Netzwerk", entityId: ENTITIES.energy.netzwerkPower },
    ],
  },
  {
    id: "bad",
    label: "Bad",
    icon: "bath",
    color: "#38bdf8",
    devices: [
      { id: "homepod-bad", label: "HomePod mini", entityId: ENTITIES.energy.homePodBadPower },
    ],
  },
  {
    id: "schlafzimmer",
    label: "Schlafzimmer",
    icon: "bed",
    color: "#a78bfa",
    devices: [
      { id: "homepod-schlaf", label: "HomePod mini", entityId: ENTITIES.energy.homePodSchlafzimmerPower },
    ],
  },
  {
    id: "garten",
    label: "Garten",
    icon: "tree",
    color: "#34d399",
    devices: [
      { id: "shelly", label: "Außensteckdose", entityId: ENTITIES.energy.shellyPower },
    ],
  },
  {
    id: "hauswirtschaftsraum",
    label: "Hauswirtschaftsraum",
    icon: "washing-machine",
    color: "#38bdf8",
    devices: [
      { id: "waschmaschine", label: "Waschmaschine", entityId: ENTITIES.energy.waschmaschinePower },
      { id: "trockner", label: "Trockner", entityId: ENTITIES.energy.trocknerPower },
      { id: "gefrierschrank", label: "Gefrierschrank", entityId: ENTITIES.energy.gefrierschrankPower },
    ],
  },
  {
    id: "kueche",
    label: "Küche",
    icon: "utensils",
    color: "#fb923c",
    devices: [
      { id: "geschirrspueler", label: "Geschirrspüler", entityId: ENTITIES.energy.geschirrspulerPower },
    ],
  },
];

export const ALL_DEVICE_ENTITY_IDS: string[] = ROOMS.flatMap((r) => r.devices.map((d) => d.entityId));

export function findDeviceRoom(entityId: string): RoomDef | undefined {
  return ROOMS.find((r) => r.devices.some((d) => d.entityId === entityId));
}
