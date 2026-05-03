export type OkLch = { l: number; c: number; h: number };

/** 5-stop ramp from cheap (cool cyan) to expensive (warm coral) — matches the
 * ambient-accent mapping defined in docs/design/ambient-cockpit-spec.md §2.2. */
export const QUANTILE_STOPS: Array<{ q: number } & OkLch> = [
  { q: 0.0,  l: 0.78, c: 0.16, h: 195 },
  { q: 0.25, l: 0.74, c: 0.14, h: 175 },
  { q: 0.5,  l: 0.70, c: 0.10, h: 145 },
  { q: 0.75, l: 0.72, c: 0.16, h: 65 },
  { q: 1.0,  l: 0.68, c: 0.20, h: 40 },
];

export function interpolateAccent(quantile: number): OkLch {
  const q = Math.max(0, Math.min(1, quantile));
  for (let i = 0; i < QUANTILE_STOPS.length - 1; i++) {
    const a = QUANTILE_STOPS[i];
    const b = QUANTILE_STOPS[i + 1];
    if (q <= b.q) {
      const t = (q - a.q) / (b.q - a.q);
      return {
        l: a.l + (b.l - a.l) * t,
        c: a.c + (b.c - a.c) * t,
        h: a.h + (b.h - a.h) * t,
      };
    }
  }
  return QUANTILE_STOPS[QUANTILE_STOPS.length - 1];
}

export function formatOkLch(color: OkLch, alpha?: number): string {
  const l = color.l.toFixed(3);
  const c = color.c.toFixed(3);
  const h = color.h.toFixed(1);
  return alpha === undefined
    ? `oklch(${l} ${c} ${h})`
    : `oklch(${l} ${c} ${h} / ${alpha})`;
}
