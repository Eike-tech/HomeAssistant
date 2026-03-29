"use client";

import { useEntityNumericState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";
import { formatPower } from "@/lib/utils/formatters";

function getGaugeColor(kw: number): string {
  if (kw < 0.5) return "text-green-500";
  if (kw < 1.5) return "text-yellow-500";
  if (kw < 3) return "text-orange-500";
  return "text-red-500";
}

function getGaugeStroke(kw: number): string {
  if (kw < 0.5) return "stroke-green-500";
  if (kw < 1.5) return "stroke-yellow-500";
  if (kw < 3) return "stroke-orange-500";
  return "stroke-red-500";
}

export function PowerGauge() {
  const power = useEntityNumericState(ENTITIES.energy.power);
  const maxPower = useEntityNumericState(ENTITIES.energy.maxPower);

  const max = Math.max(maxPower ?? 5, 3);
  const percentage = power !== null ? Math.min((power / max) * 100, 100) : 0;

  // SVG arc for semicircle gauge
  const radius = 60;
  const circumference = Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* Background arc */}
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          className="stroke-muted"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          className={getGaugeStroke(power ?? 0)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
        />
      </svg>
      <div className="flex flex-col items-center -mt-4">
        <span className={`text-2xl font-bold tabular-nums ${getGaugeColor(power ?? 0)}`}>
          {formatPower(power)}
        </span>
        <span className="text-xs text-muted-foreground">Aktuelle Leistung</span>
      </div>
    </div>
  );
}
