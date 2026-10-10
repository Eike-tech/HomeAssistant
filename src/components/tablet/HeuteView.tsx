"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useHass } from "@/lib/hooks/useHass";
import { useEntities } from "@/lib/hooks/useEntity";
import { ENTITIES } from "@/lib/hass/entities";
import { useTibberPrices, type TibberPriceNode } from "@/lib/hooks/useTibberPrices";
import { useWeatherForecast } from "@/lib/hooks/useWeatherForecast";
import { useCalendarEvents, type CalendarEvent } from "@/lib/hooks/useCalendarEvents";
import { interpolateAccent, formatOkLch } from "@/lib/utils/cockpitColor";
import { Caption, conditionLabel, fmt, hhmm, num, pad2, useNow, WeatherIcon } from "./shared";

export function HeuteView() {
  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1.62fr 1fr", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, minHeight: 0 }}>
        <HeroZone />
        <HorizonZone />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, minHeight: 0 }}>
        <WeatherZone />
        <EventsZone />
        <WasteZone />
      </div>
    </div>
  );
}

// ─── Hero: live consumption ───────────────────────────────────

function useSparkline(value: number | null, everyMs = 30_000, keep = 120) {
  const [pts, setPts] = useState<number[]>([]);
  const last = useRef(0);
  useEffect(() => {
    if (value === null) return;
    const t = Date.now();
    if (t - last.current < everyMs) {
      // replace the newest sample so the line ends at the live value
      setPts((p) => (p.length ? [...p.slice(0, -1), value] : [value]));
      return;
    }
    last.current = t;
    setPts((p) => [...p, value].slice(-keep));
  }, [value, everyMs, keep]);
  return pts;
}

