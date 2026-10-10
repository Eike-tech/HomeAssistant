"use client";

import { useEffect, useMemo, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { SCENE_TILES } from "@/lib/hass/scenes";
import { Caption, fmt, Icon, num, useService } from "./shared";

export const HAUS_LIGHTS = [
  { label: "Wohnzimmer", entityId: ENTITIES.lighting.wohnzimmer },
  { label: "Standleuchte", entityId: ENTITIES.lighting.standleuchte },
  { label: "Fotowand", entityId: ENTITIES.lighting.fotowand },
  { label: "Bad", entityId: ENTITIES.lighting.badezimmer },
  { label: "TRADFRI", entityId: ENTITIES.lighting.tradfriBulb },
];

interface TileDef {
  id: string;
  label: string;
  light?: string;
  temp?: string;
  hum?: string;
}

const TILES: TileDef[] = [
  { id: "wohnzimmer", label: "Wohnzimmer", light: ENTITIES.lighting.wohnzimmer, temp: ENTITIES.climate.wohnzimmerTemp, hum: ENTITIES.climate.wohnzimmerHumidity },
  { id: "standleuchte", label: "Standleuchte", light: ENTITIES.lighting.standleuchte },
  { id: "fotowand", label: "Fotowand", light: ENTITIES.lighting.fotowand },
  { id: "buero", label: "Büro", temp: ENTITIES.climate.bueroTemp, hum: ENTITIES.climate.bueroHumidity },
  { id: "schlafzimmer", label: "Schlafzimmer", temp: ENTITIES.climate.schlafzimmerTemp, hum: ENTITIES.climate.schlafzimmerHumidity },
  { id: "bad", label: "Bad", light: ENTITIES.lighting.badezimmer, temp: ENTITIES.climate.badTemp },
];

export function HausView() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <ScenesRow />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1.62fr 1fr", gap: 24 }}>
        <section
          aria-label="Räume"
          style={{ minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gridTemplateRows: "repeat(2, minmax(0, 1fr))", gap: 12 }}
        >
          {TILES.map((t) => (
            <RoomTile key={t.id} def={t} />
          ))}
        </section>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <BlindZone />
          <VacuumZone />
          <MediaZone />
        </div>
      </div>
    </div>
  );
}

// ─── Szenen ───────────────────────────────────────────────────

