// Server-rendered, Safari 12-compatible iPad dashboard.
// No client-side JS, no Tailwind, no oklch. Auto-refreshes every 30 seconds via meta refresh.

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

const WASTE_SENSORS: { entityId: string; label: string; color: string }[] = [
  { entityId: "sensor.waste_collection_schedule_restabfall", label: "Restabfall", color: "#8a8a8a" },
  { entityId: "sensor.waste_collection_schedule_bioabfall", label: "Bioabfall", color: "#5aa86a" },
  { entityId: "sensor.waste_collection_schedule_gelber_sack_tonne", label: "Gelber Sack", color: "#d4b04a" },
  { entityId: "sensor.waste_collection_schedule_altpapier", label: "Altpapier", color: "#5a8fc8" },
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

function priceColor(total: number, min: number, max: number): string {
  if (max === min) return "hsl(145, 55%, 50%)";
  const q = (total - min) / (max - min);
  // hue: 145 (green) → 50 (yellow) → 0 (red)
  let hue: number;
  if (q < 0.5) {
    hue = 145 - (145 - 50) * (q / 0.5);
  } else {
    hue = 50 - 50 * ((q - 0.5) / 0.5);
  }
  return `hsl(${hue.toFixed(0)}, 70%, 55%)`;
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

// ─── Section renderers ─────────────────────────────────────────

function renderClock(now: Date): string {
  const time = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  return `
    <header class="clock">
      <div class="time">${esc(time)}</div>
      <div class="date">${esc(date)}</div>
    </header>`;
}

function renderPrices(today: TibberPriceNode[]): string {
  if (today.length === 0) {
    return `<section class="card prices"><h2>Strompreise heute</h2><div class="empty">Keine Preisdaten verfügbar.</div></section>`;
  }
  const totals = today.map((n) => n.total);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const avg = totals.reduce((s, x) => s + x, 0) / totals.length;
  const now = new Date();
  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);

  const cheapest = new Set<number>(
    today
      .map((n, i) => ({ i, t: n.total, ts: new Date(n.startsAt).getTime() }))
      .filter((x) => x.ts >= currentHour.getTime())
      .sort((a, b) => a.t - b.t)
      .slice(0, 3)
      .map((x) => x.i)
  );

  let currentIdx = -1;
  let currentTotal = today[0]?.total ?? 0;
  for (let i = 0; i < today.length; i++) {
    const ts = new Date(today[i].startsAt).getTime();
    if (ts === currentHour.getTime()) {
      currentIdx = i;
      currentTotal = today[i].total;
      break;
    }
  }

  const bars = today
    .map((n, i) => {
      const ts = new Date(n.startsAt).getTime();
      const isPast = ts < currentHour.getTime();
      const heightPct = max === min ? 50 : 18 + ((n.total - min) / (max - min)) * 78;
      const bg = priceColor(n.total, min, max);
      const opacity = isPast ? "0.32" : "1";
      const isCurrent = i === currentIdx;
      const ringStyle = isCurrent ? "box-shadow: 0 0 0 2px #fff;" : "";
      const star = cheapest.has(i) && !isPast ? '<div class="star"></div>' : '<div class="star-pad"></div>';
      return `<div class="bar-col">${star}<div class="bar" style="height:${heightPct.toFixed(2)}%;background:${bg};opacity:${opacity};${ringStyle}"></div></div>`;
    })
    .join("");

  return `
    <section class="card prices">
      <div class="prices-head">
        <div>
          <h2>Strompreise heute</h2>
          <div class="big-num">${currentIdx >= 0 ? esc(fmtPriceCt(currentTotal)) : "—"}</div>
          <div class="sub">jetzt</div>
        </div>
        <div class="prices-stats">
          <div>Min <b>${esc(fmtPriceCt(min))}</b> · Ø <b>${esc(fmtPriceCt(avg))}</b> · Max <b>${esc(fmtPriceCt(max))}</b></div>
        </div>
      </div>
      <div class="bars">${bars}</div>
      <div class="hour-axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
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
    <section class="card live">
      <div class="card-head">
        <h2>Live-Verbrauch</h2>
        ${feedStr ? `<span class="pill">Einspeisung <b>${esc(feedStr)}</b></span>` : ""}
      </div>
      <div class="big-row">
        <span class="big-num">${power !== null ? esc(power.toFixed(2)) : "—"}</span>
        <span class="unit">kW</span>
        ${ctPerHour !== null ? `<span class="aside">≈ ${esc(ctPerHour.toFixed(0))} ct/h</span>` : ""}
      </div>
      <div class="sub">Kosten heute <b>${cost !== null ? esc(cost.toFixed(2)) + " €" : "—"}</b></div>
    </section>`;
}

function renderWaste(states: Record<string, HaState | null>): string {
  const now = new Date();
  type Entry = { date: Date; type: string; days: number; color: string };
  const all: Entry[] = [];
  for (const cfg of WASTE_SENSORS) {
    const s = states[cfg.entityId];
    if (!s?.attributes) continue;
    for (const key of Object.keys(s.attributes)) {
      if (!DATE_KEY_RE.test(key)) continue;
      const date = parseLocalDate(key);
      const days = daysBetween(now, date);
      if (days < 0 || days > 21) continue;
      all.push({ date, type: cfg.label, days, color: cfg.color });
    }
  }
  all.sort((a, b) => a.date.getTime() - b.date.getTime());
  const top = all.slice(0, 4);

  if (top.length === 0) {
    return `<section class="card waste"><h2>Abfallkalender</h2><div class="empty">Keine Termine in den nächsten 21 Tagen.</div></section>`;
  }
  const items = top
    .map((u, i) => {
      const dateStr = u.date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
      const relStr = fmtRelative(u.days, u.date);
      const opacity = i === 0 ? "1" : "0.7";
      const urgent = u.days <= 1 ? "color:#ff9243;" : "";
      return `<li><span class="bar-tag" style="background:${u.color};opacity:${opacity};"></span><span class="ws-type">${esc(u.type)}</span><span class="ws-rel" style="${urgent}">${esc(relStr)} · ${esc(dateStr)}</span></li>`;
    })
    .join("");
  return `<section class="card waste"><h2>Abfallkalender</h2><ul class="ws-list">${items}</ul></section>`;
}

function renderWeather(state: HaState | null): string {
  const condition = state?.state ?? null;
  const tempRaw = state?.attributes?.temperature;
  const temp = typeof tempRaw === "number" ? tempRaw : null;
  const humRaw = state?.attributes?.humidity;
  const hum = typeof humRaw === "number" ? humRaw : null;
  const windRaw = state?.attributes?.wind_speed;
  const wind = typeof windRaw === "number" ? windRaw : null;

  const map: Record<string, string> = {
    "clear-night": "Klare Nacht",
    cloudy: "Bewölkt",
    fog: "Nebel",
    hail: "Hagel",
    lightning: "Gewitter",
    "lightning-rainy": "Gewitter mit Regen",
    partlycloudy: "Teilw. bewölkt",
    pouring: "Starker Regen",
    rainy: "Regen",
    snowy: "Schnee",
    "snowy-rainy": "Schneeregen",
    sunny: "Sonnig",
    windy: "Windig",
    "windy-variant": "Windig",
    exceptional: "Extrem",
  };
  const label = condition ? map[condition] ?? condition.replace(/-/g, " ") : "—";

  return `
    <section class="card weather">
      <h2>Wetter</h2>
      <div class="big-row">
        <span class="big-num">${temp !== null ? esc(Math.round(temp)) + "°" : "—"}</span>
      </div>
      <div class="sub">${esc(label)}</div>
      <div class="weather-extras">
        ${hum !== null ? `<span>${esc(Math.round(hum))} % rF</span>` : ""}
        ${wind !== null ? `<span>${esc(Math.round(wind))} km/h Wind</span>` : ""}
      </div>
    </section>`;
}

function renderCalendar(eventsByCalendar: Record<string, HaCalendarEvent[]>): string {
  const all: { start: Date; end: Date; allDay: boolean; summary: string }[] = [];
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
  const tomorrowKey = (() => {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return localDateKey(t);
  })();
  const todayKey = localDateKey(today);

  const groups = new Map<string, { date: Date; label: string; events: typeof all }>();
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
  const days = Array.from(groups.values()).slice(0, 5);

  if (days.length === 0) {
    return `<section class="card calendar"><h2>Kalender</h2><div class="empty">Keine Termine in den nächsten 8 Tagen.</div></section>`;
  }

  const cols = days
    .map((g) => {
      const items = g.events
        .slice(0, 4)
        .map((ev) => {
          const time = ev.allDay
            ? "ganztägig"
            : `${fmtTime(ev.start)}–${fmtTime(ev.end)}`;
          return `<li><div class="ev-title">${esc(ev.summary)}</div><div class="ev-time">${esc(time)}</div></li>`;
        })
        .join("");
      const more = g.events.length > 4 ? `<li class="more">+${g.events.length - 4} weitere</li>` : "";
      const dateBadge = `${String(g.date.getDate()).padStart(2, "0")}.${String(g.date.getMonth() + 1).padStart(2, "0")}`;
      const hilite = g.label === "Heute" ? " day-today" : "";
      return `<div class="day${hilite}"><div class="day-head"><span>${esc(g.label)}</span><span class="day-num">${esc(dateBadge)}</span></div><ul>${items}${more}</ul></div>`;
    })
    .join("");
  return `<section class="card calendar"><h2>Kalender</h2><div class="cal-grid">${cols}</div></section>`;
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
<title>iPad Cockpit</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
  background: #0d1119;
  background-image:
    radial-gradient(900px 500px at 50% -10%, rgba(120,150,255,0.08), transparent 65%),
    radial-gradient(700px 500px at 8% -10%, rgba(255,170,90,0.05), transparent 60%),
    radial-gradient(700px 500px at 110% 10%, rgba(110,180,255,0.05), transparent 60%);
  color: #f4f4f6;
  -webkit-text-size-adjust: 100%;
  overflow: hidden;
}
main {
  display: -ms-grid;
  display: grid;
  width: 100vw;
  height: 100vh;
  padding: 20px;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto minmax(0, 2.4fr) minmax(0, 2fr) minmax(0, 2fr);
  grid-gap: 12px;
}
header.clock { grid-column: 1 / span 2; padding: 0 4px; }
.clock .time { font-size: 64px; font-weight: 300; line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.clock .date { font-size: 14px; color: #9aa1ad; margin-top: 4px; text-transform: capitalize; }

.card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 28px;
  padding: 20px;
  display: -webkit-flex;
  display: flex;
  -webkit-flex-direction: column;
  flex-direction: column;
  min-height: 0;
}
.card h2 {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #6c727f;
  margin-bottom: 8px;
}
.card-head { display: flex; -webkit-flex-direction: row; flex-direction: row; -webkit-justify-content: space-between; justify-content: space-between; -webkit-align-items: center; align-items: center; }
.empty { font-size: 14px; color: #9aa1ad; }
.sub { font-size: 14px; color: #9aa1ad; margin-top: 6px; }
.big-num { font-size: 56px; font-weight: 500; line-height: 1.05; font-variant-numeric: tabular-nums; letter-spacing: -0.03em; }
.unit { font-size: 22px; color: #9aa1ad; margin-left: 8px; }
.aside { margin-left: auto; font-size: 16px; color: #9aa1ad; font-variant-numeric: tabular-nums; }
.big-row { display: -webkit-flex; display: flex; -webkit-align-items: baseline; align-items: baseline; }
.pill { font-size: 12px; color: #9aa1ad; }
.pill b { color: #5dd47a; font-variant-numeric: tabular-nums; }

/* prices */
.prices { grid-column: 1; grid-row: 2; }
.prices-head { display: flex; -webkit-justify-content: space-between; justify-content: space-between; -webkit-align-items: flex-end; align-items: flex-end; margin-bottom: 12px; }
.prices-head .big-num { font-size: 44px; }
.prices-stats { font-size: 13px; color: #9aa1ad; text-align: right; }
.prices-stats b { color: #f4f4f6; font-variant-numeric: tabular-nums; }
.bars {
  display: -webkit-flex; display: flex;
  -webkit-align-items: stretch; align-items: stretch;
  -webkit-flex: 1 1 auto; flex: 1 1 auto;
  min-height: 100px;
}
.bar-col { display: -webkit-flex; display: flex; -webkit-flex-direction: column; flex-direction: column; -webkit-justify-content: flex-end; justify-content: flex-end; -webkit-align-items: center; align-items: center; -webkit-flex: 1 1 0; flex: 1 1 0; margin: 0 1px; }
.star { width: 6px; height: 6px; background: #fff; border-radius: 50%; margin-bottom: 4px; }
.star-pad { width: 6px; height: 6px; margin-bottom: 4px; }
.bar { width: 100%; border-radius: 6px; }
.hour-axis { display: -webkit-flex; display: flex; -webkit-justify-content: space-between; justify-content: space-between; font-size: 10px; color: #5e636e; padding: 6px 4px 0; font-variant-numeric: tabular-nums; }

/* weather */
.weather { grid-column: 2; grid-row: 2; }
.weather .big-num { font-size: 64px; margin-top: 6px; }
.weather-extras { display: -webkit-flex; display: flex; -webkit-flex-wrap: wrap; flex-wrap: wrap; gap: 12px; margin-top: 14px; font-size: 13px; color: #9aa1ad; font-variant-numeric: tabular-nums; }

/* live */
.live { grid-column: 1; grid-row: 3; }
.live .big-num { font-size: 56px; }

/* waste */
.waste { grid-column: 2; grid-row: 3; }
.ws-list { list-style: none; }
.ws-list li {
  display: -webkit-flex; display: flex;
  -webkit-align-items: center; align-items: center;
  padding: 4px 0;
  font-size: 14px;
  -webkit-justify-content: space-between; justify-content: space-between;
}
.ws-list .bar-tag { display: inline-block; width: 4px; align-self: stretch; min-height: 18px; border-radius: 999px; margin-right: 10px; }
.ws-list .ws-type { -webkit-flex: 1 1 auto; flex: 1 1 auto; color: #f4f4f6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ws-list .ws-rel { color: #9aa1ad; font-variant-numeric: tabular-nums; margin-left: 8px; }

/* calendar */
.calendar { grid-column: 1 / span 2; grid-row: 4; }
.cal-grid {
  display: -webkit-flex; display: flex;
  -webkit-flex-direction: row; flex-direction: row;
  gap: 10px;
  -webkit-flex: 1 1 auto; flex: 1 1 auto;
  min-height: 0;
}
.cal-grid .day {
  -webkit-flex: 1 1 0; flex: 1 1 0;
  background: rgba(255,255,255,0.03);
  border-radius: 18px;
  padding: 10px 12px;
  min-width: 0;
}
.cal-grid .day-today { background: rgba(255,255,255,0.08); }
.day-head { display: flex; -webkit-justify-content: space-between; justify-content: space-between; -webkit-align-items: baseline; align-items: baseline; margin-bottom: 8px; }
.day-head span:first-child { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #9aa1ad; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.day-head .day-num { font-size: 11px; color: #5e636e; font-variant-numeric: tabular-nums; }
.day-today .day-head span:first-child { color: #f4f4f6; }
.day ul { list-style: none; }
.day li { font-size: 12px; line-height: 1.3; margin-bottom: 6px; }
.day .ev-title { color: #f4f4f6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.day .ev-time { font-size: 10px; color: #5e636e; font-variant-numeric: tabular-nums; }
.day .more { font-size: 10px; color: #5e636e; }
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
  // calendar whitelist from add-on options
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
    renderClock(now) +
    renderPrices(prices.today) +
    renderWeather(weather) +
    renderLive(states) +
    renderWaste(states) +
    renderCalendar(calendars);

  return new Response(renderPage(body), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
