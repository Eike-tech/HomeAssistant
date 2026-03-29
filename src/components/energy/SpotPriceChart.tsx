"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEntity, useEntityNumericState } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";

interface PriceDataPoint {
  hour: string;
  price: number;
  isCurrent: boolean;
}

export function SpotPriceChart() {
  const spotEntity = useEntity(ENTITIES.energy.spotPrice);
  const avgPrice = useEntityNumericState(ENTITIES.energy.spotAverage);
  const lowestPrice = useEntityNumericState(ENTITIES.energy.spotLowest);
  const highestPrice = useEntityNumericState(ENTITIES.energy.spotHighest);

  const data = useMemo((): PriceDataPoint[] => {
    const attrs = spotEntity?.attributes;
    const priceData = attrs?.data ?? attrs?.marketdata ?? attrs?.prices;

    if (Array.isArray(priceData)) {
      const currentHour = new Date().getHours();
      return priceData.map(
        (item: { start_time?: string; hour?: number; price_eur_per_mwh?: number; price?: number }, i: number) => {
          const hour = item.start_time
            ? new Date(item.start_time).getHours()
            : item.hour ?? i;
          const price =
            item.price_eur_per_mwh !== undefined
              ? item.price_eur_per_mwh / 1000
              : item.price ?? 0;
          return {
            hour: `${hour}:00`,
            price: price * 100,
            isCurrent: hour === currentHour,
          };
        }
      );
    }

    return [];
  }, [spotEntity]);

  const currentPrice = spotEntity ? parseFloat(spotEntity.state) * 100 : null;

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium text-sm">
          Strompreis 24h
        </CardTitle>
        {currentPrice !== null && (
          <span className="text-sm tabular-nums text-muted-foreground">
            {currentPrice.toFixed(1)} ct/kWh
          </span>
        )}
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                axisLine={false}
                tickLine={false}
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
                formatter={(value) => [`${Number(value).toFixed(1)} ct/kWh`, "Preis"]}
              />
              {avgPrice !== null && (
                <ReferenceLine
                  y={avgPrice * 100}
                  stroke="rgba(255,255,255,0.15)"
                  strokeDasharray="4 4"
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke="#34d399"
                fill="url(#priceGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <p>Keine Preisdaten verfügbar</p>
            <div className="flex gap-3 text-xs">
              {lowestPrice !== null && <span>Min: {(lowestPrice * 100).toFixed(1)} ct</span>}
              {currentPrice !== null && <span>Aktuell: {currentPrice.toFixed(1)} ct</span>}
              {highestPrice !== null && <span>Max: {(highestPrice * 100).toFixed(1)} ct</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
