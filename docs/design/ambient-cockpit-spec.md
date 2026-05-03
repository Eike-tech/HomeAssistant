# Ambient Cockpit — Token & Component Spec

**Status:** Draft v0.1 — wartet auf Review.
**Scope:** Designrichtung C aus [`hast-du-hier-zugriff-fuzzy-hollerith.md`](../../.claude/plans/hast-du-hier-zugriff-fuzzy-hollerith.md).
**Geräte:** Handy + Desktop (kein iPad-an-Wand → Wallpaper-Mode entfällt).
**Codebasis:** Next.js 16 / Tailwind 4 / shadcn (Base Nova) / OKLch-Tokens.

---

## 1. Leitidee

Das Dashboard ist **kein Card-Container, sondern ein Cockpit, das den Zustand des Hauses widerspiegelt**. Drei Grundregeln:

1. **Daten werden zur Atmosphäre.** Hintergrund und Akzentfarbe sind eine Funktion vom Spotpreis-Quantil und Tesla-Ladezustand.
2. **Wenige große Anker statt vieler kleiner Cards.** Hero-KPIs in 96–128 px, Sekundärinfos in 12–14 px Caption.
3. **Bewegung kommuniziert Zustand, nicht Schmuck.** Idle-Animation bedeutet "alles ruhig", Pulse bedeutet "etwas passiert", Statisch bedeutet "keine Daten".

Was *nicht* passiert: keine harten Card-Borders, keine Chrome-Overlays, keine Material-Shadows. Glas-Surfaces aus dem aktuellen Design bleiben nur als Sekundärschicht (z.B. Modals, Floating-Controls).

---

## 2. Design Tokens

### 2.1 Statische Farb-Tokens (CSS Custom Properties)

Erweitern [`src/app/globals.css`](../../src/app/globals.css). Die bestehenden Tokens (`--background`, `--card`, `--chart-*`) bleiben — wir **ergänzen** Cockpit-spezifische Layer.

```css
.dark {
  /* COCKPIT — base canvas */
  --cockpit-canvas:        oklch(0.08 0.02 240);   /* tiefes Cobalt-Schwarz */
  --cockpit-canvas-soft:   oklch(0.11 0.02 240);
  --cockpit-ink:           oklch(0.97 0 0);        /* Hero-Text */
  --cockpit-ink-dim:       oklch(0.62 0.005 260);  /* Captions */
  --cockpit-ink-faint:     oklch(0.40 0.005 260);  /* Disabled / Idle */

  /* Zone-Edges (statt Card-Borders) */
  --cockpit-edge-soft:     oklch(1 0 0 / 0.04);
  --cockpit-edge-strong:   oklch(1 0 0 / 0.08);

  /* Signal-Farben (statisch, für Status) */
  --signal-tesla:          oklch(0.65 0.22 25);    /* Tesla-Rot */
  --signal-tesla-glow:     oklch(0.65 0.22 25 / 0.35);
  --signal-warn:           oklch(0.78 0.18 75);    /* Amber */
  --signal-ok:             oklch(0.78 0.18 150);   /* Mint */
  --signal-idle:           oklch(0.45 0.02 220);   /* tiefes Graublau */
}
```

> Light-Mode wird **nicht** mit ausgeliefert. Cockpit ist Dark-only — das ist eine bewusste Entscheidung der Richtung. Falls später Light gewünscht: separater Spec-Cycle.

### 2.2 Dynamischer Akzent (Spotpreis-getrieben)

Ein **einziger** CSS-Var (`--accent-live`) wird live aus dem Spotpreis-Quantil interpoliert und ist die Primärfarbe für alle aktiv-werdenden UI-Elemente (Charts, Hero-Glow, Hover-States).

```css
.dark {
  /* Default fallback solange noch keine Daten geladen */
  --accent-live:           oklch(0.70 0.15 220);   /* neutrales Cyan */
  --accent-live-glow:      oklch(0.70 0.15 220 / 0.30);
}
```

**Mapping** (lineare Interpolation in OKLch von cheap → expensive):

