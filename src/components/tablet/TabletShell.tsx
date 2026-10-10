"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { useTabletTheme } from "./useTabletTheme";
import { fmt, hhmm, Icon, num, useNow } from "./shared";
import { HeuteView } from "./HeuteView";
import { EnergieView } from "./EnergieView";
import { HausView, HAUS_LIGHTS } from "./HausView";
import { AlertsBar } from "./AlertsBar";

type PageId = "heute" | "energie" | "haus";
const PAGES: { id: PageId; label: string }[] = [
  { id: "heute", label: "Heute" },
  { id: "energie", label: "Energie" },
  { id: "haus", label: "Haus" },
];

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86_400_000 + 1) / 7);
}

function timeOf(iso: unknown): string | null {
  if (typeof iso !== "string") return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : hhmm(d);
}

export function TabletShell() {
  const { entities, connectionState } = useHass();
  const theme = useTabletTheme();
  const now = useNow(15_000);
  const [page, setPage] = useState<PageId>("heute");
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = (dir: 1 | -1) => {
    const i = PAGES.findIndex((p) => p.id === page);
    const next = PAGES[i + dir];
    if (next) setPage(next.id);
  };

  // ─── Header content per page ──────────────────────────────
  const powerKw = num(entities[ENTITIES.energy.power]);
  const priceEur = num(entities[ENTITIES.energy.tibberPrice]);
  const lightsOn = HAUS_LIGHTS.filter((l) => entities[l.entityId]?.state === "on").length;
  const sun = entities[ENTITIES.general.sun];
  const rise = timeOf(sun?.attributes?.next_rising);
  const set = timeOf(sun?.attributes?.next_setting);

  let big: React.ReactNode;
  let title: string;
  let sub: string;
  if (page === "heute") {
    big = hhmm(now);
    title = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    sub = [`KW ${isoWeek(now)}`, rise && `↑ ${rise}`, set && `↓ ${set}`].filter(Boolean).join(" · ");
  } else if (page === "energie") {
    big = (
      <>
        {fmt(powerKw, 2)}
        <span className="tc-dim" style={{ fontSize: 32, fontWeight: 300, letterSpacing: 0 }}> kW</span>
      </>
    );
    title = "Energie";
    sub = [
      priceEur !== null ? `${fmt(priceEur * 100, 1)} ct/kWh` : null,
      theme.quantile !== null ? `Quantil ${fmt(theme.quantile * 100)} %` : null,
      theme.charging ? "Auto lädt" : null,
    ]
      .filter(Boolean)
      .join(" · ");
  } else {
    big = (
      <>
        {lightsOn}
        <span className="tc-dim" style={{ fontSize: 32, fontWeight: 300, letterSpacing: 0 }}>
          {lightsOn === 1 ? " Licht an" : " Lichter an"}
        </span>
      </>
    );
    title = "Haus";
    const out = entities[ENTITIES.general.weather]?.attributes?.temperature;
    sub = typeof out === "number" ? `außen ${fmt(out)}°` : "";
  }

  const themeLabel =
    theme.pref === "auto" ? `Automatisch (${theme.mode === "tag" ? "Tag" : "Nacht"})` : theme.pref === "tag" ? "Tag" : "Nacht";
  const ThemeIcon = theme.pref === "auto" ? Icon.auto : theme.pref === "tag" ? Icon.sun : Icon.moon;

  const glowPos: Record<PageId, CSSProperties> = {
    heute: { left: -160, top: -240, width: 980, height: 720 },
    energie: { left: 120, top: 160, width: 760, height: 560 },
    haus: { right: -200, top: -260, width: 900, height: 640 },
  };

  return (
    <div
      className={`tc t-${theme.mode}`}
      style={{ ...(theme.vars as CSSProperties), position: "fixed", inset: 0, overflow: "hidden" }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touch.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
      }}
    >
      <div aria-hidden="true" className="tc-glow" style={glowPos[page]} />

      <div
        style={{
          position: "relative",
          height: "100%",
          boxSizing: "border-box",
          padding: "32px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header style={{ height: 72, flex: "none", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 28, minWidth: 0 }}>
            <div
              className="tc-display"
              style={{ fontSize: 76, fontWeight: 250, lineHeight: 0.82, letterSpacing: "-0.04em", whiteSpace: "nowrap" }}
            >
              {big}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 2, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 500 }}>{title}</div>
              <div className="tc-mono tc-dim" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                {sub}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              title={connectionState === "connected" ? "Verbunden" : "Keine Verbindung"}
              aria-label={connectionState === "connected" ? "Verbunden" : "Keine Verbindung"}
              role="img"
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: connectionState === "connected" ? "var(--t-accent)" : "oklch(0.65 0.2 30)",
              }}
            />
            <button
              type="button"
              className="tc-btn"
              onClick={theme.cyclePref}
              aria-label={`Darstellung: ${themeLabel}`}
              title={`Darstellung: ${themeLabel}`}
              style={{ width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <ThemeIcon size={22} strokeWidth={1.8} />
            </button>
            <nav
              aria-label="Seiten"
              className="tc-fill"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: 6, borderRadius: 999 }}
            >
              {PAGES.map((p) => {
                const active = p.id === page;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => setPage(p.id)}
                    className="tc-btn"
                    style={{
                      height: 44,
                      padding: "0 22px",
                      borderRadius: 999,
                      fontSize: 15,
                      fontWeight: active ? 600 : 500,
                      background: active ? "var(--t-accent)" : "transparent",
                      color: active ? "var(--t-on-accent)" : "var(--t-soft)",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        <AlertsBar />

        <div key={page} className="tc-page" style={{ flex: 1, minHeight: 0 }}>
          {page === "heute" && <HeuteView />}
          {page === "energie" && <EnergieView />}
          {page === "haus" && <HausView />}
        </div>
      </div>
    </div>
  );
}
