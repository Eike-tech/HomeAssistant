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

/**
 * For a given *_power / *_leistung entity, generate plausible energy-counter
 * sibling IDs (kWh, total_increasing). Powercalc, Shelly, Eve Energy and
 * HomeKit Controller integrations all expose these in predictable patterns.
 */
export function deriveEnergyCandidates(powerEntityId: string): string[] {
  const candidates = new Set<string>();

  // Trailing _power → _energy (Powercalc, Shelly switch_X_power, Sonos)
  if (powerEntityId.endsWith("_power")) {
    candidates.add(powerEntityId.replace(/_power$/, "_energy"));
    candidates.add(powerEntityId.replace(/_power$/, "_total_energy"));
    candidates.add(powerEntityId.replace(/_power$/, "_kumulierter_verbrauch"));
  }

  // _leistung → _energie / _kumulierter_verbrauch (German HomeKit / Eve Energy)
  if (powerEntityId.endsWith("_leistung")) {
    candidates.add(powerEntityId.replace(/_leistung$/, "_energie"));
    candidates.add(powerEntityId.replace(/_leistung$/, "_kumulierter_verbrauch"));
    candidates.add(powerEntityId.replace(/_leistung$/, "_gesamtverbrauch"));
  }

  // Numbered suffix variants: _leistung_2 → _energie_2 / _kumulierter_verbrauch_2
  const numberedLeistung = powerEntityId.match(/^(.*)_leistung_(\d+)$/);
  if (numberedLeistung) {
    const [, base, n] = numberedLeistung;
    candidates.add(`${base}_energie_${n}`);
    candidates.add(`${base}_kumulierter_verbrauch_${n}`);
    candidates.add(`${base}_gesamtverbrauch_${n}`);
  }
  const numberedPower = powerEntityId.match(/^(.*)_power_(\d+)$/);
  if (numberedPower) {
    const [, base, n] = numberedPower;
    candidates.add(`${base}_energy_${n}`);
    candidates.add(`${base}_total_energy_${n}`);
  }

  return Array.from(candidates);
}
