// /ipad-legacy — "Eikenhofer Almanach" Cockpit für iPad mini 2 (Mobile Safari 12).
// Server-rendered HTML, kein Client-JS. Auto-Refresh nur via <meta http-equiv="refresh">.
// Constraints: keine `gap`, kein OKLCH, kein color-mix, sRGB-Hex only,
// fester Viewport 1024×768, kein Scroll, ~22 KB HTML inkl. inline-CSS.

import {
  fetchHaState,
  fetchHaStates,
  fetchHaCalendarEvents,
  fetchWeatherForecast,
  type HaState,
  type HaCalendarEvent,
  type HaForecastPoint,
} from "@/lib/server/haClient";
import { fetchTibberPrices, type TibberPriceNode } from "@/lib/server/tibberClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REFRESH_SECONDS = 30;

// ─── Entity IDs ────────────────────────────────────────────────
const WEATHER_ENTITY = "weather.forecast_home";
const SUN_ENTITY = "sun.sun";

interface WasteCfg {
  entityId: string;
  label: string;
  color: string;
}
const WASTE_SENSORS: WasteCfg[] = [
  { entityId: "sensor.waste_collection_schedule_bioabfall", label: "Bioabfall", color: "#2f6b3d" },
  { entityId: "sensor.waste_collection_schedule_restabfall", label: "Restmüll", color: "#1c1d1f" },
  { entityId: "sensor.waste_collection_schedule_gelber_sack_tonne", label: "Gelber Sack", color: "#b07a1f" },
  { entityId: "sensor.waste_collection_schedule_altpapier", label: "Altpapier", color: "#3a5a8c" },
];

// Calendar configuration. Configure via env IPAD_CALENDARS_JSON.
//   New richer form (preferred):
//     [{"id":"calendar.privat","label":"Privat","color":"#1c1d1f"}, ...]
//   Legacy form (still supported):
//     ["calendar.privat", ...]   (label = capitalized last part, color = ink)
interface CalendarCfg {
  id: string;
  label: string;
  color: string;
}
const DEFAULT_CAL_COLOR = "#1c1d1f";

// Sensible label + tone defaults for common iCloud calendar entity IDs the user
// gets after a CalDAV sync. Anything in the user's `ipad_calendar_entities`
// addon-option that matches by id will pick up label/color from here, so the
// addon UI can stay a flat string list and still produce nicely tagged events.
const KNOWN_CALENDARS: Record<string, { label: string; color: string }> = {
  "calendar.familie":      { label: "Familie",     color: "#a83020" }, // red — close & important
  "calendar.eike":         { label: "Eike",        color: "#1c1d1f" }, // ink — primary
  "calendar.privat":       { label: "Privat",      color: "#1c1d1f" },
  "calendar.arbeit":       { label: "Arbeit",      color: "#3a5a8c" }, // blue — work
  "calendar.sport":        { label: "Sport",       color: "#2f6b3d" }, // green — outdoor / active
  "calendar.halbmarathon": { label: "Halbmarathon", color: "#2f6b3d" },
  "calendar.ziel":         { label: "Ziel",        color: "#2f6b3d" },
  "calendar.haushalt":     { label: "Haushalt",    color: "#b07a1f" }, // ocker — domestic
  "calendar.hellofresh":   { label: "HelloFresh",  color: "#b07a1f" },
  "calendar.geburtstage":  { label: "Geburtstage", color: "#a83020" },
  "calendar.lokal":        { label: "Lokal",       color: "#a83020" },
};

function autoCalendarCfg(id: string): CalendarCfg {
  const known = KNOWN_CALENDARS[id];
  if (known) return { id, label: known.label, color: known.color };
  const tail = id.split(".").pop() ?? id;
  const label = tail
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { id, label, color: DEFAULT_CAL_COLOR };
}

function parseCalendarsEnv(raw: string | undefined): CalendarCfg[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry): CalendarCfg | null => {
        if (typeof entry === "string") {
          return autoCalendarCfg(entry);
        }
        if (entry && typeof entry === "object") {
          const id = typeof entry.id === "string" ? entry.id : null;
          if (!id) return null;
          // Rich form: explicit label/color override the KNOWN_CALENDARS defaults.
          const auto = autoCalendarCfg(id);
          const label = typeof entry.label === "string" ? entry.label : auto.label;
          const color = typeof entry.color === "string" ? entry.color : auto.color;
          return { id, label, color };
        }
        return null;
      })
      .filter((x): x is CalendarCfg => x !== null);
  } catch {
    return [];
  }
}

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
  return Number.isFinite(n) ? n : null;
}

