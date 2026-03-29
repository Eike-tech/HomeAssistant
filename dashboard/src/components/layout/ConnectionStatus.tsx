"use client";

import { useHass } from "@/lib/hooks/useHass";

const stateConfig = {
  connecting: { color: "bg-yellow-400", pulse: true },
  connected: { color: "bg-green-400", pulse: false },
  disconnected: { color: "bg-orange-400", pulse: true },
  error: { color: "bg-red-400", pulse: false },
};

export function ConnectionStatus() {
  const { connectionState } = useHass();
  const config = stateConfig[connectionState];

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${config.color} ${config.pulse ? "animate-pulse" : ""}`} />
    </div>
  );
}
