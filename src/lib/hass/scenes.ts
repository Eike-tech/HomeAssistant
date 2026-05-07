import { Sun, Moon, BookOpen, Monitor } from "lucide-react";
import { ENTITIES } from "./entities";

export interface SceneTile {
  id: string;
  label: string;
  description: string;
  icon: typeof Sun;
}

export const SCENE_TILES: SceneTile[] = [
  { id: ENTITIES.scenes.hell, label: "Hell", description: "Volles Licht", icon: Sun },
  { id: ENTITIES.scenes.lesen, label: "Lesen", description: "Warmes Lese-Licht", icon: BookOpen },
  { id: ENTITIES.scenes.konzentrieren, label: "Konzentrieren", description: "Office 100%", icon: Monitor },
  { id: ENTITIES.scenes.nachtlicht, label: "Nachtlicht", description: "Wohnzimmer 5%", icon: Moon },
];
