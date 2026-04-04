"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntity, useEntityNumericState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";

interface PriceBar {
  hour: string;
  price: number;
  isCurrent: boolean;
  isToday: boolean;
  color: string;
}

function priceColor(price: number, avg: number): string {
  if (avg <= 0) return "#fbbf24";
  const ratio = price / avg;
  if (ratio < 0.8) return "#34d399";
  if (ratio > 1.2) return "#f87171";
  return "#fbbf24";
}

interface CheapWindow {
  startHour: string;
  endHour: string;
  avgPrice: number;
}

function findCheapestWindow(data: PriceBar[], windowSize: number): CheapWindow | null {
  const currentHour = new Date().getHours();
  const futureStart = data.findIndex((d) => {
    const h = parseInt(d.hour);
    return !d.isToday || h > currentHour;
  });
  if (futureStart < 0) return null;
  const futureData = data.slice(futureStart);
  if (futureData.length < windowSize) return null;

  let bestStart = 0;
  let bestAvg = Infinity;
  for (let i = 0; i <= futureData.length - windowSize; i++) {
    const avg = futureData.slice(i, i + windowSize).reduce((s, d) => s + d.price, 0) / windowSize;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestStart = i;
    }
  }
  return {
    startHour: futureData[bestStart].hour,
    endHour: futureData[bestStart + windowSize - 1].hour,
    avgPrice: bestAvg,
  };
}

export function SpotPriceChart() {
  const spotEntity = useEntity(ENTITIES.energy.spotPrice);
  const tibberEntity = useEntity(ENTITIES.energy.tibberPrice);
  const tibberAvailable = tibberEntity?.state !== undefined && tibberEntity?.state !== "unavailable";

  // Current price
  const tibberPrice = tibberAvailable ? parseFloat(tibberEntity!.state) : NaN;
  const epexPrice = spotEntity ? parseFloat(spotEntity.state) : NaN;
  const priceRaw = !isNaN(tibberPrice) ? tibberPrice : !isNaN(epexPrice) ? epexPrice : null;
  const currentPrice = priceRaw !== null ? priceRaw * 100 : null;

  // Stats
  const epexAvg = useEntityNumericState(ENTITIES.energy.spotAverage);
  const epexMin = useEntityNumericState(ENTITIES.energy.spotLowest);
  const epexMax = useEntityNumericState(ENTITIES.energy.spotHighest);
  const tibberAvg = tibberAvailable ? (tibberEntity!.attributes?.avg_price as number | undefined) : undefined;
  const tibberMin = tibberAvailable ? (tibberEntity!.attributes?.min_price as number | undefined) : undefined;
  const tibberMax = tibberAvailable ? (tibberEntity!.attributes?.max_price as number | undefined) : undefined;
  const avgPrice = tibberAvg ?? epexAvg;
  const lowestPrice = tibberMin ?? epexMin;
  const highestPrice = tibberMax ?? epexMax;
  const avg = avgPrice !== null && avgPrice !== undefined ? avgPrice * 100 : 0;
  const source = tibberAvailable ? "Tibber" : "EPEX Spot";

  const data = useMemo((): PriceBar[] => {
    const attrs = spotEntity?.attributes;
    const priceData = attrs?.data ?? attrs?.marketdata ?? attrs?.prices;
    if (!Array.isArray(priceData)) return [];

    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = now.toDateString();

    return priceData.map(
      (item: { start_time?: string; price_per_kwh?: number; price_eur_per_mwh?: number; price?: number }) => {
        const startDate = item.start_time ? new Date(item.start_time) : null;
        const hour = startDate ? startDate.getHours() : 0;
        const isToday = startDate ? startDate.toDateString() === todayStr : true;
        const isCurrent = isToday && hour === currentHour;

        const rawPrice =
          item.price_per_kwh !== undefined
            ? Number(item.price_per_kwh)
            : item.price_eur_per_mwh !== undefined
              ? Number(item.price_eur_per_mwh) / 1000
              : Number(item.price ?? 0);
        const price = (isNaN(rawPrice) ? 0 : rawPrice) * 100;

        const label = isToday ? `${hour}` : `+${hour}`;

        return {
          hour: label,
          price,
          isCurrent,
          isToday,
          color: priceColor(price, avg),
        };
      }
    );
  }, [spotEntity, avg]);

  const priceColorClass = currentPrice !== null
    ? currentPrice < avg * 0.8 ? "text-green-400 bg-green-400/15"
      : currentPrice > avg * 1.2 ? "text-red-400 bg-red-400/15"
      : "text-amber-400 bg-amber-400/15"
    : "text-muted-foreground bg-white/[0.06]";

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Strompreis ({source})
        </CardTitle>
        <div className="flex items-center gap-3">
          {currentPrice !== null && (
            <span className={`text-sm font-semibold tabular-nums rounded-full px-2.5 py-1 ${priceColorClass}`}>
              {currentPrice.toFixed(1)} ct/kWh
            </span>
          )}
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            {lowestPrice !== null && <span className="tabular-nums">Min {(lowestPrice * 100).toFixed(1)}</span>}
            {highestPrice !== null && <span className="tabular-nums">Max {(highestPrice * 100).toFixed(1)}</span>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length > 0 && (() => {
          const cheap3h = findCheapestWindow(data, 3);
          if (!cheap3h) return null;
          return (
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 rounded-lg bg-green-400/10 px-2.5 py-1.5 text-[11px] text-green-400">
                <Zap className="h-3 w-3" />
                <span>Günstigster 3h-Block: {cheap3h.startHour}–{cheap3h.endHour} Uhr ({cheap3h.avgPrice.toFixed(1)} ct)</span>
              </div>
            </div>
          );
        })()}
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                axisLine={false}
                tickLine={false}
                interval={data.length > 30 ? 2 : 0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                axisLine={false}
                tickLine={false}
                unit=" ct"
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(30,30,30,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  backdropFilter: "blur(20px)",
                  color: "rgba(255,255,255,0.9)",
                }}
                formatter={(value) => [`${Number(value).toFixed(2)} ct/kWh`, "Preis"]}
              />
              {avgPrice !== null && (
                <ReferenceLine
                  y={avg}
                  stroke="rgba(255,255,255,0.2)"
                  strokeDasharray="4 4"
                  label={{
                    value: `Ø ${avg.toFixed(1)}`,
                    position: "right",
                    fill: "rgba(255,255,255,0.3)",
                    fontSize: 10,
                  }}
                />
              )}
              <Bar
                dataKey="price"
                radius={[3, 3, 0, 0]}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props as { x: number; y: number; width: number; height: number; payload: PriceBar };
                  const isCurrent = payload?.isCurrent;
                  const color = payload?.color || "#fbbf24";
                  return (
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx={3}
                      fill={color}
                      fillOpacity={isCurrent ? 0.9 : payload?.isToday ? 0.6 : 0.35}
                      stroke={isCurrent ? "#ffffff" : "none"}
                      strokeWidth={isCurrent ? 1.5 : 0}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            Keine Preisdaten verfügbar
          </div>
        )}
      </CardContent>
    </Card>
  );
}
