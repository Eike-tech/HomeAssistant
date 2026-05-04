// Server-rendered, Safari 12-compatible iPad dashboard.
// Magazine / editorial light theme — system serif headlines + sans body, hairline dividers,
// no client JS, no oklch, no flex-gap. Auto-refreshes every 30 seconds via meta refresh.

import {
  fetchHaState,
  fetchHaStates,
  fetchHaCalendarEvents,
  type HaState,
  type HaCalendarEvent,
} from "@/lib/server/haClient";
import { fetchTibberPrices, type TibberPriceNode } from "@/lib/server/tibberClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REFRESH_SECONDS = 30;

const POWER_ENTITY = "sensor.tibber_pulse_mount_cleltze_leistung"; // kW
const PRICE_ENTITY = "sensor.mount_cleltze_strompreis"; // EUR/kWh
const COST_TODAY_ENTITY = "sensor.tibber_pulse_mount_cleltze_kumulierte_kosten";
const FEED_ENTITY = "sensor.tibber_pulse_mount_cleltze_einspeiseleistung"; // W
const WEATHER_ENTITY = "weather.forecast_home";

const WASTE_SENSORS: { entityId: string; label: string }[] = [
  { entityId: "sensor.waste_collection_schedule_restabfall", label: "Restabfall" },
  { entityId: "sensor.waste_collection_schedule_bioabfall", label: "Bioabfall" },
  { entityId: "sensor.waste_collection_schedule_gelber_sack_tonne", label: "Gelber Sack" },
  { entityId: "sensor.waste_collection_schedule_altpapier", label: "Altpapier" },
];

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Helpers ───────────────────────────────────────────────────

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function num(state: HaState | null | undefined): number | null {
  if (!state) return null;
  const n = parseFloat(state.state);
  return isFinite(n) ? n : null;
}

function fmtPriceCt(eurPerKwh: number): string {
  return `${(eurPerKwh * 100).toFixed(1)} ct`;
}

// Editorial palette: muted neutrals → green/amber/red on a creme background
function priceColor(total: number, min: number, max: number): string {
  if (max === min) return "#9ba18b";
  const q = (total - min) / (max - min);
  if (q < 0.33) return "#2f6b3d"; // günstig
  if (q < 0.66) return "#b07a1f"; // mittel
  return "#a83020"; // teuer
}

function parseLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(now: Date, target: Date): number {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

function fmtRelative(days: number, date: Date): string {
  if (days === 0) return "Heute";
  if (days === 1) return "Morgen";
  if (days <= 7) return date.toLocaleDateString("de-DE", { weekday: "long" });
  return date.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
}

function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function condLabel(cond: string | null): string {
  if (!cond) return "—";
  const map: Record<string, string> = {
    "clear-night": "Klare Nacht",
    cloudy: "Bewölkt",
    fog: "Nebel",
    hail: "Hagel",
    lightning: "Gewitter",
    "lightning-rainy": "Gewitter mit Regen",
    partlycloudy: "Teilweise bewölkt",
    pouring: "Starker Regen",
    rainy: "Regen",
    snowy: "Schnee",
    "snowy-rainy": "Schneeregen",
    sunny: "Sonnig",
    windy: "Windig",
    "windy-variant": "Windig",
    exceptional: "Extrem",
  };
  return map[cond] ?? cond.replace(/-/g, " ");
}

// ─── Section renderers ─────────────────────────────────────────

function renderMasthead(now: Date): string {
  const dateLong = now
    .toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .toUpperCase();
  const time = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `
    <header class="masthead">
      <div class="masthead-date">${esc(dateLong)}</div>
      <div class="masthead-time">${esc(time)}</div>
    </header>`;
}

function renderHero(today: TibberPriceNode[], weather: HaState | null): string {
  // Weather block (right side of hero)
  const tempRaw = weather?.attributes?.temperature;
  const temp = typeof tempRaw === "number" ? tempRaw : null;
  const humRaw = weather?.attributes?.humidity;
  const hum = typeof humRaw === "number" ? humRaw : null;
  const windRaw = weather?.attributes?.wind_speed;
  const wind = typeof windRaw === "number" ? windRaw : null;
  const condition = weather?.state ?? null;

  const weatherBlock = `
    <div class="hero-weather">
      <div class="weather-temp">${temp !== null ? esc(Math.round(temp)) + "°" : "—"}</div>
      <div class="weather-cond">${esc(condLabel(condition))}</div>
      <div class="weather-meta">
        ${hum !== null ? `<span>${esc(Math.round(hum))} % rF</span>` : ""}
        ${wind !== null ? `<span>${esc(Math.round(wind))} km/h Wind</span>` : ""}
      </div>
    </div>`;

  // Prices block (left side of hero)
  let priceBlock: string;
  if (today.length === 0) {
    priceBlock = `
      <div class="hero-price">
        <div class="section-label">Strompreis heute</div>
        <div class="empty-large">Keine Preisdaten</div>
      </div>`;
  } else {
    const totals = today.map((n) => n.total);
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    const avg = totals.reduce((s, x) => s + x, 0) / totals.length;
    const now = new Date();
    const currentHour = new Date(now);
    currentHour.setMinutes(0, 0, 0);

    let currentTotal: number | null = null;
    let currentIdx = -1;
    for (let i = 0; i < today.length; i++) {
      const ts = new Date(today[i].startsAt).getTime();
      if (ts === currentHour.getTime()) {
        currentTotal = today[i].total;
        currentIdx = i;
        break;
      }
    }

    const cheapest = new Set<number>(
      today
        .map((n, i) => ({ i, t: n.total, ts: new Date(n.startsAt).getTime() }))
        .filter((x) => x.ts >= currentHour.getTime())
        .sort((a, b) => a.t - b.t)
        .slice(0, 3)
        .map((x) => x.i)
    );

    const bars = today
      .map((n, i) => {
        const ts = new Date(n.startsAt).getTime();
        const isPast = ts < currentHour.getTime();
        const isCurrent = i === currentIdx;
        const opacity = isPast ? "0.32" : "1";
        const bg = priceColor(n.total, min, max);
        const cls =
          "bar" +
          (isCurrent ? " bar-current" : "") +
          (cheapest.has(i) && !isPast ? " bar-cheap" : "");
        return `<div class="${cls}" style="background:${bg};opacity:${opacity};"></div>`;
      })
      .join("");

    priceBlock = `
      <div class="hero-price">
        <div class="section-label">Strompreis heute</div>
        <div class="hero-num">${currentTotal !== null ? esc(fmtPriceCt(currentTotal)) : "—"}</div>
        <div class="hero-stats">Min ${esc(fmtPriceCt(min))} &nbsp;·&nbsp; Ø ${esc(fmtPriceCt(avg))} &nbsp;·&nbsp; Max ${esc(fmtPriceCt(max))}</div>
        <div class="bars">${bars}</div>
        <div class="hour-axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
      </div>`;
  }

  return `
    <section class="hero">
      ${priceBlock}
      <div class="hero-divider"></div>
      ${weatherBlock}
    </section>`;
}

function renderLive(states: Record<string, HaState | null>): string {
  const power = num(states[POWER_ENTITY]); // kW
  const price = num(states[PRICE_ENTITY]); // EUR/kWh
  const cost = num(states[COST_TODAY_ENTITY]); // EUR
  const feed = num(states[FEED_ENTITY]); // W
  const ctPerHour = power !== null && price !== null ? power * price * 100 : null;
  const feedStr = feed !== null && feed > 0
    ? Math.abs(feed) >= 1000
      ? `${(feed / 1000).toFixed(2)} kW`
      : `${Math.round(feed)} W`
    : null;

  return `
    <div class="col live">
      <div class="section-label">Verbrauch jetzt</div>
      <div class="col-num">${power !== null ? esc(power.toFixed(2)) : "—"} <span class="col-unit">kW</span></div>
      ${ctPerHour !== null ? `<div class="col-sub">≈ ${esc(ctPerHour.toFixed(0))} ct/h</div>` : ""}
      <div class="col-line">Kosten heute <b>${cost !== null ? esc(cost.toFixed(2)) + " €" : "—"}</b></div>
      ${feedStr ? `<div class="col-line">Einspeisung <b>${esc(feedStr)}</b></div>` : ""}
    </div>`;
}

function renderWaste(states: Record<string, HaState | null>): string {
  const now = new Date();
  type Entry = { date: Date; type: string; days: number };
  const all: Entry[] = [];
  for (const cfg of WASTE_SENSORS) {
    const s = states[cfg.entityId];
    if (!s?.attributes) continue;
    for (const key of Object.keys(s.attributes)) {
      if (!DATE_KEY_RE.test(key)) continue;
      const date = parseLocalDate(key);
      const days = daysBetween(now, date);
      if (days < 0 || days > 21) continue;
      all.push({ date, type: cfg.label, days });
    }
  }
  all.sort((a, b) => a.date.getTime() - b.date.getTime());
  const top = all.slice(0, 4);

  let body: string;
  if (top.length === 0) {
    body = `<div class="empty">Keine Termine in den nächsten 21 Tagen.</div>`;
  } else {
    body = `<ul class="waste-list">` +
      top.map((u) => {
        const datePart = u.date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
        const relPart = fmtRelative(u.days, u.date);
        const cls = u.days <= 1 ? " urgent" : "";
        return `<li class="waste-item${cls}"><span class="waste-when">${esc(relPart)}</span><span class="waste-sep">·</span><span class="waste-type">${esc(u.type)}</span><span class="waste-date">${esc(datePart)}</span></li>`;
      }).join("") +
      `</ul>`;
  }

  return `
    <div class="col waste">
      <div class="section-label">Müllabfuhr</div>
      ${body}
    </div>`;
}

function renderCalendar(eventsByCalendar: Record<string, HaCalendarEvent[]>): string {
  type Norm = { start: Date; end: Date; allDay: boolean; summary: string };
  const all: Norm[] = [];
  for (const events of Object.values(eventsByCalendar)) {
    for (const ev of events) {
      const dateTime = ev.start?.dateTime ?? null;
      const date = ev.start?.date ?? null;
      if (dateTime) {
        all.push({
          start: new Date(dateTime),
          end: new Date(ev.end?.dateTime ?? dateTime),
          allDay: false,
          summary: ev.summary ?? "(ohne Titel)",
        });
      } else if (date) {
        all.push({
          start: parseLocalDate(date),
          end: ev.end?.date ? parseLocalDate(ev.end.date) : parseLocalDate(date),
          allDay: true,
          summary: ev.summary ?? "(ohne Titel)",
        });
      }
    }
  }
  all.sort((a, b) => a.start.getTime() - b.start.getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDateKey(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = localDateKey(tomorrow);

  const groups = new Map<string, { date: Date; label: string; events: Norm[] }>();
  for (const ev of all) {
    const k = localDateKey(ev.start);
    if (!groups.has(k)) {
      const d = parseLocalDate(k);
      let label: string;
      if (k === todayKey) label = "Heute";
      else if (k === tomorrowKey) label = "Morgen";
      else label = d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "short" });
      groups.set(k, { date: d, label, events: [] });
    }
    groups.get(k)!.events.push(ev);
  }
  const days = Array.from(groups.values()).slice(0, 4);

  if (days.length === 0) {
    return `
      <section class="calendar">
        <div class="section-label">Kalender</div>
        <div class="empty">Keine Termine in den nächsten 8 Tagen.</div>
      </section>`;
  }

  const body = days
    .map((g) => {
      const items = g.events
        .slice(0, 3)
        .map((ev) => {
          const time = ev.allDay ? "ganztägig" : fmtTime(ev.start);
          return `<li><span class="cal-time">${esc(time)}</span><span class="cal-title">${esc(ev.summary)}</span></li>`;
        })
        .join("");
      const more = g.events.length > 3 ? `<li class="cal-more">+${g.events.length - 3}</li>` : "";
      const isToday = g.label === "Heute";
      return `
        <div class="cal-day${isToday ? " cal-day-today" : ""}">
          <div class="cal-day-label">${esc(g.label)}</div>
          <ul>${items}${more}</ul>
        </div>`;
    })
    .join("");

  return `
    <section class="calendar">
      <div class="section-label">Kalender</div>
      <div class="cal-row">${body}</div>
    </section>`;
}

// ─── Page renderer ─────────────────────────────────────────────

function renderPage(html: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="${REFRESH_SECONDS}">
<meta name="viewport" content="width=1024, initial-scale=1">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Cockpit">
<title>Cockpit</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; width: 100%; }
body {
  font-family: -apple-system, "Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif;
  background: #faf7f0;
  color: #1c1d1f;
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
  font-feature-settings: "kern", "liga";
}

main {
  width: 100vw;
  height: 100vh;
  padding: 28px 36px 24px;
  display: -webkit-flex;
  display: flex;
  -webkit-flex-direction: column;
  flex-direction: column;
}

/* ─── Masthead (date + time, magazine top bar) ─── */
.masthead {
  display: -webkit-flex;
  display: flex;
  -webkit-justify-content: space-between;
  justify-content: space-between;
  -webkit-align-items: baseline;
  align-items: baseline;
  border-bottom: 2px solid #1c1d1f;
  padding-bottom: 10px;
  margin-bottom: 6px;
}
.masthead-date {
  font-family: "Charter", "Iowan Old Style", Georgia, "Times New Roman", serif;
  font-size: 18px;
  letter-spacing: 0.04em;
  font-weight: 600;
}
.masthead-time {
  font-family: "Charter", Georgia, serif;
  font-variant-numeric: tabular-nums;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
}

/* ─── Section labels (small caps) ─── */
.section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #7d2a16;
  margin-bottom: 12px;
}