function fmtCt1(ctValue: number): string {
  return ctValue.toFixed(1).replace(".", ",");
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fmtTimeWithSec(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

const WEEKDAYS_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WEEKDAYS_UC = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];
const MONTHS_LONG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function parseLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function fmtMastheadDate(d: Date): string {
  return `${WEEKDAYS_SHORT[d.getDay()]} · ${d.getDate()}. ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtShortDate(d: Date): string {
  return `${WEEKDAYS_SHORT[d.getDay()]} · ${d.getDate()}. ${MONTHS_LONG[d.getMonth()]}`;
}

// Sun.sun exposes only `next_*` events. Convert to today's HH:MM by reusing the time component.
function todaysTime(iso: string | undefined, now: Date): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                         dt.getHours(), dt.getMinutes(), 0, 0);
  return fmtTime(today);
}

// ─── Tone & color ──────────────────────────────────────────────
type Tone = "cheap" | "mid" | "exp";
function priceTone(nowCt: number, avgCt: number): Tone {
  if (nowCt < avgCt * 0.85) return "cheap";
  if (nowCt > avgCt * 1.15) return "exp";
  return "mid";
}

// ─── Tibber computations ───────────────────────────────────────
interface SparklineGeom {
  lineD: string;
  areaD: string;
  nowX: number;
  nowY: number;
  avgY: number;
  yMin: number;
  yMax: number;
}

function buildSparkline(prices: TibberPriceNode[], now: Date): SparklineGeom | null {
  if (prices.length < 2) return null;
  const W = 278;
  const H = 70;
  const margin = 2;
  const cents = prices.map((p) => p.total * 100);
  let yMin = Math.floor(Math.min(...cents) / 5) * 5;
  let yMax = Math.ceil(Math.max(...cents) / 5) * 5;
  if (yMax === yMin) yMax = yMin + 5;
  const avg = cents.reduce((s, x) => s + x, 0) / cents.length;
  const points = cents.map<[number, number]>((v, i) => {
    const x = margin + (i / (cents.length - 1)) * (W - 2 * margin);
    const y = (1 - (v - yMin) / (yMax - yMin)) * H;
    return [x, y];
  });
  const lineD = "M" + points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");
  const areaD = `${lineD} L${(W - margin).toFixed(1)} ${H} L${margin.toFixed(1)} ${H} Z`;
  // Now-marker: pick price slot whose start hour matches now's hour
  const nowHour = now.getHours();
  let idx = prices.findIndex((p) => new Date(p.startsAt).getHours() === nowHour);
  if (idx < 0) idx = Math.min(points.length - 1, Math.max(0, nowHour));
  const [nowX, nowY] = points[idx];
  const avgY = (1 - (avg - yMin) / (yMax - yMin)) * H;
  return { lineD, areaD, nowX, nowY, avgY, yMin, yMax };
}

interface CheapSlot {
  startsAt: Date;
  ct: number;
}

function cheapestUpcoming(prices: TibberPriceNode[], now: Date, count = 3): CheapSlot[] {
  const horizonMs = now.getTime() + 9 * 60 * 60 * 1000;
  const upcoming = prices
    .map<CheapSlot>((p) => ({ startsAt: new Date(p.startsAt), ct: p.total * 100 }))
    .filter((s) => s.startsAt.getTime() > now.getTime() && s.startsAt.getTime() <= horizonMs);
  return upcoming
    .slice()
    .sort((a, b) => a.ct - b.ct)
    .slice(0, count)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function fmtRelHours(target: Date, now: Date): string {
  const h = (target.getTime() - now.getTime()) / 3_600_000;
  const r = Math.max(1, Math.round(h));
  return `in ${r} h`;
}

function findExtreme(prices: TibberPriceNode[], dir: "min" | "max"): { ct: number; hour: number } | null {
  if (prices.length === 0) return null;
  let best = prices[0];
  for (const p of prices) {
    if (dir === "min" ? p.total < best.total : p.total > best.total) best = p;
  }
  return { ct: best.total * 100, hour: new Date(best.startsAt).getHours() };
}

// ─── Weather glyph ─────────────────────────────────────────────
type Glyph = "sun" | "cloud" | "sun-cloud" | "rain";
function glyphFor(condition: string | undefined | null): Glyph {
  if (!condition) return "cloud";
  if (condition === "sunny") return "sun";
  if (condition === "clear-night") return "sun";
  if (condition === "partlycloudy") return "sun-cloud";
  if (
    condition === "rainy" ||
    condition === "pouring" ||
    condition === "lightning-rainy" ||
    condition === "snowy" ||
    condition === "snowy-rainy" ||
    condition === "hail"
  )
    return "rain";
  return "cloud";
}

function renderGlyphSvg(glyph: Glyph, size: number, color: string): string {
  const sw = size <= 24 ? 1.6 : 1.4;
  const inner = (() => {
    switch (glyph) {
      case "sun":
        return [
          `<circle cx="12" cy="12" r="4.5" fill="none" stroke="${color}" stroke-width="${sw}"/>`,
          `<line x1="12" y1="3" x2="12" y2="5.5" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`,
          `<line x1="12" y1="18.5" x2="12" y2="21" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`,
          `<line x1="3" y1="12" x2="5.5" y2="12" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`,
          `<line x1="18.5" y1="12" x2="21" y2="12" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`,
          `<line x1="5.6" y1="5.6" x2="7.4" y2="7.4" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`,
          `<line x1="16.6" y1="16.6" x2="18.4" y2="18.4" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`,
          `<line x1="5.6" y1="18.4" x2="7.4" y2="16.6" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`,
          `<line x1="16.6" y1="7.4" x2="18.4" y2="5.6" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`,
        ].join("");
      case "cloud":
        return `<path d="M7 17 Q3 17 3 13 Q3 10 6 9 Q7 5 11 5 Q15 5 16 8 Q21 8 21 13 Q21 17 17 17 Z" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      case "sun-cloud":
        return [
          `<circle cx="9" cy="9" r="3" fill="none" stroke="${color}" stroke-width="${sw}"/>`,
          `<path d="M9 19 Q5 19 5 16 Q5 13 8 13 Q9 10 12 10 Q15 10 16 13 Q19 13 19 16 Q19 19 16 19 Z" fill="#faf7f0" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/>`,
        ].join("");
      case "rain":
        return [
          `<path d="M7 13 Q3 13 3 10 Q3 7 6 6 Q7 3 11 3 Q15 3 16 6 Q21 6 21 10 Q21 13 17 13 Z" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/>`,
          `<line x1="8" y1="16" x2="7" y2="20" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`,
          `<line x1="12" y1="16" x2="11" y2="20" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`,
          `<line x1="16" y1="16" x2="15" y2="20" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`,
        ].join("");
    }
  })();
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
}

