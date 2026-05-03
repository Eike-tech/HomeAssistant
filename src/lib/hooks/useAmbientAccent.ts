"use client";

import { useEffect } from "react";
import { useHass } from "@/lib/hooks/useHass";
import { ENTITIES } from "@/lib/hass/entities";
import { interpolateAccent, formatOkLch } from "@/lib/utils/cockpitColor";

function parseQuantile(state: string | undefined): number | null {
  if (!state) return null;
  if (state === "unknown" || state === "unavailable") return null;
  const n = Number(state);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Sets `--accent-live` / `--accent-live-glow` on <html> based on the live
 * spot-price quantile, and toggles `body.is-charging` while the Tesla charges.
 * While charging the accent is overridden with the static Tesla-red signal.
 */
export function useAmbientAccent() {
  const { entities } = useHass();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const charging =
      entities[ENTITIES.car.chargingBinary]?.state === "on";

    const root = document.documentElement;
    const body = document.body;

    if (charging) {
      body.classList.add("is-charging");
      root.style.setProperty("--accent-live", "oklch(0.65 0.22 25)");
      root.style.setProperty("--accent-live-glow", "oklch(0.65 0.22 25 / 0.35)");
      return;
    }

    body.classList.remove("is-charging");

    const quantile = parseQuantile(entities[ENTITIES.energy.spotQuantile]?.state);
    if (quantile === null) return; // keep previous value (or :root fallback)

    const accent = interpolateAccent(quantile);
    root.style.setProperty("--accent-live", formatOkLch(accent));
    root.style.setProperty("--accent-live-glow", formatOkLch(accent, 0.30));
  }, [entities]);
}

/** Mount-only component — call inside <HassProvider>. Renders nothing. */
export function AmbientAccentMount() {
  useAmbientAccent();
  return null;
}