/* ─── Hero (Strompreis + Wetter) ─── */
.hero {
  display: -webkit-flex;
  display: flex;
  -webkit-flex-direction: row;
  flex-direction: row;
  -webkit-align-items: stretch;
  align-items: stretch;
  padding: 22px 0 24px;
  border-bottom: 1px solid #d8d4c8;
}
.hero-price {
  -webkit-flex: 1 1 auto;
  flex: 1 1 auto;
  min-width: 0;
  padding-right: 28px;
}
.hero-divider {
  width: 1px;
  background: #d8d4c8;
  margin: 0 28px 0 0;
}
.hero-weather {
  -webkit-flex: 0 0 280px;
  flex: 0 0 280px;
  display: -webkit-flex;
  display: flex;
  -webkit-flex-direction: column;
  flex-direction: column;
  -webkit-justify-content: center;
  justify-content: center;
}
.hero-num {
  font-family: "Charter", "Iowan Old Style", Georgia, "Times New Roman", serif;
  font-size: 88px;
  font-weight: 600;
  line-height: 0.92;
  letter-spacing: -0.035em;
  color: #1c1d1f;
  font-variant-numeric: tabular-nums;
  margin-bottom: 10px;
}
.hero-stats {
  font-size: 13px;
  color: #4b4d52;
  letter-spacing: 0.02em;
  margin-bottom: 16px;
  font-variant-numeric: tabular-nums;
}
.empty-large {
  font-family: "Charter", Georgia, serif;
  font-size: 28px;
  color: #8d8f96;
}