function ScenesRow() {
  const { entities } = useHass();
  const call = useService();
  const anyOn = HAUS_LIGHTS.some((l) => entities[l.entityId]?.state === "on");

  // A scene entity's state is the timestamp it was last activated.
  const activeId = useMemo(() => {
    if (!anyOn) return "off";
    let best: { id: string; t: number } | null = null;
    for (const s of SCENE_TILES) {
      const t = Date.parse(entities[s.id]?.state ?? "");
      if (Number.isFinite(t) && Date.now() - t < 6 * 3_600_000 && (!best || t > best.t)) best = { id: s.id, t };
    }
    return best?.id ?? null;
  }, [entities, anyOn]);

  const items = [
    ...SCENE_TILES.map((s) => ({ id: s.id, label: s.label, hint: s.description, run: () => call("scene", "turn_on", { entity_id: s.id }) })),
    {
      id: "off",
      label: "Alles aus",
      hint: "alle Lichter aus",
      run: () => call("light", "turn_off", { entity_id: HAUS_LIGHTS.map((l) => l.entityId) }),
    },
  ];

  return (
    <div role="group" aria-label="Szenen" style={{ flex: "none", display: "grid", gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 12 }}>
      {items.map((s) => {
        const active = s.id === activeId;
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={active}
            onClick={s.run}
            className={active ? "tc-btn tc-btn-inv" : "tc-btn"}
            style={{
              height: 84,
              boxSizing: "border-box",
              padding: "0 22px",
              borderRadius: 28,
              display: "flex",
              alignItems: "center",
              gap: 14,
              textAlign: "left",
              background: active ? undefined : "var(--t-flat)",
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: "50%", flex: "none", background: active ? "var(--t-accent)" : "var(--t-track)" }} />
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontSize: 13, opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Raum-/Licht-Kachel ───────────────────────────────────────

function brightnessPct(light: HassEntity | undefined): number {
  if (!light || light.state !== "on") return 0;
  const b = light.attributes?.brightness;
  return typeof b === "number" ? Math.max(1, Math.round((b / 255) * 100)) : 100;
}

function RoomTile({ def }: { def: TileDef }) {
  const { entities } = useHass();
  const call = useService();
  const light = def.light ? entities[def.light] : undefined;
  const on = light?.state === "on";
  const pct = brightnessPct(light);
  const temp = def.temp ? num(entities[def.temp]) : null;
  const hum = def.hum ? num(entities[def.hum]) : null;
  const dimmable = Array.isArray(light?.attributes?.supported_color_modes)
    ? !(light!.attributes.supported_color_modes as string[]).every((m) => m === "onoff")
    : true;

  const [local, setLocal] = useState<number | null>(null);
  useEffect(() => setLocal(null), [pct]);
  const shown = local ?? pct;
  const commit = () => {
    if (local === null || !def.light) return;
    if (local <= 0) call("light", "turn_off", { entity_id: def.light });
    else call("light", "turn_on", { entity_id: def.light, brightness_pct: local });
  };

  return (
    <div
      className="tc-flat"
      style={{
        boxSizing: "border-box",
        padding: "20px 20px 18px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 0,
        background: on ? "radial-gradient(140% 100% at 0% 0%, var(--t-accent-soft), var(--t-flat) 70%)" : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{def.label}</span>
        {def.light && (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={`Licht ${def.label}`}
            disabled={!light || light.state === "unavailable"}
            onClick={() => call("light", "toggle", { entity_id: def.light })}
            className="tc-btn"
            style={{
              width: 56,
              height: 34,
              flex: "none",
              borderRadius: 999,
              padding: 4,
              display: "flex",
              justifyContent: on ? "flex-end" : "flex-start",
              background: on ? "var(--t-accent)" : "var(--t-track)",
            }}
          >
            <span style={{ width: 26, height: 26, borderRadius: "50%", background: "oklch(0.995 0 0)", boxShadow: "0 1px 3px oklch(0 0 0 / 0.2)" }} />
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        {temp !== null ? (
          <>
            <span className="tc-display" style={{ fontSize: 48, fontWeight: 250, lineHeight: 0.9, letterSpacing: "-0.03em" }}>
              {fmt(temp, 1)}
            </span>
            <span className="tc-dim" style={{ fontSize: 20 }}>
              °
            </span>
          </>
        ) : (
          <>
            <span className="tc-display" style={{ fontSize: 48, fontWeight: 250, lineHeight: 0.9, letterSpacing: "-0.03em", color: on ? "var(--t-ink)" : "var(--t-muted)" }}>
              {on ? shown : "aus"}
            </span>
            {on && (
              <span className="tc-dim" style={{ fontSize: 20 }}>
                %
              </span>
            )}
          </>
        )}
        {hum !== null && (
          <span className="tc-mono tc-dim" style={{ marginLeft: "auto", fontSize: 13 }}>
            {fmt(hum)} %
          </span>
        )}
      </div>

      {def.light ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="tc-mono tc-soft" style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span>Licht</span>
            <span>{on ? `${shown} %` : "aus"}</span>
          </div>
          {dimmable ? (
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={shown}
              aria-label={`Helligkeit ${def.label}`}
              onChange={(e) => setLocal(Number(e.target.value))}
              onPointerUp={commit}
              onKeyUp={commit}
              style={{ width: "100%", height: 24, margin: 0, accentColor: "var(--t-accent)" }}
            />
          ) : (
            <div style={{ height: 6, borderRadius: 3, background: "var(--t-track)", overflow: "hidden" }}>
              <div style={{ height: 6, width: on ? "100%" : 0, background: "var(--t-accent)" }} />
            </div>
          )}
        </div>
      ) : (
        <div className="tc-mono tc-dim" style={{ fontSize: 13 }}>
          kein Licht steuerbar
        </div>
      )}
    </div>
  );
}

// ─── Rollladen ────────────────────────────────────────────────

function BlindZone() {
  const { entities } = useHass();
  const call = useService();
  const id = ENTITIES.lighting.blind;
  const blind = entities[id];
  const pos = typeof blind?.attributes?.current_position === "number" ? (blind.attributes.current_position as number) : null;
  const status =
    blind?.state === "opening"
      ? "fährt hoch"
      : blind?.state === "closing"
        ? "fährt runter"
        : pos !== null
          ? pos >= 99
            ? "offen"
            : pos <= 1
              ? "geschlossen"
              : `${pos} % offen`
          : blind?.state ?? "—";

  const btn = (label: string, icon: React.ReactNode, run: () => void) => (
    <button
      type="button"
      className="tc-btn"
      onClick={run}
      disabled={!blind || blind.state === "unavailable"}
      style={{ height: 52, borderRadius: 18, fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <section aria-label="Rollladen" className="tc-flat" style={{ flex: "none", boxSizing: "border-box", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Caption>Rollladen</Caption>
        <span className="tc-mono tc-soft" style={{ fontSize: 13 }}>
          {status}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {btn("Auf", <Icon.up size={18} strokeWidth={2} />, () => call("cover", "open_cover", { entity_id: id }))}
        {btn("Halb", <Icon.minus size={18} strokeWidth={2} />, () => call("cover", "set_cover_position", { entity_id: id, position: 50 }))}
        {btn("Zu", <Icon.down size={18} strokeWidth={2} />, () => call("cover", "close_cover", { entity_id: id }))}
      </div>
    </section>
  );
}

// ─── Saugroboter ──────────────────────────────────────────────

function VacuumZone() {
  const { entities } = useHass();
  const call = useService();
  const vac = entities[ENTITIES.vacuum.entity];
  const battery = num(entities[ENTITIES.vacuum.battery]);
  const status = entities[ENTITIES.vacuum.status]?.state;
  const room = entities[ENTITIES.vacuum.currentRoom]?.state;
  const cleaning = vac?.state === "cleaning";
  const dash = battery !== null ? (battery / 100) * 176 : 0;

  return (
    <section aria-label="Saugroboter" className="tc-flat" style={{ flex: "none", boxSizing: "border-box", padding: "20px 24px", display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ position: "relative", width: 64, height: 64, flex: "none" }}>
        <svg aria-hidden="true" width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="32" cy="32" r="28" fill="none" style={{ stroke: "var(--t-track)" }} strokeWidth="5" />
          <circle cx="32" cy="32" r="28" fill="none" style={{ stroke: "var(--t-accent)" }} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${dash} 176`} />
        </svg>
        <span className="tc-mono" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
          {battery !== null ? `${fmt(battery)}%` : "—"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <Caption>Saugroboter</Caption>
        <span style={{ fontSize: 17, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {status && status !== "unknown" ? status : vac?.state ?? "—"}
        </span>
        {cleaning && room && room !== "unknown" && (
          <span className="tc-mono tc-dim" style={{ fontSize: 13 }}>
            {room}
          </span>
        )}
      </div>
      <button
        type="button"
        className={cleaning ? "tc-btn" : "tc-btn tc-btn-inv"}
        disabled={!vac || vac.state === "unavailable"}
        onClick={() => call("vacuum", cleaning ? "return_to_base" : "start", { entity_id: ENTITIES.vacuum.entity })}
        style={{ height: 52, padding: "0 22px", borderRadius: 999, fontSize: 15, fontWeight: 600 }}
      >
        {cleaning ? "Zur Basis" : "Starten"}
      </button>
    </section>
  );
}

// ─── Medien ───────────────────────────────────────────────────

const PLAYERS = [
  { id: ENTITIES.media.wohnzimmer, label: "Wohnzimmer" },
  { id: ENTITIES.media.buro, label: "Büro" },
  { id: ENTITIES.media.schlafzimmer, label: "Schlafzimmer" },
  { id: ENTITIES.media.bad, label: "Bad" },
  { id: ENTITIES.media.spotify, label: "Spotify" },
];

function MediaZone() {
  const { entities } = useHass();
  const call = useService();
  const player = PLAYERS.find((p) => entities[p.id]?.state === "playing") ?? PLAYERS[0];
  const mp = entities[player.id];
  const playing = mp?.state === "playing";
  const title = mp?.attributes?.media_title as string | undefined;
  const artist = (mp?.attributes?.media_artist ?? mp?.attributes?.media_album_name) as string | undefined;
  const volume = typeof mp?.attributes?.volume_level === "number" ? Math.round((mp.attributes.volume_level as number) * 100) : null;

  const [localVol, setLocalVol] = useState<number | null>(null);
  useEffect(() => setLocalVol(null), [volume]);
  const vol = localVol ?? volume ?? 0;
  const off = !mp || mp.state === "unavailable" || mp.state === "off";

  const stateLabel =
    mp?.state === "playing" ? "spielt" : mp?.state === "paused" ? "pausiert" : mp?.state === "idle" ? "bereit" : off ? "aus" : mp?.state ?? "—";

  return (
    <section
      aria-label="Medien"
      className="tc-flat"
      style={{ flex: 1, minHeight: 0, boxSizing: "border-box", padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Caption>Medien · {player.label}</Caption>
        <span className="tc-mono tc-soft" style={{ fontSize: 13 }}>
          {stateLabel}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
        <div aria-hidden="true" className="tc-fill tc-dim" style={{ width: 64, height: 64, flex: "none", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon.music size={26} strokeWidth={1.5} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title || "Nichts läuft"}</span>
          {artist && (
            <span className="tc-dim" style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {artist}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" aria-label="Zurück" className="tc-btn" disabled={off} onClick={() => call("media_player", "media_previous_track", { entity_id: player.id })} style={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon.prev size={20} strokeWidth={2} />
        </button>
        <button type="button" aria-label={playing ? "Pause" : "Abspielen"} className="tc-btn tc-btn-inv" disabled={off} onClick={() => call("media_player", "media_play_pause", { entity_id: player.id })} style={{ width: 60, height: 60, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {playing ? <Icon.pause size={22} /> : <Icon.play size={22} />}
        </button>
        <button type="button" aria-label="Weiter" className="tc-btn" disabled={off} onClick={() => call("media_player", "media_next_track", { entity_id: player.id })} style={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon.next size={20} strokeWidth={2} />
        </button>
        {volume !== null && (
          <label className="tc-soft" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Icon.volume size={18} strokeWidth={2} />
            <span className="sr-only">Lautstärke</span>
            <input
              type="range"
              min={0}
              max={100}
              step={2}
              value={vol}
              onChange={(e) => setLocalVol(Number(e.target.value))}
              onPointerUp={() => localVol !== null && call("media_player", "volume_set", { entity_id: player.id, volume_level: localVol / 100 })}
              onKeyUp={() => localVol !== null && call("media_player", "volume_set", { entity_id: player.id, volume_level: localVol / 100 })}
              style={{ width: 110, height: 24, margin: 0, accentColor: "var(--t-ink)" }}
            />
          </label>
        )}
      </div>
    </section>
  );
}
