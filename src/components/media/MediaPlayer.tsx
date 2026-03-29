"use client";

import { Slider } from "@/components/ui/slider";
import { useEntity } from "@/lib/hooks/useEntity";
import { useHass } from "@/lib/hooks/useHass";
import {
  mediaPlayPause,
  mediaNext,
  mediaPrevious,
  setMediaVolume,
} from "@/lib/hass/services";

export function MediaPlayer({
  entityId,
  name,
}: {
  entityId: string;
  name: string;
}) {
  const { connection } = useHass();
  const entity = useEntity(entityId);

  if (!entity) return null;

  const state = entity.state;
  const isPlaying = state === "playing";
  const isPaused = state === "paused";
  const isActive = isPlaying || isPaused;

  const title = entity.attributes?.media_title as string | undefined;
  const artist = entity.attributes?.media_artist as string | undefined;
  const volume = entity.attributes?.volume_level as number | undefined;
  const entityPicture = entity.attributes?.entity_picture as string | undefined;

  const imageUrl =
    entityPicture && process.env.NEXT_PUBLIC_HASS_URL
      ? `${process.env.NEXT_PUBLIC_HASS_URL}${entityPicture}`
      : undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {imageUrl && isActive ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-12 w-12 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] text-lg">
            🎵
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium truncate">{name}</span>
            <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${
              isPlaying ? "bg-green-400/15 text-green-400" : "text-muted-foreground"
            }`}>
              {state === "playing" ? "Spielt" : state === "paused" ? "Pause" : state === "idle" ? "Idle" : state}
            </span>
          </div>
          {isActive && title && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {title}{artist ? ` — ${artist}` : ""}
            </p>
          )}
        </div>
      </div>

      {isActive && (
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5">
            <button
              className="rounded-full p-1.5 text-sm transition-colors hover:bg-white/[0.08]"
              onClick={() => { if (connection) mediaPrevious(connection, entityId); }}
            >
              ⏮
            </button>
            <button
              className="rounded-full p-1.5 text-sm transition-colors hover:bg-white/[0.08]"
              onClick={() => { if (connection) mediaPlayPause(connection, entityId); }}
            >
              {isPlaying ? "⏸" : "▶️"}
            </button>
            <button
              className="rounded-full p-1.5 text-sm transition-colors hover:bg-white/[0.08]"
              onClick={() => { if (connection) mediaNext(connection, entityId); }}
            >
              ⏭
            </button>
          </div>
          {volume !== undefined && (
            <Slider
              value={[Math.round(volume * 100)]}
              min={0}
              max={100}
              step={1}
              className="flex-1"
              onValueCommitted={(val) => {
                const v = typeof val === "number" ? val : val[0];
                if (connection) setMediaVolume(connection, entityId, v / 100);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
