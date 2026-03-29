"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHass } from "@/lib/hooks/useHass";
import { useEntityState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";
import { lockEntity, unlockEntity, openCover, closeCover } from "@/lib/hass/services";

interface ConfirmAction {
  label: string;
  description: string;
  action: () => Promise<void>;
}

export function CarControls() {
  const { connection } = useHass();
  const lockState = useEntityState(ENTITIES.car.lock);
  const trunkState = useEntityState(ENTITIES.car.trunk);
  const frunkState = useEntityState(ENTITIES.car.frunk);
  const chargePortState = useEntityState(ENTITIES.car.chargePort);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  if (!connection) return null;

  const controls = [
    {
      icon: lockState === "locked" ? "🔒" : "🔓",
      label: lockState === "locked" ? "Gesperrt" : "Offen",
      onClick: () =>
        setConfirmAction({
          label: lockState === "locked" ? "Entsperren" : "Sperren",
          description: `Fahrzeug ${lockState === "locked" ? "entsperren" : "sperren"}?`,
          action: async () => {
            if (lockState === "locked") await unlockEntity(connection, ENTITIES.car.lock);
            else await lockEntity(connection, ENTITIES.car.lock);
          },
        }),
    },
    {
      icon: "🚪",
      label: trunkState === "open" ? "Offen" : "Zu",
      onClick: () =>
        setConfirmAction({
          label: `Kofferraum ${trunkState === "open" ? "schließen" : "öffnen"}`,
          description: `Kofferraum ${trunkState === "open" ? "schließen" : "öffnen"}?`,
          action: async () => {
            if (trunkState === "open") await closeCover(connection, ENTITIES.car.trunk);
            else await openCover(connection, ENTITIES.car.trunk);
          },
        }),
    },
    {
      icon: "📦",
      label: "Frunk",
      onClick: () =>
        setConfirmAction({
          label: "Frunk öffnen",
          description: "Frunk öffnen?",
          action: async () => { await openCover(connection, ENTITIES.car.frunk); },
        }),
    },
    {
      icon: "🔌",
      label: chargePortState === "open" ? "Offen" : "Zu",
      onClick: () =>
        setConfirmAction({
          label: `Ladeklappe ${chargePortState === "open" ? "schließen" : "öffnen"}`,
          description: `Ladeklappe ${chargePortState === "open" ? "schließen" : "öffnen"}?`,
          action: async () => {
            if (chargePortState === "open") await closeCover(connection, ENTITIES.car.chargePort);
            else await openCover(connection, ENTITIES.car.chargePort);
          },
        }),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {controls.map((ctrl) => (
          <button
            key={ctrl.label + ctrl.icon}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.04] py-3 transition-colors hover:bg-white/[0.08] active:bg-white/[0.12]"
            onClick={ctrl.onClick}
          >
            <span className="text-xl">{ctrl.icon}</span>
            <span className="text-[10px] text-muted-foreground">{ctrl.label}</span>
          </button>
        ))}
      </div>

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="rounded-3xl border-white/[0.08] bg-neutral-900/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle>{confirmAction?.label}</DialogTitle>
            <DialogDescription>{confirmAction?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={() => setConfirmAction(null)}
            >
              Abbrechen
            </Button>
            <Button
              className="rounded-xl bg-white/10 hover:bg-white/15"
              onClick={async () => {
                await confirmAction?.action();
                setConfirmAction(null);
              }}
            >
              Bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