/* Heatbar — uniform-height color bands */
.bars {
  display: -webkit-flex;
  display: flex;
  -webkit-align-items: stretch;
  align-items: stretch;
  height: 56px;
  margin-top: 4px;
}
.bar {
  -webkit-flex: 1 1 0;
  flex: 1 1 0;
  margin: 0 1px;
  border-radius: 1px;
  position: relative;
}
.bar-current {
  border: 1.5px solid #1c1d1f;
  margin: -1.5px 1px 0;
  border-radius: 2px;
}
.bar-cheap::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -8px;
  width: 4px;
  height: 4px;
  margin-left: -2px;
  border-radius: 50%;
  background: #1c1d1f;
}
.hour-axis {
  display: -webkit-flex;
  display: flex;
  -webkit-justify-content: space-between;
  justify-content: space-between;
  font-size: 10px;
  color: #8d8f96;
  padding: 14px 1px 0;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
}

/* Weather hero block */
.weather-temp {
  font-family: "Charter", "Iowan Old Style", Georgia, "Times New Roman", serif;
  font-size: 76px;
  font-weight: 500;
  line-height: 0.95;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  margin-bottom: 8px;
}
.weather-cond {
  font-family: "Charter", Georgia, serif;
  font-style: italic;
  font-size: 18px;
  color: #4b4d52;
  margin-bottom: 8px;
}
.weather-meta {
  font-size: 13px;
  color: #4b4d52;
  font-variant-numeric: tabular-nums;
}
.weather-meta span { margin-right: 14px; }

/* ─── Mid-row: Verbrauch + Müllabfuhr (two columns) ─── */
.mid-row {
  display: -webkit-flex;
  display: flex;
  -webkit-flex-direction: row;
  flex-direction: row;
  -webkit-align-items: stretch;
  align-items: stretch;
  padding: 22px 0 24px;
  border-bottom: 1px solid #d8d4c8;
}
.col {
  -webkit-flex: 1 1 0;
  flex: 1 1 0;
  min-width: 0;
  padding-right: 28px;
}
.col + .col {
  border-left: 1px solid #d8d4c8;
  padding-left: 28px;
  padding-right: 0;
}
.col-num {
  font-family: "Charter", "Iowan Old Style", Georgia, "Times New Roman", serif;
  font-size: 56px;
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  margin-bottom: 4px;
}
.col-unit {
  font-family: "Charter", Georgia, serif;
  font-size: 24px;
  font-weight: 400;
  color: #4b4d52;
  margin-left: 4px;
}
.col-sub {
  font-size: 13px;
  color: #8d8f96;
  font-variant-numeric: tabular-nums;
  margin-bottom: 14px;
}
.col-line {
  font-size: 14px;
  color: #4b4d52;
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
}
.col-line b {
  color: #1c1d1f;
  font-weight: 600;
}

