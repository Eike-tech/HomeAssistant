"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTibberPrices } from "@/lib/hooks/useTibberPrices";

const fmtCt = (eurPerKwh: number) =>
  (eurPerKwh * 100).toFixed(1).replace(".", ",") + " ct";

function pickToday(prices: ReturnType<typeof useTibberPrices>["today"]) {
  return prices.map((p) => ({
    h: new Date(p.startsAt).getHours(),
    eur: p.total,
    ct: p.total * 100,
    iso: p.startsAt,
  }));
}

export function SpotCard() {
  const { today, loading, error } = useTibberPrices();

  const data = useMemo(() => pickToday(today), [today]);
  const now = new Date();
  const currentHour = now.getHours();
  const current = data.find((d) => d.h === currentHour);
  const min = data.length ? Math.min(...data.map((d) => d.ct)) : 0;
  const max = data.length ? Math.max(...data.map((d) => d.ct)) : 0;
  const minHour = data.find((d) => d.ct === min)?.h ?? null;
  const maxHour = data.find((d) => d.ct === max)?.h ?? null;
  const isCheap = current ? current.ct < min + (max - min) * 0.4 : false;

  // Sparkline geometry
  const W = 280;
  const H = 56;
  const padY = 4;
  const yScale = (ct: number) => {
    if (max === min) return H / 2;
    return H - padY - ((ct - min) / (max - min)) * (H - padY * 2);
  };
  const xScale = (h: number) => (h / 23) * W;
  const points = data.map((d) => `${xScale(d.h).toFixed(1)},${yScale(d.ct).toFixed(1)}`).join(" ");
  const area = data.length
    ? `M0,${H} L${data
        .map((d) => `${xScale(d.h).toFixed(1)},${yScale(d.ct).toFixed(1)}`)
        .join(" L")} L${W},${H} Z`
    : "";
  const nowX = xScale(currentHour);
  const nowY = current ? yScale(current.ct) : H / 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spotpreis · jetzt</CardTitle>
        {loading && <span className="text-[11px] text-muted-foreground">lädt …</span>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-1.5">
          <span
            className="display-num text-[44px] font-light leading-none tabular-nums"
            style={{ letterSpacing: "-0.03em", color: "var(--cockpit-ink)" }}
          >
            {current ? fmtCt(current.eur).replace(" ct", "") : "—"}
          </span>
          <span className="text-base text-muted-foreground">ct/kWh</span>
        </div>

        {data.length > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={
              isCheap
                ? {
                    background: "color-mix(in oklch, var(--system-green) 14%, transparent)",
                    color: "var(--system-green)",
                    border: "1px solid color-mix(in oklch, var(--system-green) 30%, transparent)",
                  }
                : {
                    background: "var(--surface-1)",
                    color: "var(--cockpit-ink-dim)",
                    border: "1px solid var(--cockpit-edge-soft)",
                  }
            }
          >
            {isCheap ? "günstig — Tagesminimum nahe" : "mittel"}
          </span>
        )}

        {data.length > 0 && (
          <div>
            <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
              <path d={area} fill="var(--surface-1)" />
              <polyline
                points={points}
                fill="none"
                stroke="var(--cockpit-ink)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {current && (
                <>
                  <line
                    x1={nowX}
                    y1={0}
                    x2={nowX}
                    y2={H}
                    stroke="var(--cockpit-ink)"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    opacity="0.5"
                  />
                  <circle cx={nowX} cy={nowY} r="6" fill="var(--cockpit-ink)" opacity="0.18" />
                  <circle cx={nowX} cy={nowY} r="3.5" fill="var(--cockpit-ink)" />
                </>
              )}
            </svg>
            <div className="mt-1.5 flex justify-between text-[10px] tabular-nums" style={{ color: "var(--cockpit-ink-faint)" }}>
              <span>00</span>
              <span>06</span>
              <span>12</span>
              <span>18</span>
              <span>24</span>
            </div>
          </div>
        )}

        {data.length > 0 && (
          <div className="flex justify-between border-t pt-3 text-[11px]" style={{ borderColor: "var(--cockpit-edge-soft)" }}>
            <div>
              <span className="text-muted-foreground">Min </span>
              <span className="font-mono tabular-nums" style={{ color: "var(--cockpit-ink)" }}>
                {min.toFixed(1).replace(".", ",")} ct
                {minHour !== null && ` · ${String(minHour).padStart(2, "0")}:00`}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Max </span>
              <span className="font-mono tabular-nums" style={{ color: "var(--cockpit-ink)" }}>
                {max.toFixed(1).replace(".", ",")} ct
                {maxHour !== null && ` · ${String(maxHour).padStart(2, "0")}:00`}
              </span>
            </div>
          </div>
        )}

        {error && (
          <span className="text-[11px] text-destructive">Fehler: {error}</span>
        )}
      </CardContent>
    </Card>
  );
}