function condLabel(cond: string | null | undefined): string {
  if (!cond) return "—";
  const map: Record<string, string> = {
    "clear-night": "klar",
    cloudy: "bedeckt",
    fog: "neblig",
    hail: "Hagel",
    lightning: "Gewitter",
    "lightning-rainy": "Gewitter mit Regen",
    partlycloudy: "wolkig",
    pouring: "Starkregen",
    rainy: "Regen",
    snowy: "Schnee",
    "snowy-rainy": "Schneeregen",
    sunny: "sonnig",
    windy: "windig",
    "windy-variant": "windig",
    exceptional: "ungewöhnlich",
  };
  return map[cond] ?? cond.replace(/-/g, " ");
}

// ─── Section renderers ─────────────────────────────────────────
function renderMasthead(now: Date, sun: HaState | null): string {
  const date = fmtMastheadDate(now);
  const time = fmtTime(now);
  const sunrise = todaysTime(sun?.attributes?.next_rising as string | undefined, now);
  const sunset = todaysTime(sun?.attributes?.next_setting as string | undefined, now);
  const week = isoWeek(now);
  const meta = `Kalenderwoche ${week}` +
    (sunrise ? ` · Sonnenaufgang ${sunrise}` : "") +
    (sunset ? ` · Sonnenuntergang ${sunset}` : "");
  return `
  <header class="masthead">
    <div class="mh-left serif">Eikenhofer Almanach</div>
    <div class="mh-center">
      <div class="mh-date serif">${esc(date)}</div>
      <div class="mh-meta mono">${esc(meta)}</div>
    </div>
    <div class="mh-right serif tnum">${esc(time)}</div>
  </header>`;
}