| Quantil (`sensor.epex_spot_data_quantile`) | Bedeutung | OKLch |
|---|---|---|
| 0.00 – 0.20 | Sehr billig | `oklch(0.78 0.16 195)` (helles Cyan) |
| 0.20 – 0.40 | Billig | `oklch(0.74 0.14 175)` (Mint) |
| 0.40 – 0.60 | Mittel | `oklch(0.70 0.10 145)` (gedämpftes Grün) |
| 0.60 – 0.80 | Teuer | `oklch(0.72 0.16 65)` (warmes Gelb) |
| 0.80 – 1.00 | Sehr teuer | `oklch(0.68 0.20 40)` (Coral/Amber) |

**Implementierung**: Custom Hook `useAmbientAccent()` (neu), liest `state.s` von `sensor.epex_spot_data_quantile`, setzt CSS-Var auf `document.documentElement` mit `style.setProperty('--accent-live', …)`. Update-Cadence: bei jedem WebSocket-Event (Quantil-Sensor ändert sich nur ~stündlich → kostenlos).

**Tesla-Override**: Wenn `binary_sensor.crest_ladestatus === 'on'`, wird `--accent-live` für die Dauer der Ladung auf `--signal-tesla` gesetzt **und** Body bekommt Klasse `.is-charging` (für Pulse-Animation). Quantil-Akzent kommt zurück, sobald Ladung endet.

Datei für den Hook: `src/lib/hooks/useAmbientAccent.ts` (neu).
Anbinden in: `src/app/layout.tsx` oder `DashboardShell.tsx`.

### 2.3 Typografie

```css
@theme inline {
  --font-display: "GT Maru", "Söhne Breit", var(--font-inter), sans-serif;
  --font-sans:    var(--font-inter), -apple-system, sans-serif;
  --font-mono:    var(--font-geist-mono), ui-monospace, monospace;
}
```

| Rolle | Font | Größe (Mobile / Desktop) | Weight | Letter-Spacing |
|---|---|---|---|---|
| **Hero-KPI** (z.B. Live-Watt) | Display | 72px / 128px | 400 | -0.04em |
| **Sub-KPI** (z.B. Kosten heute) | Display | 32px / 48px | 400 | -0.03em |
| **Section-Caption** (UPPERCASE) | Sans | 11px / 12px | 500 | 0.06em |
| **Body** | Sans | 14px / 15px | 400 | -0.01em |
| **Werte mit Einheit** (z.B. "1245 W") | Mono | 13px / 14px | 500 | 0 |

**Fontsource für Display-Font**: `@fontsource/gt-maru` falls verfügbar, sonst Selbst-Hosting in `public/fonts/` und in `src/app/layout.tsx` über `next/font/local` einbinden. Lizenz prüfen — GT Maru ist kommerziell, **freier Ersatz: Söhne Breit nicht frei → Alternative: Migra (Pangram Pangram, Personal-Use frei) oder Inter Display in Größe 96+ mit erhöhtem Tracking**.

> Empfehlung: **Inter Display + custom Tracking** als pragmatischer Default für v0.1; "richtige" Display-Font in v0.2 nach Lizenz-Klärung.

### 2.4 Spacing, Radius, Layout

```css
.dark {
  --cockpit-pad-page:  24px;   /* Mobile */
  --cockpit-pad-zone:  20px;
  --cockpit-gap-zone:  32px;   /* großzügig — viel Negativraum */
  --cockpit-radius-zone: 32px;
  --cockpit-radius-pill:  999px;
}

@media (min-width: 1024px) {
  .dark {
    --cockpit-pad-page:  48px;
    --cockpit-pad-zone:  40px;
    --cockpit-gap-zone:  56px;
    --cockpit-radius-zone: 40px;
  }
}
```

**Grid**: kein klassisches 12-Spalten-Grid, sondern *Zonen* mit `display: grid; grid-template-areas`. Konkrete Areas siehe Komponenten-Specs unten.

### 2.5 Motion

Alle Animationen über CSS Custom Properties + Framer Motion (für komplexere Sequenzen).