.empty {
  font-size: 14px;
  color: #8d8f96;
  font-style: italic;
}

/* Müllabfuhr list */
.waste-list { list-style: none; }
.waste-item {
  display: -webkit-flex;
  display: flex;
  -webkit-align-items: baseline;
  align-items: baseline;
  padding: 6px 0;
  border-bottom: 1px solid #ece8da;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.waste-item:last-child { border-bottom: none; }
.waste-when {
  font-weight: 600;
  color: #1c1d1f;
  width: 96px;
  -webkit-flex-shrink: 0;
  flex-shrink: 0;
}
.waste-sep {
  color: #d8d4c8;
  margin: 0 8px;
}
.waste-type {
  -webkit-flex: 1 1 auto;
  flex: 1 1 auto;
  color: #4b4d52;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.waste-date {
  color: #8d8f96;
  font-size: 12px;
}
.waste-item.urgent .waste-when { color: #a83020; }

/* ─── Calendar banner ─── */
.calendar {
  -webkit-flex: 1 1 auto;
  flex: 1 1 auto;
  padding: 22px 0 0;
  min-height: 0;
}
.cal-row {
  display: -webkit-flex;
  display: flex;
  -webkit-flex-direction: row;
  flex-direction: row;
  -webkit-align-items: stretch;
  align-items: stretch;
}
.cal-day {
  -webkit-flex: 1 1 0;
  flex: 1 1 0;
  min-width: 0;
  padding-right: 22px;
}
.cal-day + .cal-day {
  border-left: 1px solid #d8d4c8;
  padding-left: 22px;
}
.cal-day-label {
  font-family: "Charter", "Iowan Old Style", Georgia, "Times New Roman", serif;
  font-size: 17px;
  font-weight: 600;
  color: #4b4d52;
  margin-bottom: 8px;
  letter-spacing: -0.005em;
}
.cal-day-today .cal-day-label { color: #7d2a16; }
.cal-day ul { list-style: none; }
.cal-day li {
  display: -webkit-flex;
  display: flex;
  -webkit-align-items: baseline;
  align-items: baseline;
  font-size: 13px;
  line-height: 1.35;
  padding: 3px 0;
  color: #1c1d1f;
}
.cal-time {
  width: 56px;
  -webkit-flex-shrink: 0;
  flex-shrink: 0;
  color: #8d8f96;
  font-variant-numeric: tabular-nums;
  font-size: 11px;
}
.cal-title {
  -webkit-flex: 1 1 auto;
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cal-more {
  font-size: 11px;
  color: #8d8f96;
  font-style: italic;
  padding-top: 2px;
}
</style>
</head>
<body>
<main>
${html}
</main>
</body>
</html>`;
}

// ─── GET handler ───────────────────────────────────────────────

export async function GET() {
  const calsEnv = process.env.IPAD_CALENDARS_JSON;
  let calendarIds: string[] = [];
  try {
    const parsed = JSON.parse(calsEnv || "[]");
    if (Array.isArray(parsed)) calendarIds = parsed.filter((x): x is string => typeof x === "string");
  } catch {
    // ignore
  }

  const calStart = new Date();
  calStart.setHours(0, 0, 0, 0);
  const calEnd = new Date(calStart);
  calEnd.setDate(calEnd.getDate() + 8);

  const wasteEntityIds = WASTE_SENSORS.map((w) => w.entityId);
  const tibberPromise = fetchTibberPrices().catch((err) => {
    console.warn("[ipad-legacy] tibber failed:", err);
    return { today: [] as TibberPriceNode[], tomorrow: [] as TibberPriceNode[] };
  });
  const statesPromise = fetchHaStates([
    POWER_ENTITY,
    PRICE_ENTITY,
    COST_TODAY_ENTITY,
    FEED_ENTITY,
    ...wasteEntityIds,
  ]);
  const weatherPromise = fetchHaState(WEATHER_ENTITY);
  const calsPromise = Promise.all(
    calendarIds.map(async (id) => [id, await fetchHaCalendarEvents(id, calStart, calEnd)] as const)
  );

  const [prices, states, weather, calsArr] = await Promise.all([
    tibberPromise,
    statesPromise,
    weatherPromise,
    calsPromise,
  ]);
  const calendars: Record<string, HaCalendarEvent[]> = Object.fromEntries(calsArr);

  const now = new Date();
  const body =
    renderMasthead(now) +
    renderHero(prices.today, weather) +
    `<div class="mid-row">${renderLive(states)}${renderWaste(states)}</div>` +
    renderCalendar(calendars);

  return new Response(renderPage(body), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