function renderPriceCol(prices: TibberPriceNode[], now: Date): string {
  const sect = `
    <div class="sect">
      <div class="kicker">I · Strompreis</div>
      <div class="head-title">Tibber · Spot</div>
    </div>`;

  if (prices.length === 0) {
    return `
  <section class="col col-1">
    ${sect}
    <div class="cap-italic">Keine Preisdaten verfügbar.</div>
  </section>`;
  }

  const cents = prices.map((p) => p.total * 100);
  const avgCt = cents.reduce((s, x) => s + x, 0) / cents.length;
  const minSlot = findExtreme(prices, "min");
  const maxSlot = findExtreme(prices, "max");

  const nowHour = now.getHours();
  const nowSlot = prices.find((p) => new Date(p.startsAt).getHours() === nowHour);
  const nowCt = nowSlot ? nowSlot.total * 100 : avgCt;
  const tone = priceTone(nowCt, avgCt);

  const spark = buildSparkline(prices, now);
  const sparkSvg = spark
    ? `
      <svg width="278" height="70" viewBox="0 0 278 70">
        <line x1="2"   y1="2" x2="2"   y2="68" stroke="#e5dfd0" stroke-width="1"/>
        <line x1="74"  y1="2" x2="74"  y2="68" stroke="#e5dfd0" stroke-width="1"/>
        <line x1="146" y1="2" x2="146" y2="68" stroke="#e5dfd0" stroke-width="1"/>
        <line x1="218" y1="2" x2="218" y2="68" stroke="#e5dfd0" stroke-width="1"/>
        <line x1="2" y1="${spark.avgY.toFixed(1)}" x2="276" y2="${spark.avgY.toFixed(1)}" stroke="#e5dfd0" stroke-width="1" stroke-dasharray="2 3"/>
        <path d="${spark.areaD}" fill="rgba(28,29,31,.06)"/>
        <path d="${spark.lineD}" fill="none" stroke="#1c1d1f" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>
        <line x1="${spark.nowX.toFixed(1)}" y1="2" x2="${spark.nowX.toFixed(1)}" y2="68" stroke="#1c1d1f" stroke-width="1"/>
        <circle cx="${spark.nowX.toFixed(1)}" cy="${spark.nowY.toFixed(1)}" r="3.5" fill="#faf7f0" stroke="#1c1d1f" stroke-width="1.5"/>
      </svg>`
    : `<div class="cap-italic">Sparkline nicht verfügbar.</div>`;

  const ledger = `
    <div class="ledger">
      <div class="ledger-row"><span class="k">Mittel</span><span class="v">${esc(fmtCt1(avgCt))} ct</span></div>
      <div class="ledger-row"><span class="k">Tief</span><span class="v">${minSlot ? `${esc(fmtCt1(minSlot.ct))} · ${pad2(minSlot.hour)}:00` : "—"}</span></div>
      <div class="ledger-row"><span class="k">Hoch</span><span class="v">${maxSlot ? `${esc(fmtCt1(maxSlot.ct))} · ${pad2(maxSlot.hour)}:00` : "—"}</span></div>
    </div>`;

  // Empfehlung
  const cheap = cheapestUpcoming(prices, now, 3);
  const recommendation = cheap.length === 0
    ? `<div class="cap-italic">Keine günstigen Fenster in den nächsten 9 Stunden.</div>`
    : cheap
      .map(
        (s) => `
      <div class="fenster-row">
        <span class="fenster-time">${esc(fmtTime(s.startsAt))}</span>
        <span class="fenster-rel">${esc(fmtRelHours(s.startsAt, now))}</span>
        <span class="fenster-val">${esc(fmtCt1(s.ct))} ct</span>
      </div>`
      )
      .join("");

  return `
  <section class="col col-1">
    ${sect}
    <div>
      <span class="bignum tone-${tone} tnum">${esc(fmtCt1(nowCt))}</span>
      <span class="bigunit">ct</span>
    </div>
    <div class="cap-italic">pro Kilowattstunde, gegenwärtig</div>
    <div class="spark">
      ${sparkSvg}
      <div class="spark-axis"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>
    </div>
    ${ledger}

    <div style="margin-top:26px">
      <div class="sect">
        <div class="kicker">II · Empfehlung</div>
        <div class="head-title">Günstige Fenster</div>
      </div>
      ${recommendation}
      <div style="margin-top:10px;font-family:Charter,Georgia,serif;font-size:12px;font-style:italic;color:var(--inkSoft);line-height:1.4">
        Geeignet für Wäsche, Spülmaschine, Wallbox.
      </div>
    </div>
  </section>`;
}