```css
.dark {
  --motion-fast:    180ms;
  --motion-base:    320ms;
  --motion-slow:    640ms;
  --motion-ambient: 8s;     /* idle pulse */
  --ease-out:       cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

Drei Bewegungstypen:

1. **Functional** (`--motion-fast`/`--motion-base`): User-Interaktionen — Hover, Tap, Wert-Wechsel.
2. **Ambient** (`--motion-ambient`): Hintergrund-Glows atmen. Sehr langsame Sinus-Pulse, immer aktiv solange Daten frisch sind.
3. **Signal** (variabel): Pulse während Tesla lädt — Frequenz = `min(2s, 60s × (1 - SoC))` (je leerer der Akku, desto schneller).

---

## 3. Komponenten-Spec

### 3.1 Übersicht — was bleibt, was wird neu, was fällt

| Aktuell | Cockpit-Strategie | Neuer Pfad |
|---|---|---|
| `EnergyOverviewCard` | **Neu als `EnergyHero`** — vollflächiger Hero | `src/components/energy/EnergyHero.tsx` |
| `SpotPriceChart` / `EnhancedSpotPriceChart` | **Neu als `SpotpreisHorizont`** — lebende 24h-Tide | `src/components/energy/SpotpreisHorizont.tsx` |
| `SankeyDiagram` | **Neu als `ParticleFlow`** — organisch | `src/components/energy/ParticleFlow.tsx` |
| `CarOverviewCard` + Tesla-Cards | **Neu als `TeslaCockpit`** — eigener Layout-Block | `src/components/car/TeslaCockpit.tsx` |
| `RoomBreakdownCard` | **Neu als `RoomDots`** — Punkte auf abstraktem Grundriss | `src/components/energy/RoomDots.tsx` |
| `EnergyStatsCard`, `PowerGauge` | Werden in `EnergyHero` integriert | (entfällt als eigene Datei) |
| `ClimateCard`, `RoomClimate`, `LightingCard`, `MediaCard`, `VacuumCard` etc. | Bleiben strukturell, aber **neu gestylt** als Zonen statt Cards | bestehende Pfade, nur Klassen tauschen |
| `Sidebar`, `Header` | Reduzieren — Header wird minimaler, Sidebar bekommt neues Active-Treatment | bestehende Pfade |
| `AutomationenPage` | Out of scope für v0.1 | unverändert |

### 3.2 `EnergyHero`

**Zweck:** Der erste sichtbare Block auf Dashboard und Energie-Tab. Zeigt den Live-Zustand des Hauses in einer einzigen großen Zahl.

**Layout (Mobile, < 640 px):**
```
┌────────────────────────────────┐
│  CAPTION  AKTUELLER VERBRAUCH  │  11px UPPERCASE
│                                │
│         1 245 W                │  72px Display
│                                │
│  0,42 € heute · 18 ¢/kWh now   │  14px Mono Captions
│                                │
│  [tiny sparkline last 60min]   │  ~32px hoch
└────────────────────────────────┘
```

**Layout (Desktop, ≥ 1024 px):**
```
┌──────────────────────────────────────────────────────────┐
│  CAPTION                                                 │
│                                                          │
│   1 245 W      ← 128px, Display                          │
│   ▔▔▔▔▔▔▔                                              │
│   18 ¢/kWh now    ▮▮▮▯▯ Ranking                          │
│                                                          │
│   0,42 € heute   →   Δ 0,05 € vs gestern   →   ⚡ 4.2 kWh │
└──────────────────────────────────────────────────────────┘
```

**Datenquellen:**
- `sensor.tibber_pulse_mount_cleltze_leistung` → Hero-Zahl (W)
- `sensor.tibber_pulse_mount_cleltze_kumulierte_kosten` → Kosten heute
- `sensor.epex_spot_data_market_price` → ¢/kWh now
- `sensor.epex_spot_data_rank` → Ranking-Pillen (kleinste/größte/mittlere)
- `sensor.tibber_pulse_mount_cleltze_kumulierter_verbrauch` → kWh heute
- Sparkline: Recharts oder eigene SVG, History via `recorder/history`

**Verhalten:**
- Hero-Zahl mit `tabular-nums`. Bei Wert-Wechsel: `transition: opacity` Crossfade über 320 ms — kein Number-Roller.
- Background-Glow der Zone wird vom `--accent-live` getrieben: `radial-gradient(at 50% 0%, var(--accent-live-glow), transparent 70%)`.
- Idle-Atmung des Glows (siehe Motion §2.5).

**Komponenten-Schnittstelle:**
```ts
type EnergyHeroProps = {
  variant?: "dashboard" | "energie"; // Desktop-Variante schaltet Sparkline + Ranking
};
```
Daten holt sich die Komponente selbst via `useHass()` — keine Props-Drilling.

### 3.3 `SpotpreisHorizont`

**Zweck:** Ersetzt das klassische Spotpreis-Bar-Chart durch eine *lebende Horizont-Linie* — die nächsten 24 h als wellenförmige Fläche, deren Farbe pro Stunde dem Quantil-Mapping folgt.

**Visuell:**
- Horizontale Achse = nächste 24 h.
- Vertikale Achse = ¢/kWh, **nicht beschriftet** (Achsen-Chrome ist verboten in dieser Richtung). Gradient-Fläche unter der Linie zeigt Höhe implizit.
- Aktuelle Stunde: vertikale, dünne Linie + Pulse-Dot in `--accent-live`.
- Hover/Tap: Tooltip mit exakter ¢/kWh-Zahl + Uhrzeit.

**Mobile:** Höhe 120 px, gestreckt auf volle Breite. Touch-Tap für Tooltip.
**Desktop:** Höhe 200 px, mit dezenten 6h/12h/18h-Markern als Caption am unteren Rand.

**Tech:** SVG (kein Recharts — wir wollen Pixel-Kontrolle für die Farb-Interpolation). Stunde für Stunde wird die Farbe aus dem Quantil-Mapping berechnet, dazwischen mit `<linearGradient>` interpoliert.

**Datenquelle:** Tibber GraphQL (`tibberClient`) — bestehender Code in `src/lib/server/tibberClient.ts`. Die Daten kommen schon stündlich; Mapping zur Cockpit-Farbe passiert client-seitig.

### 3.4 `ParticleFlow` (Sankey-Ersatz)

**Zweck:** Aktuelle Energie-Verteilung im Haus, organisch dargestellt. Ersetzt das harte Sankey-Diagramm.

**Visuell:**
- Links: ein "Quell"-Punkt (Netz/Tibber), Größe ∝ aktuelle Last.
- Rechts: 5–8 "Senken"-Punkte (Räume/Geräte mit > 5 W aktuell), Größe ∝ ihrem Verbrauch.
- Zwischen Quelle und Senken fließen kleine Partikel — mehr Partikel = mehr Watt.
- Partikel-Farbe = `--accent-live` mit leichter Sättigungs-Variation.

**Idle-Verhalten:** wenn `< 50 W` Gesamtverbrauch → Partikel verlangsamen sich auf nahezu 0, Punkte schrumpfen auf `--signal-idle`. Visuelles "das Haus schläft".

**Tech:** Canvas (nicht SVG) für Partikel-Performance. Library-Empfehlung: keine — vanilla `requestAnimationFrame`, ~50 LoC. Bestehender Sankey-Code ist Inspirationsquelle, wird aber neu geschrieben.

**Datenquellen:** alle `*Power`-Sensoren aus `ENTITIES.energy` (Powercalc). Auswahl der angezeigten Senken: Top-N mit Wert > 5 W, sortiert nach aktuellem Verbrauch.

### 3.5 `TeslaCockpit`

**Zweck:** Ein eigener visueller Block für das Auto. Bekommt im Charging-State seine eigene visuelle Identität (Tesla-Rot statt Quantil-Akzent).

**Visuell:**
- Mobile: vertikales Layout — SoC als großer Ring (160 px Ø), Reichweite darunter, Status-Pills (Stecker, Türen, Lock) in einer Reihe.
- Desktop: horizontales Layout — links angedeutete Auto-Silhouette als SVG-Outline (kein Foto, sehr reduziert, vielleicht 40 % Opacity), rechts SoC-Ring + Reichweite + Charge-Speed.
- Wenn `binary_sensor.crest_ladestatus === 'on'`: Body bekommt `.is-charging`-Klasse → Tesla-Rot-Glow auf der Zone, Ring pulsiert mit Frequenz aus §2.5.

**Datenquellen:** `ENTITIES.car.*` (battery, range, chargingStatus, chargingSpeed, timeToFull, lock, plugged).

**Auto-Silhouette SVG:** wird nicht hier spezifiziert. Vorschlag: Model 3 oder Model Y Outline aus einer freien Quelle (z.B. SVG aus `simple-icons`-Stil), v0.1 kann auch ein einfacher Platzhalter sein.

### 3.6 `RoomDots`

**Zweck:** Ersetzt `RoomBreakdownCard`. Räume des Hauses als pulsierende Punkte auf einem abstrakten Grundriss.

**Visuell:**
- Abstrakter Grundriss als SVG: keine Wände, nur Punkte auf festen Koordinaten (z.B. "Wohnzimmer" oben links, "Schlafzimmer" unten rechts).
- Punkt-Größe ∝ aktueller Verbrauch des Raums.
- Punkt-Farbe = `--accent-live`, Idle-Räume in `--signal-idle`.
- Hover: Raumname + W-Wert.

**Mobile:** als horizontale Liste mit Punkten + Labels (kein Grundriss — der Grundriss ist Desktop-only).
**Desktop:** abstrakter Grundriss-SVG, Punkte über `position: absolute`.

**Datenquellen:** Powercalc-Sensoren je Raum — bestehende Aggregation in [`src/components/energy/`](../../src/components/energy/) prüfen, ggf. wiederverwenden.

### 3.7 Sekundäre Zonen (Klima / Licht / Medien / etc.)

Diese Komponenten bleiben strukturell wie heute, bekommen aber einen neuen Visual-Stil:

- **Kein** `surface-glass` mehr.
- Statt Card-Container: eine Section mit `padding: var(--cockpit-pad-zone)` und einer `radial-gradient`-Hintergrund-Aufhellung am oberen Rand (`var(--cockpit-edge-soft)`) — das deutet "hier beginnt eine Zone" an, ohne harte Border.
- Caption-Header in Section-Caption-Stil (siehe §2.3).
- Werte in Mono (`var(--font-mono)`), Werte+Einheiten zusammen ohne Leerraum (`1245W` nicht `1245 W` in Captions, aber im Hero schon).

Konkrete Überarbeitung pro Komponente passiert nach Approval dieses Specs in einer eigenen Phase.

---

## 4. Layout-Skelette

### 4.1 Dashboard-Tab (Mobile)

```
┌──────────────────────────┐
│  Header (slim)           │
├──────────────────────────┤
│                          │
│   EnergyHero             │  ~280px
│                          │
├──────────────────────────┤
│   ParticleFlow           │  ~200px
├──────────────────────────┤
│   TeslaCockpit           │  ~320px (vertikal)
├──────────────────────────┤
│   ClimateCard (restyled) │
├──────────────────────────┤
│   LightingCard           │
├──────────────────────────┤
│   MediaCard              │
├──────────────────────────┤
│  Bottom Nav              │
└──────────────────────────┘
```

### 4.2 Dashboard-Tab (Desktop ≥ 1024 px)

```
┌────────────────────────────────────────────────────────────┐
│  Header                                                    │
├──────────────┬─────────────────────────────────────────────┤
│              │                                             │
│   Sidebar    │   EnergyHero  (volle Breite)                │
│              │                                             │
│              ├─────────────────────┬───────────────────────┤
│              │                     │                       │
│              │   ParticleFlow      │   TeslaCockpit        │
│              │                     │                       │
│              ├─────────────────────┼───────────────────────┤
│              │   ClimateCard       │   RoomDots (Grundriss)│
│              ├─────────────────────┼───────────────────────┤
│              │   LightingCard      │   MediaCard           │
│              └─────────────────────┴───────────────────────┘
```

Grid-Implementation in `DashboardShell.tsx` via `grid-template-areas` — siehe v0.2 für die genaue Definition.

### 4.3 Energie-Tab (Desktop)

```
┌────────────────────────────────────────────────────────────┐
│   EnergyHero (variant="energie" — mit Sparkline + Ranking) │
├────────────────────────────────────────────────────────────┤
│   SpotpreisHorizont (volle Breite, 200px)                  │
├──────────────────────────────┬─────────────────────────────┤
│   ParticleFlow (2/3)         │   RoomDots (1/3)            │
├──────────────────────────────┴─────────────────────────────┤
│   EnergyStats (Tag/Woche/Monat, restyled als Zonen)        │
└────────────────────────────────────────────────────────────┘
```

### 4.4 Auswertung-Tab

Out of scope für v0.1 — bleibt visuell wie heute. Sobald die Ambient-Sprache an den ersten beiden Tabs steht, wird Auswertung in v0.2 angepasst (Heatmap + Charts in Cockpit-Style).

---

## 5. Migrationspfad (5 Phasen)

Jede Phase ist einzeln deploybar — das Dashboard funktioniert nach jeder Phase, sieht aber inkrementell mehr nach Cockpit aus.

| Phase | Inhalt | Dateien | Aufwand |
|---|---|---|---|
| **P1 — Tokens & Canvas** | `globals.css` erweitern, `useAmbientAccent`-Hook, Body-Klassen | `globals.css`, `useAmbientAccent.ts` (neu), `DashboardShell.tsx` | klein |
| **P2 — EnergyHero** | Erste echte Cockpit-Komponente, ersetzt `EnergyOverviewCard` auf Dashboard | `EnergyHero.tsx` (neu), `DashboardContent.tsx` | mittel |
| **P3 — SpotpreisHorizont + ParticleFlow** | Zwei Schlüssel-Visualisierungen, ersetzen Spot-Chart + Sankey | `SpotpreisHorizont.tsx`, `ParticleFlow.tsx` (neu), `EnergiePage.tsx` | groß |
| **P4 — TeslaCockpit + RoomDots** | Tesla-Block + Räume-Punkte | `TeslaCockpit.tsx`, `RoomDots.tsx` (neu), `DashboardContent.tsx` | mittel |
| **P5 — Sekundäre Zonen** | Restliche Cards (Climate, Lighting, Media, …) auf Zone-Stil | je `*.tsx` in `climate/`, `lighting/`, `media/` etc. | mittel |

---

## 6. Verifikation

Pro Phase mit dem `preview_*`-Toolset:

1. `preview_start` → Dashboard öffnen.
2. `preview_screenshot` Mobile (375 × 812) und Desktop (1440 × 900) — Vergleich gegen vorherigen Stand.
3. `preview_console_logs` checken — keine neuen Errors / CSS-Warnings.
4. Live-Tests: Spotpreis-Quantil ändern (im HA Developer Tools `state_attr` setzen) → `--accent-live` muss reagieren. Tesla-Charging-Sensor toggeln → `.is-charging`-Klasse muss umschalten.
5. Performance: Animations auf Throttled-CPU (4× slowdown) prüfen — Particle-Flow & Idle-Pulse müssen ≥ 30 fps halten.

---

## 7. Offene Punkte / Entscheidungen vor P1

1. **Display-Font:** Inter Display als Default (lizenz-frei), oder doch GT Maru/Migra einkaufen? → Default ist Inter Display, Upgrade in v0.2 möglich.
2. **Light Mode wirklich raus?** Spec geht aktuell davon aus. Falls doch nötig: ~+30 % Aufwand pro Komponente.
3. **Auto-Silhouette:** Welches Modell zeichnen? Falls du eine SVG-Quelle hast, gerne hier verlinken.
4. **Performance Budget:** Particle-Flow auf älteren Mobiles? Falls Backup nötig: Reduce-Motion-Variante (statisches Sankey statt Partikel).

---

## 8. Referenzen

- Aktuelle Tokens: [`src/app/globals.css`](../../src/app/globals.css)
- Entity-Mapping: [`src/lib/hass/entities.ts`](../../src/lib/hass/entities.ts)
- HA-WebSocket-Hook: [`src/lib/hooks/useHass.tsx`](../../src/lib/hooks/useHass.tsx)
- Tibber-Client: [`src/lib/server/tibberClient.ts`](../../src/lib/server/tibberClient.ts)
- Layout-Shell: [`src/components/layout/DashboardShell.tsx`](../../src/components/layout/DashboardShell.tsx)
- Inspirationen-Plan: [`hast-du-hier-zugriff-fuzzy-hollerith.md`](../../.claude/plans/hast-du-hier-zugriff-fuzzy-hollerith.md)
