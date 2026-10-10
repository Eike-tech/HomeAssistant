import { ENTITIES } from "./entities";

export interface SceneTile {
  id: string;
  label: string;
  description: string;
}

export const SCENE_TILES: SceneTile[] = [
  { id: ENTITIES.scenes.hell, label: "Hell", description: "Volles Licht" },
  { id: ENTITIES.scenes.lesen, label: "Lesen", description: "Warmes Lese-Licht" },
  { id: ENTITIES.scenes.konzentrieren, label: "Konzentrieren", description: "Office 100%" },
  { id: ENTITIES.scenes.nachtlicht, label: "Nachtlicht", description: "Wohnzimmer 5%" },
];