function HeroZone() {
  const { entities } = useHass();
  const powerKw = num(entities[ENTITIES.energy.power]);
  const price = num(entities[ENTITIES.energy.tibberPrice]); // €/kWh
  const costToday = num(entities[ENTITIES.energy.dailyCost]);
  const kwhToday = num(entities[ENTITIES.energy.dailyConsumption]);
  const quantile = num(entities[ENTITIES.energy.spotQuantile]);
  const rank = entities[ENTITIES.energy.spotRank]?.state;
  const spark = useSparkline(powerKw);

  const lit = quantile !== null ? Math.max(1, Math.ceil(Math.min(1, quantile) * 5)) : 0;
  const ctPerHour = powerKw !== null && price !== null ? powerKw * price * 100 : null;

  const sparkPath = useMemo(() => {
    if (spark.length < 2) return null;
    const min = Math.min(...spark);
    const max = Math.max(...spark);
    const span = max - min || 1;
    return spark
      .map((v, i) => {
        const x = (i / (spark.length - 1)) * 250;
        const y = 48 - ((v - min) / span) * 40;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [spark]);

  return (
    <section
      aria-label="Aktueller Verbrauch"
      className="tc-zone"
      style={{ flex: 1, minHeight: 0, boxSizing: "border-box", padding: "28px 32px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Caption>Aktueller Verbrauch</Caption>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Caption>{rank && rank !== "unknown" && rank !== "unavailable" ? `Preis-Rang ${rank}` : "Preis-Rang"}</Caption>
          <div role="img" aria-label={`Preisniveau ${lit} von 5`} style={{ display: "flex", gap: 4 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                style={{ width: 18, height: 8, borderRadius: 4, background: i <= lit ? "var(--t-accent)" : "var(--t-track)" }}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span className="tc-display" style={{ fontSize: 150, fontWeight: 220, lineHeight: 0.85, letterSpacing: "-0.05em" }}>
          {fmt(powerKw, 2)}
        </span>
        <span className="tc-display tc-dim" style={{ fontSize: 40, fontWeight: 300 }}>
          kW
        </span>
        {sparkPath && (
          <svg aria-hidden="true" width="250" height="56" viewBox="0 0 250 56" style={{ marginLeft: "auto", alignSelf: "center" }}>
            <path d={sparkPath} fill="none" stroke="var(--t-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div className="tc-mono tc-dim" style={{ display: "flex", gap: 40, fontSize: 15 }}>
        <Stat value={price !== null ? `${fmt(price * 100, 1)} ct` : "—"} label="pro kWh, jetzt" />
        <Stat value={ctPerHour !== null ? `≈ ${fmt(ctPerHour)} ct/h` : "—"} label="laufende Kosten" />
        <Stat value={costToday !== null ? `${fmt(costToday, 2)} €` : "—"} label={`heute · ${fmt(kwhToday, 1)} kWh`} />
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="tc-display" style={{ fontSize: 30, fontWeight: 350, color: "var(--t-ink)" }}>
        {value}
      </span>
      <span>{label}</span>
    </div>
  );
}

// ─── Spotpreis-Horizont (next 24 h) ───────────────────────────

const W = 1000;
const H = 200;
const TOP = 24;
const BOT = 186;

interface HorizonGeom {
  line: string;
  area: string;
  stops: { offset: number; color: string }[];
  nowX: number;
  nowY: number;
  nowCt: number;
  min: number;
  max: number;
  peak: { x: number; ct: number; at: Date } | null;
  cheap: { x0: number; x1: number; from: Date; to: Date; avg: number } | null;
  ticks: { x: number; label: string }[];
}

function buildHorizon(nodes: TibberPriceNode[], now: Date): HorizonGeom | null {
  const startHour = new Date(now);
  startHour.setMinutes(0, 0, 0);
  const pts = nodes
    .map((n) => ({ t: new Date(n.startsAt).getTime(), ct: n.total * 100 }))
    .filter((p) => p.t >= startHour.getTime() - 1)
    .sort((a, b) => a.t - b.t);
  if (pts.length < 2) return null;

  const step = pts[1].t - pts[0].t || 3_600_000;
  const t0 = pts[0].t;
  const t1 = Math.min(t0 + 24 * 3_600_000, pts[pts.length - 1].t + step);
  const win = pts.filter((p) => p.t < t1);
  const span = t1 - t0;
  const xOf = (t: number) => ((t - t0) / span) * W;

  const cts = win.map((p) => p.ct);
  const min = Math.min(...cts);
  const max = Math.max(...cts);
  const range = max - min || 1;
  const yOf = (ct: number) => BOT - ((ct - min) / range) * (BOT - TOP);

  // points at the middle of each slot, plus flat ends
  const xy = win.map((p) => [xOf(p.t + step / 2), yOf(p.ct)] as const);
  const all = [[0, xy[0][1]] as const, ...xy, [W, xy[xy.length - 1][1]] as const];
  let line = `M${all[0][0].toFixed(1)} ${all[0][1].toFixed(1)}`;
  for (let i = 0; i < all.length - 1; i++) {
    const mx = (all[i][0] + all[i + 1][0]) / 2;
    const my = (all[i][1] + all[i + 1][1]) / 2;
    line += ` Q${all[i][0].toFixed(1)} ${all[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  line += ` L${W} ${all[all.length - 1][1].toFixed(1)}`;
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  const stops = win.map((p) => ({
    offset: (xOf(p.t + step / 2) / W) * 100,
    color: formatOkLch(interpolateAccent((p.ct - min) / range)),
  }));

  const nowMs = now.getTime();
  const nowIdx = Math.max(0, win.findIndex((p) => nowMs >= p.t && nowMs < p.t + step));
  const nowX = xOf(nowMs);
  const nowCt = win[nowIdx].ct;

  const peakP = win.reduce((a, b) => (b.ct > a.ct ? b : a));
  const peak = { x: xOf(peakP.t + step / 2), ct: peakP.ct, at: new Date(peakP.t) };

  // cheapest consecutive 3 h block that has not ended yet
  const n = Math.max(1, Math.round((3 * 3_600_000) / step));
  let cheap: HorizonGeom["cheap"] = null;
  for (let i = 0; i + n <= win.length; i++) {
    const slice = win.slice(i, i + n);
    const avg = slice.reduce((s, p) => s + p.ct, 0) / n;
    if (!cheap || avg < cheap.avg) {
      cheap = {
        x0: xOf(slice[0].t),
        x1: xOf(slice[n - 1].t + step),
        from: new Date(slice[0].t),
        to: new Date(slice[n - 1].t + step),
        avg,
      };
    }
  }

  const ticks: HorizonGeom["ticks"] = [];
  for (let h = 0; h <= 24; h += 4) {
    const t = t0 + h * 3_600_000;
    if (t > t1) break;
    ticks.push({ x: xOf(t), label: pad2(new Date(t).getHours()) });
  }

  return { line, area, stops, nowX, nowY: yOf(nowCt), nowCt, min, max, peak, cheap, ticks };
}

function HorizonZone() {
  const { today, tomorrow, loading, error } = useTibberPrices();
  const now = useNow(60_000);
  const geom = useMemo(() => buildHorizon([...today, ...tomorrow], now), [today, tomorrow, now]);
  const pct = (x: number) => `${(x / W) * 100}%`;

  return (
    <section
      aria-label="Spotpreis der nächsten 24 Stunden"
      className="tc-zone"
      style={{ height: 284, flex: "none", boxSizing: "border-box", padding: "24px 32px 20px", display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Caption>Spotpreis · nächste 24 h</Caption>
        {geom?.cheap && (
          <div className="tc-soft" style={{ fontSize: 15 }}>
            Günstigstes Fenster{" "}
            <span className="tc-mono" style={{ color: "var(--t-accent-text)" }}>
              {pad2(geom.cheap.from.getHours())}–{pad2(geom.cheap.to.getHours())} Uhr · Ø {fmt(geom.cheap.avg, 1)} ct
            </span>
          </div>
        )}
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {!geom && (
          <div className="tc-dim" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
            {error ? `Preise nicht verfügbar (${error})` : loading ? "Lade Preise …" : "Keine Preisdaten"}
          </div>
        )}
        {geom && (
          <>
            {geom.cheap && (
              <div
                aria-hidden="true"
                className="tc-fill"
                style={{ position: "absolute", left: pct(geom.cheap.x0), width: pct(geom.cheap.x1 - geom.cheap.x0), top: 0, bottom: 0, borderRadius: 12 }}
              />
            )}
            <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
              <defs>
                <linearGradient id="tc-hz-fill" x1="0" x2="1" y1="0" y2="0">
                  {geom.stops.map((s, i) => (
                    <stop key={i} offset={`${s.offset}%`} stopColor={s.color} />
                  ))}
                </linearGradient>
                <linearGradient id="tc-hz-fade" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="15%" stopColor="#fff" stopOpacity="1" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <mask id="tc-hz-mask">
                  <rect x="0" y="0" width={W} height={H} fill="url(#tc-hz-fade)" />
                </mask>
              </defs>
              <path d={geom.area} fill="url(#tc-hz-fill)" opacity="0.6" mask="url(#tc-hz-mask)" />
              <path d={geom.line} fill="none" stroke="var(--t-ink)" strokeOpacity="0.85" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <div aria-hidden="true" style={{ position: "absolute", left: pct(geom.nowX), top: 0, bottom: 0, width: 1, background: "var(--t-line)" }} />
            <div
              aria-hidden="true"
              style={{ position: "absolute", left: pct(geom.nowX), top: `${(geom.nowY / H) * 100}%`, width: 12, height: 12, transform: "translate(-6px, -6px)" }}
            >
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--t-accent)", animation: "tc-ping 2.4s ease-out infinite" }} />
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--t-accent)", boxShadow: "0 0 0 3px var(--t-bg)" }} />
            </div>
            <div className="tc-mono" style={{ position: "absolute", left: `calc(${pct(geom.nowX)} + 12px)`, top: -4, fontSize: 13 }}>
              jetzt {fmt(geom.nowCt, 1)}
            </div>
            {geom.peak && Math.abs(geom.peak.x - geom.nowX) > 140 && (
              <div
                className="tc-mono tc-dim"
                style={{ position: "absolute", left: pct(geom.peak.x), top: 2, fontSize: 13, transform: "translateX(-50%)", whiteSpace: "nowrap" }}
              >
                Spitze {fmt(geom.peak.ct, 1)} · {geom.peak.at.getHours()} Uhr
              </div>
            )}
          </>
        )}
      </div>

      <div className="tc-mono tc-dim" style={{ position: "relative", height: 16, fontSize: 12 }}>
        {geom?.ticks.map((t) => (
          <span key={t.x} style={{ position: "absolute", left: pct(t.x), transform: t.x > W - 20 ? "translateX(-100%)" : undefined }}>
            {t.label}
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── Wetter ───────────────────────────────────────────────────

function WeatherZone() {
  const { entities } = useHass();
  const w = entities[ENTITIES.general.weather];
  const { forecast } = useWeatherForecast(ENTITIES.general.weather, "daily");
  const temp = typeof w?.attributes?.temperature === "number" ? (w.attributes.temperature as number) : null;

  const { today, days } = useMemo(() => {
    const todayKey = new Date().toDateString();
    const isToday = forecast.length > 0 && new Date(forecast[0].datetime).toDateString() === todayKey;
    return {
      today: isToday ? forecast[0] : null,
      days: (isToday ? forecast.slice(1) : forecast).slice(0, 5),
    };
  }, [forecast]);

  const lo = (p: unknown) => {
    const v = (p as { templow?: number | null } | null)?.templow;
    return typeof v === "number" ? v : null;
  };

  return (
    <section
      aria-label="Wetter"
      className="tc-zone"
      style={{ flex: "none", boxSizing: "border-box", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span className="tc-display" style={{ fontSize: 72, fontWeight: 220, lineHeight: 0.85, letterSpacing: "-0.04em" }}>
            {temp !== null ? `${fmt(temp)}°` : "—"}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 17, fontWeight: 500 }}>{conditionLabel(w?.state)}</span>
            {today && (
              <span className="tc-mono tc-dim" style={{ fontSize: 13 }}>
                {fmt(today.temperature)}° / {fmt(lo(today))}°
                {typeof today.precipitation_probability === "number" ? ` · ${fmt(today.precipitation_probability)} % Regen` : ""}
              </span>
            )}
          </div>
        </div>
        <WeatherIcon condition={w?.state} size={56} strokeWidth={1.2} style={{ color: "var(--t-soft)" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}>
        {days.map((d) => (
          <div
            key={d.datetime}
            className="tc-fill"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 0", borderRadius: 16 }}
          >
            <span className="tc-soft" style={{ fontSize: 13, fontWeight: 600 }}>
              {new Date(d.datetime).toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "")}
            </span>
            <WeatherIcon condition={d.condition} size={24} strokeWidth={1.5} />
            <span className="tc-mono" style={{ fontSize: 13 }}>
              {fmt(d.temperature)}°<span className="tc-muted"> {fmt(lo(d))}°</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Termine ──────────────────────────────────────────────────

const DEFAULT_CALENDARS = ["calendar.familie"];
const CAL_COLORS = [
  "oklch(0.74 0.13 150)",
  "oklch(0.68 0.17 30)",
  "oklch(0.80 0.13 85)",
  "oklch(0.70 0.12 250)",
  "oklch(0.72 0.12 320)",
];

function useTabletCalendars(): string[] {
  const [list, setList] = useState<string[]>(DEFAULT_CALENDARS);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = window.location.pathname.replace(/\/[^/]*$/, "");
        const res = await fetch(`${base}/config.json`, { cache: "no-store" });
        if (!res.ok) return;
        const cfg = (await res.json()) as { ipadCalendarEntities?: string[] };
        if (!cancelled && Array.isArray(cfg.ipadCalendarEntities) && cfg.ipadCalendarEntities.length > 0) {
          setList(cfg.ipadCalendarEntities);
        }
      } catch {
        // keep defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return list;
}

function calLabel(entityId: string): string {
  const tail = entityId.split(".").pop() ?? entityId;
  return tail.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function eventWhen(ev: CalendarEvent, now: Date): { text: string; today: boolean } {
  const start = ev.allDay ? new Date(`${ev.start}T00:00:00`) : new Date(ev.start);
  const today = start.toDateString() === now.toDateString() || (start < now && !ev.allDay);
  if (today) return { text: ev.allDay ? "heute" : hhmm(start), today: true };
  const wd = start.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
  return { text: `${wd} ${start.getDate()}`, today: false };
}

function EventsZone() {
  const ids = useTabletCalendars();
  const { events, loading } = useCalendarEvents(ids, 7);
  const now = useNow(60_000);

  const upcoming = useMemo(() => {
    const nowMs = now.getTime();
    return events
      .filter((e) => {
        const end = e.allDay ? new Date(`${e.end}T00:00:00`).getTime() : new Date(e.end).getTime();
        return end > nowMs;
      })
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 5);
  }, [events, now]);

  return (
    <section
      aria-label="Termine"
      className="tc-flat"
      style={{ flex: 1, minHeight: 0, boxSizing: "border-box", padding: "22px 28px", display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}
    >
      <Caption>Termine</Caption>
      {upcoming.length === 0 && (
        <div className="tc-dim" style={{ fontSize: 15 }}>
          {loading ? "Lade Termine …" : "Keine Termine in den nächsten 7 Tagen."}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
        {upcoming.map((e, i) => {
          const when = eventWhen(e, now);
          const color = CAL_COLORS[Math.max(0, ids.indexOf(e.entityId)) % CAL_COLORS.length];
          return (
            <div key={`${e.entityId}-${e.start}-${i}`} style={{ display: "grid", gridTemplateColumns: "64px minmax(0,1fr) auto", alignItems: "center", gap: 14, minHeight: 44 }}>
              <span className="tc-mono" style={{ fontSize: 15, color: when.today ? "var(--t-accent-text)" : "var(--t-dim)" }}>
                {when.text}
              </span>
              <span style={{ fontSize: 16, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: when.today ? "var(--t-ink)" : "var(--t-soft)" }}>
                {e.summary || "(ohne Titel)"}
              </span>
              {ids.length > 1 && (
                <span className="tc-dim" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                  {calLabel(e.entityId)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Abfuhr ───────────────────────────────────────────────────

const WASTE = [
  { entityId: "sensor.waste_collection_schedule_bioabfall", label: "Bioabfall", color: "oklch(0.74 0.13 150)" },
  { entityId: "sensor.waste_collection_schedule_restabfall", label: "Restmüll", color: "oklch(0.60 0.02 260)" },
  { entityId: "sensor.waste_collection_schedule_gelber_sack_tonne", label: "Gelber Sack", color: "oklch(0.84 0.14 90)" },
  { entityId: "sensor.waste_collection_schedule_altpapier", label: "Altpapier", color: "oklch(0.68 0.13 254)" },
];
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function WasteZone() {
  const ents = useEntities(WASTE.map((w) => w.entityId));
  const next = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const all: { label: string; color: string; date: Date; days: number }[] = [];
    ents.forEach((e, i) => {
      if (!e?.attributes) return;
      for (const k of Object.keys(e.attributes)) {
        if (!DATE_KEY.test(k)) continue;
        const [y, m, d] = k.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        const days = Math.round((date.getTime() - today) / 86_400_000);
        if (days >= 0 && days <= 30) all.push({ label: WASTE[i].label, color: WASTE[i].color, date, days });
      }
    });
    return all.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 2);
  }, [ents]);

  if (next.length === 0) return null;

  return (
    <section
      aria-label="Abfuhr"
      className="tc-flat"
      style={{ flex: "none", boxSizing: "border-box", padding: "18px 20px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}
    >
      {next.map((w) => {
        const soon = w.days <= 1;
        const when =
          w.days === 0
            ? "Heute"
            : w.days === 1
              ? "Morgen"
              : `${w.date.toLocaleDateString("de-DE", { weekday: w.days <= 6 ? "long" : "short" })} · in ${w.days} Tagen`;
        return (
          <div
            key={`${w.label}-${w.date.getTime()}`}
            className={soon ? undefined : "tc-fill"}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 22, background: soon ? "var(--t-accent-soft)" : undefined }}
          >
            <span style={{ width: 10, height: 36, borderRadius: 5, background: w.color, flex: "none" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{w.label}</span>
              <span className={`tc-mono ${soon ? "tc-soft" : "tc-dim"}`} style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {when}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
