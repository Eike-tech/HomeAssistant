"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { useEntity } from "@/lib/hooks/useEntity";
import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import {
  mediaPlayPause,
  mediaNext,
  mediaPrevious,
  setMediaVolume,
} from "@/lib/hass/services";
import { callService } from "home-assistant-js-websocket";
import { Speaker, ChevronDown, Shuffle, Repeat } from "lucide-react";

const SPOTIFY_ENTITY = ENTITIES.media.spotify;

// Known speakers that can play Spotify
const SPEAKER_MAP: Record<string, string> = {
  "media_player.wohnzimmer": "Wohnzimmer",
  "media_player.buro": "Büro",
  "media_player.schlafzimmer": "Schlafzimmer",
  "media_player.bad": "Bad",
};

export function SpotifyPlayer() {
  const { connection } = useHass();
  const spotify = useEntity(SPOTIFY_ENTITY);
  const [showSpeakers, setShowSpeakers] = useState(false);

  if (!spotify) return null;

  const state = spotify.state;
  const isPlaying = state === "playing";
  const isPaused = state === "paused";
  const isActive = isPlaying || isPaused;

  const title = spotify.attributes?.media_title as string | undefined;
  const artist = spotify.attributes?.media_artist as string | undefined;
  const album = spotify.attributes?.media_album_name as string | undefined;
  const volume = spotify.attributes?.volume_level as number | undefined;
  const shuffle = spotify.attributes?.shuffle as boolean | undefined;
  const repeat = spotify.attributes?.repeat as string | undefined;
  const source = spotify.attributes?.source as string | undefined;
  const sourceList = spotify.attributes?.source_list as string[] | undefined;
  const entityPicture = spotify.attributes?.entity_picture as string | undefined;

  const imageUrl =
    entityPicture && process.env.NEXT_PUBLIC_HASS_URL
      ? `${process.env.NEXT_PUBLIC_HASS_URL}${entityPicture}`
      : undefined;

  return (
    <div className="space-y-4">
      {/* Album art + track info */}
      <div className="flex items-start gap-4">
        {imageUrl && isActive ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-16 w-16 rounded-xl object-cover shadow-lg"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-green-500/10 text-2xl">
            🎵
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-green-400">Spotify</span>
            <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${
              isPlaying ? "bg-green-400/15 text-green-400" : "text-muted-foreground"
            }`}>
              {isPlaying ? "Spielt" : isPaused ? "Pause" : "Idle"}
            </span>
          </div>
          {isActive && title ? (
            <>
              <p className="text-sm font-medium truncate mt-0.5">{title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {artist}{album ? ` — ${album}` : ""}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Keine Wiedergabe</p>
          )}
        </div>
      </div>

      {/* Transport controls */}
      {isActive && (
        <div className="flex items-center justify-center gap-2">
          <button
            className={`rounded-full p-1.5 transition-colors hover:bg-white/[0.08] ${shuffle ? "text-green-400" : "text-muted-foreground"}`}
            onClick={() => {
              if (connection) callService(connection, "media_player", "shuffle_set", { entity_id: SPOTIFY_ENTITY, shuffle: !shuffle });
            }}
          >
            <Shuffle className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded-full p-2 text-sm transition-colors hover:bg-white/[0.08]"
            onClick={() => { if (connection) mediaPrevious(connection, SPOTIFY_ENTITY); }}
          >
            ⏮
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-black text-lg transition-colors hover:bg-green-400"
            onClick={() => { if (connection) mediaPlayPause(connection, SPOTIFY_ENTITY); }}
          >
            {isPlaying ? "⏸" : "▶️"}
          </button>
          <button
            className="rounded-full p-2 text-sm transition-colors hover:bg-white/[0.08]"
            onClick={() => { if (connection) mediaNext(connection, SPOTIFY_ENTITY); }}
          >
            ⏭
          </button>
          <button
            className={`rounded-full p-1.5 transition-colors hover:bg-white/[0.08] ${repeat && repeat !== "off" ? "text-green-400" : "text-muted-foreground"}`}
            onClick={() => {
              if (!connection) return;
              const next = repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
              callService(connection, "media_player", "repeat_set", { entity_id: SPOTIFY_ENTITY, repeat: next });
            }}
          >
            <Repeat className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Volume */}
      {isActive && volume !== undefined && (
        <Slider
          value={[Math.round(volume * 100)]}
          min={0}
          max={100}
          step={1}
          className="w-full"
          onValueCommitted={(val) => {
            const v = typeof val === "number" ? val : val[0];
            if (connection) setMediaVolume(connection, SPOTIFY_ENTITY, v / 100);
          }}
        />
      )}

      {/* Speaker selector */}
      <div className="space-y-2">
        <button
          className="flex w-full items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs transition-colors hover:bg-white/[0.07]"
          onClick={() => setShowSpeakers(!showSpeakers)}
        >
          <div className="flex items-center gap-2">
            <Speaker className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{source ?? "Lautsprecher wählen"}</span>
          </div>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showSpeakers ? "rotate-180" : ""}`} />
        </button>

        {showSpeakers && sourceList && sourceList.length > 0 && (
          <div className="space-y-0.5 rounded-xl bg-white/[0.03] p-1.5">
            {sourceList.map((src) => {
              const isSelected = src === source;
              return (
                <button
                  key={src}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                    isSelected
                      ? "bg-green-400/10 text-green-400"
                      : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                  }`}
                  onClick={() => {
                    if (connection) {
                      callService(connection, "media_player", "select_source", { entity_id: SPOTIFY_ENTITY, source: src });
                    }
                    setShowSpeakers(false);
                  }}
                >
                  <Speaker className="h-3 w-3" />
                  <span>{src}</span>
                  {isSelected && <span className="ml-auto text-[10px]">Aktiv</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Fallback: show known speakers when Spotify has no source_list (idle) */}
        {showSpeakers && (!sourceList || sourceList.length === 0) && (
          <div className="space-y-0.5 rounded-xl bg-white/[0.03] p-1.5">
            <p className="px-3 py-1.5 text-[10px] text-muted-foreground">
              Spotify ist nicht aktiv. Starte die Wiedergabe in der Spotify-App, um Lautsprecher hier auszuwählen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