function renderWeatherCol(weather: HaState | null, forecast: HaForecastPoint[]): string {
  const tempRaw = weather?.attributes?.temperature;
  const temp = typeof tempRaw === "number" ? Math.round(tempRaw) : null;
  const feelRaw = weather?.attributes?.apparent_temperature;
  const feel = typeof feelRaw === "number" ? Math.round(feelRaw) : null;
  const cond = (weather?.state as string | undefined) ?? null;

  const humRaw = weather?.attributes?.humidity;
  const hum = typeof humRaw === "number" ? Math.round(humRaw) : null;
  const windRaw = weather?.attributes?.wind_speed;
  const wind = typeof windRaw === "number" ? Math.round(windRaw) : null;

  // Today's high/low + tomorrow precip from forecast[0]
  const today = forecast[0] ?? null;
  const todayHi = typeof today?.temperature === "number" ? Math.round(today.temperature) : null;
  const todayLo = typeof today?.templow === "number" ? Math.round(today.templow) : null;
  const todayRain = typeof today?.precipitation_probability === "number" ? Math.round(today.precipitation_probability) : null;

  const condText = condLabel(cond);
  const captionParts: string[] = [];
  if (feel !== null) captionParts.push(`gefühlt ${feel}°`);
  captionParts.push(condText);
  const caption = captionParts.join(" · ");

  const wxNum = temp !== null ? `${temp}<span class="wx-deg">°</span>` : "—";
  const glyphCurrent = renderGlyphSvg(glyphFor(cond), 62, "#1c1d1f");

  // Five-day forecast (rows 1..5)
  const fcRows = forecast.slice(1, 6);
  let fcMin = 0;
  let fcMax = 24;
  if (fcRows.length > 0) {
    const allTemps: number[] = [];
    for (const f of fcRows) {
      if (typeof f.templow === "number") allTemps.push(f.templow);
      if (typeof f.temperature === "number") allTemps.push(f.temperature);
    }
    if (allTemps.length > 0) {
      fcMin = Math.floor(Math.min(...allTemps) / 2) * 2;
      fcMax = Math.ceil(Math.max(...allTemps) / 2) * 2;
      if (fcMax - fcMin < 8) fcMax = fcMin + 8;
    }
  }

  const fcRowsHtml = fcRows
    .map((f, i) => {
      const dt = new Date(f.datetime);
      const wd = WEEKDAYS_SHORT[dt.getDay()];
      const hi = typeof f.temperature === "number" ? Math.round(f.temperature) : null;
      const lo = typeof f.templow === "number" ? Math.round(f.templow) : null;
      const fcGlyph = renderGlyphSvg(glyphFor(f.condition), 20, "#3a3a3c");
      let bar = "";
      if (lo !== null && hi !== null) {
        const left = ((lo - fcMin) / (fcMax - fcMin)) * 100;
        const width = Math.max(2, ((hi - lo) / (fcMax - fcMin)) * 100);
        bar = `<i style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></i>`;
      }
      const tempStr = hi !== null && lo !== null
        ? `<span class="lo">${lo}°</span> · ${hi}°`
        : "—";
      const lastClass = i === fcRows.length - 1 ? ' style="border-bottom:0"' : "";
      return `
      <div class="fc-row"${lastClass}>
        <span class="fc-day">${esc(wd)}</span>
        <span class="fc-glyph">${fcGlyph}</span>
        <span class="fc-bar">${bar}</span>
        <span class="fc-temp">${tempStr}</span>
      </div>`;
    })
    .join("");

  const fcSection = fcRows.length > 0
    ? `
    <div class="fc-list">
      <div class="kicker">Fünf-Tages-Aussicht</div>
      <div class="top-rule"></div>
      ${fcRowsHtml}
    </div>`
    : `
    <div class="fc-list">
      <div class="kicker">Fünf-Tages-Aussicht</div>
      <div class="top-rule"></div>
      <div class="cap-italic" style="padding:10px 0">Forecast nicht verfügbar.</div>
    </div>`;

  return `
  <section class="col col-2">
    <div class="sect">
      <div class="kicker">III · Witterung</div>
      <div class="head-title">Wetter</div>
    </div>
    <div class="wx-now">
      <div>
        <span class="wx-num tnum">${wxNum}</span>
        <div class="wx-cond">${esc(caption)}</div>
      </div>
      <span class="wx-glyph">${glyphCurrent}</span>
    </div>
    <div class="ledger">
      <div class="ledger-row"><span class="k">Höchst / Tief</span><span class="v">${todayHi !== null ? `${todayHi}°` : "—"} / ${todayLo !== null ? `${todayLo}°` : "—"}</span></div>
      <div class="ledger-row"><span class="k">Wind</span><span class="v">${wind !== null ? `${wind} km/h` : "—"}</span></div>
      <div class="ledger-row"><span class="k">Feuchte</span><span class="v">${hum !== null ? `${hum} %` : "—"}</span></div>
      <div class="ledger-row"><span class="k">Niederschlag</span><span class="v">${todayRain !== null ? `${todayRain} %` : "—"}</span></div>
    </div>
    ${fcSection}
  </section>`;
}

interface NormEvent {
  start: Date;
  allDay: boolean;
  summary: string;
  source: CalendarCfg;
}

