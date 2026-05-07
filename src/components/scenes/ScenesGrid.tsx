"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHass } from "@/lib/hooks/useHass";
import { activateScene } from "@/lib/hass/services";
import { SCENE_TILES } from "@/lib/hass/scenes";

export function ScenesGrid() {
  const { connection } = useHass();
  const [pending, setPending] = useState<string | null>(null);

  const handleActivate = async (sceneId: string) => {
    if (!connection || pending) return;
    setPending(sceneId);
    try {
      await activateScene(connection, sceneId);
    } catch (err) {
      console.error("[ScenesGrid] activate failed:", err);
    } finally {
      setTimeout(() => setPending(null), 600);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Szenen</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2.5">
          {SCENE_TILES.map((scene) => {
            const Icon = scene.icon;
            const isPending = pending === scene.id;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleActivate(scene.id)}
                disabled={!connection || isPending}
                aria-label={`Szene ${scene.label} aktivieren`}
                className="group flex flex-col gap-2 rounded-[12px] p-3.5 text-left transition-colors disabled:opacity-60"
                style={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--cockpit-edge-soft)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="grid h-7 w-7 place-items-center rounded-lg"
                    style={{ background: "var(--surface-2)", color: "var(--cockpit-ink)" }}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
                  </div>
                  <ArrowRight
                    className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                    style={{ color: "var(--cockpit-ink-faint)" }}
                  />
                </div>
                <div className="text-[13px] font-medium" style={{ color: "var(--cockpit-ink)" }}>
                  {scene.label}
                </div>
                <div className="text-[10px]" style={{ color: "var(--cockpit-ink-dim)" }}>
                  {isPending ? "wird aktiviert …" : scene.description}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
