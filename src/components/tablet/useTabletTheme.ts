"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { interpolateAccent, formatOkLch } from "@/lib/utils/cockpitColor";

export type ThemePref = "auto" | "tag" | "nacht";
export type ThemeMode = "tag" | "nacht";

const STORAGE_KEY = "tablet-theme";
const ORDER: ThemePref[] = ["auto", "tag", "nacht"];
const TESLA = { l: 0.65, c: 0.22, h: 25 };

export interface TabletTheme {
  pref: ThemePref;
  mode: ThemeMode;
  cyclePref: () => void;
  charging: boolean;
  quantile: number | null;
  /** CSS custom properties to put on the shell root. */
  vars: Record<string, string>;
}

/**
 * Nacht/Tag + live accent for the tablet cockpit.
 * - mode "auto" follows sun.sun (above_horizon → Tag), falls back to 07–19 h.
 * - accent follows the EPEX spot quantile; Tesla charging overrides it with Tesla red.
 */
export function useTabletTheme(): TabletTheme {
  const { entities } = useHass();
  const [pref, setPref] = useState<ThemePref>("auto");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemePref | null;
      if (saved && ORDER.includes(saved)) setPref(saved);
    } catch {
      // storage unavailable — stay on auto
    }
  }, []);

  const cyclePref = useCallback(() => {
    setPref((p) => {
      const next = ORDER[(ORDER.indexOf(p) + 1) % ORDER.length];
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const sunState = entities[ENTITIES.general.sun]?.state;
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);

  const autoMode: ThemeMode =
    sunState === "above_horizon"
      ? "tag"
      : sunState === "below_horizon"
        ? "nacht"
        : hour >= 7 && hour < 19
          ? "tag"
          : "nacht";
  const mode: ThemeMode = pref === "auto" ? autoMode : pref;

  const charging = entities[ENTITIES.car.chargingBinary]?.state === "on";
  const qRaw = parseFloat(entities[ENTITIES.energy.spotQuantile]?.state ?? "");
  const quantile = Number.isFinite(qRaw) ? Math.max(0, Math.min(1, qRaw)) : null;

  const vars = useMemo(() => {
    const base = charging ? TESLA : quantile !== null ? interpolateAccent(quantile) : { l: 0.7, c: 0.15, h: 220 };
    const text = mode === "tag" ? { ...base, l: 0.48 } : base;
    return {
      "--t-accent": formatOkLch(base),
      "--t-accent-text": formatOkLch(text),
      "--t-accent-glow": formatOkLch(base, mode === "tag" ? 0.2 : 0.26),
      "--t-accent-soft": formatOkLch(base, 0.14),
      "--t-tesla-text": mode === "tag" ? "oklch(0.52 0.2 25)" : "oklch(0.72 0.19 25)",
    };
  }, [charging, quantile, mode]);

  return { pref, mode, cyclePref, charging, quantile, vars };
}
