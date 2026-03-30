"use client";

import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { activateScene } from "@/lib/hass/services";

const scenes = [
  { id: ENTITIES.scenes.hell, label: "Hell", color: "bg-amber-400/15 text-amber-400 hover:bg-amber-400/25" },
  { id: ENTITIES.scenes.gedimmt, label: "Gedimmt", color: "bg-orange-400/15 text-orange-400 hover:bg-orange-400/25" },
  { id: ENTITIES.scenes.entspannen, label: "Entspannen", color: "bg-purple-400/15 text-purple-400 hover:bg-purple-400/25" },
  { id: ENTITIES.scenes.lesen, label: "Lesen", color: "bg-sky-400/15 text-sky-400 hover:bg-sky-400/25" },
  { id: ENTITIES.scenes.konzentrieren, label: "Fokus", color: "bg-cyan-400/15 text-cyan-400 hover:bg-cyan-400/25" },
  { id: ENTITIES.scenes.nachtlicht, label: "Nacht", color: "bg-indigo-400/15 text-indigo-400 hover:bg-indigo-400/25" },
  { id: ENTITIES.scenes.energieTanken, label: "Energie", color: "bg-green-400/15 text-green-400 hover:bg-green-400/25" },
  { id: ENTITIES.scenes.nordlichter, label: "Nordlichter", color: "bg-teal-400/15 text-teal-400 hover:bg-teal-400/25" },
  { id: ENTITIES.scenes.fruhlingsbluten, label: "Frühling", color: "bg-pink-400/15 text-pink-400 hover:bg-pink-400/25" },
  { id: ENTITIES.scenes.sonnenuntergang, label: "Savanne", color: "bg-rose-400/15 text-rose-400 hover:bg-rose-400/25" },
  { id: ENTITIES.scenes.tropendammerung, label: "Tropen", color: "bg-emerald-400/15 text-emerald-400 hover:bg-emerald-400/25" },
];

export function SceneSelector() {
  const { connection } = useHass();

  return (
    <div className="space-y-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Szenen</span>
      <div className="flex flex-wrap gap-2">
        {scenes.map((scene) => (
          <button
            key={scene.id}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${scene.color}`}
            onClick={() => {
              if (connection) activateScene(connection, scene.id);
            }}
          >
            {scene.label}
          </button>
        ))}
      </div>
    </div>
  );
}