function renderEventsCol(
  eventsByCalendar: Record<string, HaCalendarEvent[]>,
  calendars: CalendarCfg[],
  states: Record<string, HaState | null>,
  now: Date
): string {
  const sect = `
    <div class="sect">
      <div class="kicker">IV · Tageslauf</div>
      <div class="head-title">Termine</div>
    </div>`;

  const all: NormEvent[] = [];
  for (const cfg of calendars) {
    const events = eventsByCalendar[cfg.id] ?? [];
    for (const ev of events) {
      const dateTime = ev.start?.dateTime ?? null;
      const date = ev.start?.date ?? null;
      if (dateTime) {
        all.push({
          start: new Date(dateTime),
          allDay: false,
          summary: ev.summary ?? "(ohne Titel)",
          source: cfg,
        });
      } else if (date) {
        all.push({
          start: parseLocalDate(date),
          allDay: true,
          summary: ev.summary ?? "(ohne Titel)",
          source: cfg,
        });
      }
    }
  }
  all.sort((a, b) => a.start.getTime() - b.start.getTime());
  // Filter: only events in the next 14 days, max 5 visible
  const cutoff = startOfDay(now).getTime();
  const horizon = cutoff + 14 * 86_400_000;
  const future = all
    .filter((e) => e.start.getTime() >= cutoff && e.start.getTime() <= horizon)
    .slice(0, 5);

  let eventsHtml: string;
  if (future.length === 0) {
    eventsHtml = `<div class="cap-italic" style="padding:8px 0">Keine Termine in den nächsten 14 Tagen.</div>`;
  } else {
    eventsHtml = future
      .map((e, i) => {
        const prev = i > 0 ? future[i - 1] : null;
        const sameDayAsPrev = prev && startOfDay(prev.start).getTime() === startOfDay(e.start).getTime();
        const dayNum = e.start.getDate();
        const wdShort = WEEKDAYS_UC[e.start.getDay()];
        const time = e.allDay ? "ganztägig" : fmtTime(e.start);
        const dateCell = sameDayAsPrev
          ? `<span class="evt-date ghost"><span class="evt-num">${dayNum}</span><span class="evt-wd">${wdShort}</span></span>`
          : `<span class="evt-date"><span class="evt-num" style="color:${esc(e.source.color)}">${dayNum}</span><span class="evt-wd">${wdShort}</span></span>`;
        return `
    <div class="evt-row">
      ${dateCell}
      <div class="evt-body">
        <div class="evt-title">${esc(e.summary)}</div>
        <div class="evt-meta mono">${esc(time)}<span class="evt-pipe"></span><span class="evt-src">${esc(e.source.label)}</span></div>
      </div>
    </div>`;
      })
      .join("");
  }

  // Waste section
  type WasteEntry = { date: Date; type: string; color: string; days: number };
  const waste: WasteEntry[] = [];
  for (const cfg of WASTE_SENSORS) {
    const s = states[cfg.entityId];
    if (!s?.attributes) continue;
    for (const key of Object.keys(s.attributes)) {
      if (!DATE_KEY_RE.test(key)) continue;
      const date = parseLocalDate(key);
      const days = daysBetween(now, date);
      if (days < 0 || days > 30) continue;
      waste.push({ date, type: cfg.label, color: cfg.color, days });
    }
  }
  waste.sort((a, b) => a.date.getTime() - b.date.getTime());
  const topWaste = waste.slice(0, 4);
  const wasteHtml = topWaste.length === 0
    ? `<div class="cap-italic" style="padding:8px 0">Keine Abfuhrtermine erfasst.</div>`
    : topWaste
      .map((w, i) => {
        const dateStr = fmtShortDate(w.date);
        const numColor = i === 0 ? "color:var(--exp)" : "";
        const inText = w.days === 0 ? "heute" : w.days === 1 ? "morgen" : `in ${w.days}`;
        const unit = w.days <= 1 ? "" : "Tagen";
        return `
      <div class="w-row">
        <span class="w-bar" style="background:${esc(w.color)}"></span>
        <span class="w-body"><span class="w-name">${esc(w.type)}</span><span class="w-date">${esc(dateStr)}</span></span>
        <span class="w-in"><span class="w-num" style="${numColor}">${esc(inText)}</span>${unit ? `<span class="w-unit">${esc(unit)}</span>` : ""}</span>
      </div>`;
      })
      .join("");

  return `
  <section class="col col-3">
    ${sect}
    ${eventsHtml}
    <div style="margin-top:22px">
      <div class="sect">
        <div class="kicker">V · Hauswesen</div>
        <div class="head-title">Abfuhr</div>
      </div>
      ${wasteHtml}
    </div>
  </section>`;
}

function renderFooter(now: Date): string {
  return `
  <footer class="foot">
    <span>Auto-Refresh ${REFRESH_SECONDS} s · Server-Render · ${esc(fmtTimeWithSec(now))}</span>
    <span class="right">— fortgesetzt auf Seite II —</span>
  </footer>`;
}

// ─── Page shell ────────────────────────────────────────────────
function renderPage(body: string): string {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<title>Cockpit · Eikenhof</title>
<meta name="viewport" content="width=1024, initial-scale=1"/>
<meta http-equiv="refresh" content="${REFRESH_SECONDS}"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<meta name="apple-mobile-web-app-title" content="Cockpit"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1024px;height:768px;overflow:hidden;background:#faf7f0;color:#1c1d1f;
  font:14px/1.4 -apple-system,"Helvetica Neue","Segoe UI",Helvetica,Arial,sans-serif;
  -webkit-text-size-adjust:100%;-webkit-font-smoothing:antialiased}
