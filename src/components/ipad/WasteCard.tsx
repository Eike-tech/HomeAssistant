"use client";

import { useMemo } from "react";
import { useEntities } from "@/lib/hooks/useEntity";

interface WasteEntry {
  date: Date;
  type: string;
  daysFromNow: number;
}

const WASTE_SENSORS: { entityId: string; label: string; color: string; emoji: string }[] = [
  {
    entityId: "sensor.waste_collection_schedule_restabfall",
    label: "Restabfall",
    color: "oklch(0.55 0.02 260)",
    emoji: "⬛",
  },
  {
    entityId: "sensor.waste_collection_schedule_bioabfall",
    label: "Bioabfall",
    color: "oklch(0.55 0.12 145)",
    emoji: "🟩",
  },
  {
    entityId: "sensor.waste_collection_schedule_gelber_sack_tonne",
    label: "Gelber Sack",
    color: "oklch(0.78 0.18 90)",
    emoji: "🟨",
  },
  {
    entityId: "sensor.waste_collection_schedule_altpapier",
    label: "Altpapier",
    color: "oklch(0.65 0.15 254)",
    emoji: "🟦",
  },
];

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function parseLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(now: Date, target: Date): number {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

function formatRelative(days: number, date: Date): string {
  if (days === 0) return "Heute";
  if (days === 1) return "Morgen";
  if (days <= 7) return date.toLocaleDateString("de-DE", { weekday: "long" });
  return date.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
}

export function WasteCard() {
  const entities = useEntities(WASTE_SENSORS.map((s) => s.entityId));

  const upcoming = useMemo<(WasteEntry & { color: string; emoji: string })[]>(() => {
    const now = new Date();
    const all: (WasteEntry & { color: string; emoji: string })[] = [];

    entities.forEach((entity, idx) => {
      if (!entity?.attributes) return;
      const cfg = WASTE_SENSORS[idx];
      for (const key of Object.keys(entity.attributes)) {
        if (!DATE_KEY.test(key)) continue;
        const date = parseLocalDate(key);
        const days = daysBetween(now, date);
        if (days < 0 || days > 21) continue;
        all.push({
          date,
          type: cfg.label,
          daysFromNow: days,
          color: cfg.color,
          emoji: cfg.emoji,
        });
      }
    });

    return all.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 4);
  }, [entities]);

  return (
    <section className="surface-glass rounded-[var(--cockpit-radius-zone)] p-5 flex flex-col gap-2 min-h-0">
      <header>
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cockpit-ink-faint)]">
          Abfallkalender
        </h2>
      </header>

      {upcoming.length === 0 ? (
        <div className="text-sm text-[var(--cockpit-ink-dim)]">Keine Termine in den nächsten 21 Tagen.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {upcoming.map((u, i) => (
            <li
              key={`${u.type}-${u.date.toISOString()}`}
              className="flex items-center gap-2.5"
            >
              <span
                className="inline-block w-1 self-stretch rounded-full"
                style={{ background: u.color, opacity: i === 0 ? 1 : 0.7 }}
                aria-hidden
              />
              <span className="flex-1 min-w-0 text-sm text-[var(--cockpit-ink)] truncate">
                {u.type}
              </span>
              <span
                className={
                  "text-sm tabular-nums shrink-0 " +
                  (u.daysFromNow <= 1
                    ? "text-[var(--system-orange)]"
                    : "text-[var(--cockpit-ink-dim)]")
                }
              >
                {formatRelative(u.daysFromNow, u.date)} ·{" "}
                {u.date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
