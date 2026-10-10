"use client";

import { useMemo } from "react";
import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { ROOMS } from "@/lib/hass/rooms";
import { useTibberPrices } from "@/lib/hooks/useTibberPrices";
import { Caption, fmt, Icon, num, useService, watts } from "./shared";

export function EnergieView() {
  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1.62fr 1fr", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, minHeight: 0 }}>
        <FlowZone />
        <StatsRow />
      </div>
      <CarZone />
    </div>
  );
}

// ─── Energiefluss (ParticleFlow) ──────────────────────────────

interface Sink {
  id: string;
  label: string;
  w: number;
}

const SRC = { x: 70, y: 180 };
const SINK_X = 500;

function FlowZone() {
  const { entities } = useHass();
  const totalW = watts(entities[ENTITIES.energy.power]);

  const sinks = useMemo<Sink[]>(() => {
    const rooms = ROOMS.map((r) => ({
      id: r.id,
      label: r.label,
      w: r.devices.reduce((s, d) => s + Math.max(0, watts(entities[d.entityId]) ?? 0), 0),
    }))
      .filter((r) => r.w > 5)
      .sort((a, b) => b.w - a.w)
      .slice(0, 5);
    const measured = rooms.reduce((s, r) => s + r.w, 0);
    const rest = totalW !== null ? totalW - measured : 0;
    const list = [...rooms];
    if (rest > 5) list.push({ id: "rest", label: "Sonstiges", w: rest });
    return list.sort((a, b) => b.w - a.w);
  }, [entities, totalW]);

  const idle = totalW !== null && totalW < 50;
  const maxW = Math.max(1, ...sinks.map((s) => s.w));
  const n = sinks.length;
  const ys = sinks.map((_, i) => (n === 1 ? SRC.y : 40 + (i * 280) / (n - 1)));

  return (
    <section
      aria-label="Energiefluss"
      className="tc-zone"
      style={{ flex: 1, minHeight: 0, boxSizing: "border-box", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Caption>Energiefluss · jetzt</Caption>
        <span className="tc-mono tc-dim" style={{ fontSize: 13 }}>
          {idle ? "das Haus schläft" : `${sinks.length} Verbraucher`}
        </span>
      </div>
      <svg
        role="img"
        aria-label={sinks.map((s) => `${s.label} ${Math.round(s.w)} Watt`).join(", ") || "Keine Verbrauchsdaten"}
        viewBox="0 0 660 360"
        preserveAspectRatio="xMinYMid meet"
        style={{ flex: 1, minHeight: 0, width: "100%" }}
      >
        {sinks.map((s, i) => {
          const d = `M${SRC.x} ${SRC.y} C 280 ${SRC.y}, 280 ${ys[i]}, ${SINK_X} ${ys[i]}`;
          const share = s.w / maxW;
          const count = idle ? 1 : Math.max(1, Math.min(5, Math.round(share * 5)));
          const dur = idle ? 8 : 2.4 + (1 - share) * 1.8;
          const r = 5 + Math.sqrt(share) * 17;
          const isRest = s.id === "rest";
          return (
            <g key={s.id}>
              <path d={d} fill="none" style={{ stroke: "var(--t-track)" }} strokeWidth="1.5" />
              {Array.from({ length: count }, (_, k) => (
                <circle key={k} r={2.2 + share * 1.4} style={{ fill: "var(--t-accent)" }}>
                  <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`-${((k * dur) / count).toFixed(2)}s`} path={d} />
                </circle>
              ))}
              <circle
                cx={SINK_X}
                cy={ys[i]}
                r={r}
                style={{ fill: idle || isRest ? "var(--t-idle)" : "var(--t-accent)" }}
                fillOpacity={idle || isRest ? 1 : 0.5 + share * 0.45}
              />
              <text x={SINK_X + 32} y={ys[i] - 3} style={{ fill: "var(--t-ink)", fontSize: 15, fontWeight: 600 }}>
                {s.label}
              </text>
              <text x={SINK_X + 32} y={ys[i] + 15} className="tc-mono" style={{ fill: "var(--t-dim)", fontSize: 13 }}>
                {fmt(s.w)} W
              </text>
            </g>
          );
        })}
        <circle cx={SRC.x} cy={SRC.y} r="44" style={{ fill: "var(--t-accent-soft)", stroke: "var(--t-accent)" }} strokeWidth="1.5" />
        <text x={SRC.x} y={SRC.y - 2} textAnchor="middle" className="tc-mono" style={{ fill: "var(--t-ink)", fontSize: 13, fontWeight: 500 }}>
          Netz
        </text>
        <text x={SRC.x} y={SRC.y + 15} textAnchor="middle" className="tc-mono" style={{ fill: "var(--t-dim)", fontSize: 12 }}>
          {totalW !== null ? `${fmt(totalW)} W` : "—"}
        </text>
      </svg>
    </section>
  );
}

// ─── Kosten-Kacheln ───────────────────────────────────────────

function StatsRow() {
  const { entities } = useHass();
  const { today } = useTibberPrices();
  const spot = useMemo(() => {
    if (today.length === 0) return null;
    const cts = today.map((n) => n.total * 100);
    return {
      avg: cts.reduce((s, x) => s + x, 0) / cts.length,
      min: Math.min(...cts),
      max: Math.max(...cts),
    };
  }, [today]);

  const tiles = [
    {
      k: "Heute",
      v: `${fmt(num(entities[ENTITIES.energy.dailyCost]), 2)} €`,
      s: `${fmt(num(entities[ENTITIES.energy.dailyConsumption]), 1)} kWh`,
    },
    {
      k: new Date().toLocaleDateString("de-DE", { month: "long" }),
      v: `${fmt(num(entities[ENTITIES.energy.monthlyCost]), 2)} €`,
      s: `${fmt(num(entities[ENTITIES.energy.monthlyConsumption]), 0)} kWh`,
    },
    {
      k: "Strompreis heute",
      v: spot ? `Ø ${fmt(spot.avg, 1)} ct` : "—",
      s: spot ? `${fmt(spot.min, 1)} – ${fmt(spot.max, 1)} ct` : "",
    },
  ];

  return (
    <section aria-label="Verbrauch und Kosten" style={{ flex: "none", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
      {tiles.map((t) => (
        <div key={t.k} className="tc-flat" style={{ boxSizing: "border-box", padding: "18px 22px", borderRadius: 28, display: "flex", flexDirection: "column", gap: 6 }}>
          <Caption>{t.k}</Caption>
          <span className="tc-display" style={{ fontSize: 34, fontWeight: 300, lineHeight: 1 }}>
            {t.v}
          </span>
          <span className="tc-mono tc-dim" style={{ fontSize: 13 }}>
            {t.s}
          </span>
        </div>
      ))}
    </section>
  );
}

// ─── Auto ─────────────────────────────────────────────────────

const RING_C = 2 * Math.PI * 96;

function CarZone() {
  const { entities } = useHass();
  const call = useService();
  const e = (id: string) => entities[id];

  const soc = num(e(ENTITIES.car.battery)) ?? num(e(ENTITIES.car.batteryLegacy));
  const range = num(e(ENTITIES.car.range)) ?? num(e(ENTITIES.car.rangeLegacy));
  const charging = e(ENTITIES.car.chargingBinary)?.state === "on";
  const plugged = e(ENTITIES.car.plugged)?.state === "on" || e(ENTITIES.car.cableConnected)?.state === "on";
  const locked = e(ENTITIES.car.lock)?.state === "locked";
  const chargerKw = num(e(ENTITIES.car.chargerPower));
  const speed = num(e(ENTITIES.car.chargingSpeed));
  const limit = num(e(ENTITIES.car.chargeLimit));
  const ttf = e(ENTITIES.car.timeToFull);
  const inside = num(e(ENTITIES.car.interiorTemp));
  const climate = e(ENTITIES.car.climate)?.state;
  const switchState = e(ENTITIES.car.chargeSwitch)?.state;

  const ttfText = (() => {
    if (!ttf || ttf.state === "unknown" || ttf.state === "unavailable") return null;
    const v = parseFloat(ttf.state);
    if (!Number.isFinite(v) || v <= 0) return null;
    const unit = String(ttf.attributes?.unit_of_measurement ?? "h");
    const minutes = unit === "min" ? v : v * 60;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h > 0 ? `noch ${h} h ${m} min` : `noch ${m} min`;
  })();

  const ringColor = charging ? "var(--t-tesla)" : "var(--t-accent)";
  const dash = soc !== null ? (Math.max(0, Math.min(100, soc)) / 100) * RING_C : 0;

  return (
    <section
      aria-label="Auto"
      className="tc-zone"
      style={{
        position: "relative",
        minHeight: 0,
        boxSizing: "border-box",
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        overflow: "hidden",
        background: charging
          ? "radial-gradient(120% 70% at 50% 0%, oklch(0.65 0.22 25 / 0.28), var(--t-zone-b) 75%)"
          : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Caption>Auto · Crest</Caption>
        <div style={{ display: "flex", gap: 6 }}>
          <span className="tc-fill" style={{ height: 28, padding: "0 12px", display: "flex", alignItems: "center", gap: 6, borderRadius: 999, fontSize: 13 }}>
            {locked ? <Icon.lock size={14} strokeWidth={2} /> : <Icon.unlock size={14} strokeWidth={2} />}
            {locked ? "Zu" : "Offen"}
          </span>
          {plugged && (
            <span className="tc-fill" style={{ height: 28, padding: "0 12px", display: "flex", alignItems: "center", gap: 6, borderRadius: 999, fontSize: 13 }}>
              <Icon.plug size={14} strokeWidth={2} />
              Eingesteckt
            </span>
          )}
        </div>
      </div>

      <div style={{ position: "relative", alignSelf: "center", width: 220, height: 220, flex: "none" }}>
        <svg aria-hidden="true" width="220" height="220" viewBox="0 0 220 220" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx="110" cy="110" r="96" fill="none" style={{ stroke: "var(--t-track)" }} strokeWidth="10" />
          <circle
            cx="110"
            cy="110"
            r="96"
            fill="none"
            style={{ stroke: ringColor, animation: charging ? "tc-charge 1.6s ease-in-out infinite" : undefined, transition: "stroke-dasharray 640ms" }}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${RING_C}`}
          />
          {limit !== null && (
            <circle
              cx="110"
              cy="110"
              r="96"
              fill="none"
              style={{ stroke: "var(--t-line)" }}
              strokeWidth="10"
              strokeDasharray={`2 ${RING_C}`}
              strokeDashoffset={-(limit / 100) * RING_C}
            />
          )}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <span className="tc-display" style={{ fontSize: 68, fontWeight: 250, lineHeight: 0.9, letterSpacing: "-0.04em" }}>
            {fmt(soc)}
            <span className="tc-dim" style={{ fontSize: 28 }}>
              %
            </span>
          </span>
          <span className="tc-mono tc-soft" style={{ fontSize: 14 }}>
            {range !== null ? `${fmt(range)} km` : "—"}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}>
        {charging ? (
          <>
            <span style={{ fontSize: 20, fontWeight: 600, color: "var(--t-tesla-text)" }}>
              Lädt{chargerKw !== null && chargerKw > 0 ? ` · ${fmt(chargerKw, 1)} kW` : ""}
            </span>
            <span className="tc-mono tc-soft" style={{ fontSize: 14 }}>
              {[limit !== null ? `bis ${fmt(limit)} %` : null, ttfText, speed !== null && speed > 0 ? `+${fmt(speed)} km/h` : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 20, fontWeight: 600 }}>{plugged ? "Eingesteckt · lädt nicht" : "Nicht eingesteckt"}</span>
            <span className="tc-mono tc-soft" style={{ fontSize: 14 }}>
              {limit !== null ? `Ladelimit ${fmt(limit)} %` : ""}
            </span>
          </>
        )}
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          type="button"
          className={charging ? "tc-btn" : "tc-btn tc-btn-inv"}
          disabled={!plugged || switchState === undefined || switchState === "unavailable"}
          onClick={() => call("switch", charging ? "turn_off" : "turn_on", { entity_id: ENTITIES.car.chargeSwitch })}
          style={{ height: 56, borderRadius: 999, fontSize: 16, fontWeight: 600 }}
        >
          {charging ? "Laden stoppen" : "Jetzt laden"}
        </button>
        <div className="tc-mono tc-dim" style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span>Klima {climate === "off" ? "aus" : climate ?? "—"}</span>
          <span>{inside !== null ? `${fmt(inside, 1)} °C innen` : ""}</span>
        </div>
      </div>
    </section>
  );
}