.serif{font-family:"Charter","Iowan Old Style",Georgia,"Times New Roman",serif}
.mono{font-family:"SF Mono",ui-monospace,Menlo,Consolas,monospace}
.italic{font-style:italic}
.tnum{-moz-font-feature-settings:"tnum";-webkit-font-feature-settings:"tnum";font-feature-settings:"tnum";font-variant-numeric:tabular-nums}
:root{
  --ink:#1c1d1f; --inkSoft:#3a3a3c; --inkMute:#6b665b; --inkFaint:#a59f8e;
  --bg:#faf7f0;
  --rule:#1c1d1f; --ruleSoft:#e5dfd0; --ruleSofter:#efeadd;
  --cheap:#2f6b3d; --mid:#b07a1f; --exp:#a83020;
}
.frame{position:relative;width:1024px;height:768px;padding:0}
.rule-top1{position:absolute;left:36px;right:36px;top:24px;border-top:1px solid var(--rule)}
.rule-top2{position:absolute;left:36px;right:36px;top:28px;border-top:1px solid var(--rule)}
.rule-mid {position:absolute;left:36px;right:36px;top:110px;border-top:1px solid var(--rule)}
.masthead{position:absolute;left:36px;right:36px;top:38px;height:64px}
.mh-left  {position:absolute;left:0;top:12px;font-size:13px;font-style:italic;letter-spacing:.04em}
.mh-center{position:absolute;left:50%;top:4px;text-align:center;-webkit-transform:translateX(-50%);transform:translateX(-50%)}
.mh-date  {font-size:36px;font-style:italic;letter-spacing:-.01em;line-height:1}
.mh-meta  {margin-top:6px;font-size:10px;color:var(--inkMute);letter-spacing:.08em}
.mh-right {position:absolute;right:0;top:6px;font-size:36px;letter-spacing:-.01em;line-height:1}
.col{position:absolute;top:124px;height:600px;overflow:hidden}
.col-1{left:36px; width:296px; padding-right:18px;border-right:1px solid var(--rule)}
.col-2{left:350px;width:296px; padding-left:18px;padding-right:18px;border-right:1px solid var(--rule)}
.col-3{left:664px;width:320px; padding-left:18px}
.kicker{font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--inkMute)}
.head-title{font-family:"Charter","Iowan Old Style",Georgia,serif;font-size:22px;font-style:italic;
  margin-top:2px;line-height:1.05}
.sect{margin-bottom:12px}
.sect:after{content:"";display:block;margin-top:6px;border-top:1px solid var(--rule)}
.bignum{font-family:"Charter","Iowan Old Style",Georgia,serif;font-size:64px;letter-spacing:-.03em;
  line-height:.9;font-variant-numeric:tabular-nums}
.bigunit{font-family:"Charter",Georgia,serif;font-size:22px;color:var(--inkMute);margin-left:4px}
.cap-italic{font-family:"Charter",Georgia,serif;font-size:11px;font-style:italic;color:var(--inkSoft);margin-top:4px}
.tone-cheap{color:var(--cheap)}
.tone-mid  {color:var(--mid)}
.tone-exp  {color:var(--exp)}
.ledger{margin-top:12px;padding-top:8px;border-top:1px solid var(--ruleSoft);font-size:11px;line-height:1.6}
.ledger-row{display:block}
.ledger-row .v{float:right;font-family:"SF Mono",ui-monospace,Menlo,monospace}
.ledger-row .k{color:var(--inkMute)}
.spark{margin-top:14px}
.spark-axis{display:-webkit-box;display:-ms-flexbox;display:flex;
  -webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;
  margin-top:4px;font-family:"SF Mono",monospace;font-size:9px;color:var(--inkFaint)}
.fenster-row{display:block;padding:7px 0;position:relative;border-bottom:1px solid var(--ruleSofter);height:14px}
.fenster-row:last-child{border-bottom:0}
.fenster-time{display:inline-block;width:56px;font-family:"SF Mono",monospace;font-size:11px;vertical-align:middle}
.fenster-rel {display:inline-block;font-family:"Charter",Georgia,serif;font-size:13px;font-style:italic;color:var(--inkSoft);vertical-align:middle}
.fenster-val {position:absolute;right:0;top:7px;font-family:"SF Mono",monospace;font-size:12px;font-variant-numeric:tabular-nums;color:var(--cheap)}
.wx-now{position:relative;height:100px}
.wx-num{font-family:"Charter","Iowan Old Style",Georgia,serif;font-size:70px;letter-spacing:-.03em;
  line-height:.9;font-variant-numeric:tabular-nums}
.wx-deg{font-size:36px;color:var(--inkMute)}
.wx-cond{font-family:"Charter",Georgia,serif;font-size:14px;font-style:italic;color:var(--inkSoft);margin-top:2px}
.wx-glyph{position:absolute;right:0;top:0}
.fc-list{margin-top:22px}
.fc-list .kicker{margin-bottom:8px}
.fc-list .top-rule{border-top:1px solid var(--rule)}
.fc-row{display:block;padding:10px 0;border-bottom:1px solid var(--ruleSofter);height:24px;position:relative}
.fc-day  {display:inline-block;width:28px;font-size:12px;font-weight:700;vertical-align:middle}
.fc-glyph{display:inline-block;width:26px;vertical-align:middle}
.fc-bar  {display:inline-block;width:100px;height:3px;background:var(--ruleSoft);
  vertical-align:middle;position:relative;margin-left:6px}
