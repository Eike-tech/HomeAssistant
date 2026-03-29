"use client";

import { useEntityNumericState } from "@/lib/hooks/useEntity";
import { formatTemperature, formatHumidity } from "@/lib/utils/formatters";

export function RoomClimate({
  name,
  tempEntity,
  humidityEntity,
}: {
  name: string;
  tempEntity: string;
  humidityEntity: string;
}) {
  const temp = useEntityNumericState(tempEntity);
  const humidity = useEntityNumericState(humidityEntity);

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3">
      <span className="text-sm">{name}</span>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium tabular-nums">
          {formatTemperature(temp)}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatHumidity(humidity)}
        </span>
      </div>
    </div>
  );
}
