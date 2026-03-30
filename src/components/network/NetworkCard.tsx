"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntityNumericState, useEntityState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";

function formatSpeed(kbPerSec: number | null): string {
  if (kbPerSec === null) return "—";
  if (kbPerSec >= 1000) return `${(kbPerSec / 1000).toFixed(1)} MB/s`;
  return `${Math.round(kbPerSec)} kB/s`;
}

function SpeedRow({ label, value, max }: { label: string; value: number | null; max: number | null }) {
  const pct = value !== null && max !== null && max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isHigh = pct > 70;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xs font-medium tabular-nums ${isHigh ? "text-amber-400" : "text-foreground"}`}>
          {formatSpeed(value)}
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isHigh ? "bg-amber-400" : "bg-sky-400/60"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function NetworkCard() {
  const download = useEntityNumericState(ENTITIES.network.downloadSpeed);
  const upload = useEntityNumericState(ENTITIES.network.uploadSpeed);
  const cpuTemp = useEntityNumericState(ENTITIES.network.cpuTemp);
  const connected = useEntityState(ENTITIES.network.connectionStatus);
  const maxDown = useEntityNumericState(ENTITIES.network.maxDownload);
  const maxUp = useEntityNumericState(ENTITIES.network.maxUpload);
  const gbRecv = useEntityNumericState(ENTITIES.network.gbReceived);
  const gbSent = useEntityNumericState(ENTITIES.network.gbSent);

  const isOnline = connected === "on";
  const maxDownKb = maxDown !== null ? maxDown / 8 : null; // kbit/s to kB/s
  const maxUpKb = maxUp !== null ? maxUp / 8 : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Netzwerk
        </CardTitle>
        <span className={`text-[11px] font-medium rounded-full px-2.5 py-1 ${
          isOnline ? "bg-green-400/15 text-green-400" : "bg-red-400/15 text-red-400"
        }`}>
          {isOnline ? "Online" : "Offline"}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <SpeedRow label="Download" value={download} max={maxDownKb} />
        <SpeedRow label="Upload" value={upload} max={maxUpKb} />

        <div className="flex gap-3 text-xs text-muted-foreground">
          {cpuTemp !== null && (
            <span className={`tabular-nums ${cpuTemp > 80 ? "text-red-400" : ""}`}>
              CPU {cpuTemp}°C
            </span>
          )}
          {gbRecv !== null && <span className="tabular-nums">{gbRecv} GB empf.</span>}
          {gbSent !== null && <span className="tabular-nums">{gbSent} GB ges.</span>}
        </div>
      </CardContent>
    </Card>
  );
}