.fc-bar > i{position:absolute;height:100%;background:var(--ink)}
.fc-temp {position:absolute;right:0;top:10px;font-family:"SF Mono",monospace;font-size:11px}
.fc-temp .lo{color:var(--inkMute)}
.evt-row{display:block;padding:9px 0;position:relative;border-bottom:1px solid var(--ruleSofter);min-height:38px}
.evt-row:last-child{border-bottom:0}
.evt-date{display:inline-block;width:38px;text-align:center;margin-right:12px;vertical-align:top}
.evt-date.ghost{visibility:hidden}
.evt-num {font-family:"Charter",Georgia,serif;font-size:24px;letter-spacing:-.02em;line-height:1;
  font-variant-numeric:tabular-nums;display:block}
.evt-wd  {font-size:9px;font-weight:700;letter-spacing:.14em;color:var(--inkMute);margin-top:2px;display:block}
.evt-body{display:inline-block;width:240px;vertical-align:top}
.evt-title{font-size:12.5px;line-height:1.3}
.evt-meta {font-family:"SF Mono",monospace;font-size:10px;color:var(--inkMute);margin-top:3px}
.evt-pipe {display:inline-block;width:1px;height:9px;background:var(--ruleSoft);vertical-align:middle;margin:0 8px}
.evt-src  {font-family:"Charter",Georgia,serif;font-style:italic;font-size:11px;color:var(--inkSoft)}
.w-row{display:block;padding:9px 0;position:relative;border-bottom:1px solid var(--ruleSofter)}
.w-row:last-child{border-bottom:0}
.w-bar  {display:inline-block;width:8px;height:24px;vertical-align:middle;margin-right:10px}
.w-body {display:inline-block;width:160px;vertical-align:middle}
.w-name {font-size:12px}
.w-date {display:block;font-family:"SF Mono",monospace;font-size:10px;color:var(--inkMute);margin-top:1px}
.w-in   {position:absolute;right:4px;top:12px;text-align:right}
.w-num  {font-family:"Charter",Georgia,serif;font-size:22px;font-variant-numeric:tabular-nums}
.w-unit {font-size:9px;color:var(--inkMute);margin-left:3px}
.foot{position:absolute;left:36px;right:36px;bottom:14px;border-top:1px solid var(--rule);
  padding-top:8px;font-family:"SF Mono",monospace;font-size:9px;color:var(--inkFaint);letter-spacing:.08em}
.foot .right{float:right;font-family:"Charter",Georgia,serif;font-style:italic;font-size:11px;color:var(--inkMute)}
</style>
</head>
<body>
<div class="frame">
  <div class="rule-top1"></div>
  <div class="rule-top2"></div>
${body}
</div>
</body>
</html>`;
}

// ─── GET ──────────────────────────────────────────────────────
export async function GET() {
  const calendars = parseCalendarsEnv(process.env.IPAD_CALENDARS_JSON);

  const calStart = startOfDay(new Date());
  const calEnd = new Date(calStart);
  calEnd.setDate(calEnd.getDate() + 14);

  const wasteEntityIds = WASTE_SENSORS.map((w) => w.entityId);
  const tibberPromise = fetchTibberPrices().catch((err) => {
    console.warn("[ipad-legacy] tibber failed:", err);
    return { today: [] as TibberPriceNode[], tomorrow: [] as TibberPriceNode[] };
  });
  const statesPromise = fetchHaStates([SUN_ENTITY, ...wasteEntityIds]);
  const weatherPromise = fetchHaState(WEATHER_ENTITY);
  const forecastPromise = fetchWeatherForecast(WEATHER_ENTITY, "daily");
  const calsPromise = Promise.all(
    calendars.map(async (c) =>
      [c.id, await fetchHaCalendarEvents(c.id, calStart, calEnd)] as const
    )
  );

  const [prices, states, weather, forecast, calsArr] = await Promise.all([
    tibberPromise,
    statesPromise,
    weatherPromise,
    forecastPromise,
    calsPromise,
  ]);
  const eventsByCalendar: Record<string, HaCalendarEvent[]> = Object.fromEntries(calsArr);

  const now = new Date();
  const sun = states[SUN_ENTITY] ?? null;
  const body =
    renderMasthead(now, sun) +
    `\n<div class="rule-mid"></div>\n` +
    renderPriceCol(prices.today, now) +
    renderWeatherCol(weather, forecast) +
    renderEventsCol(eventsByCalendar, calendars, states, now) +
    renderFooter(now);

  return new Response(renderPage(body), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
