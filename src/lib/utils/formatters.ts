export function formatPower(kw: number | null): string {
  if (kw === null) return "—";
  if (kw < 1) return `${Math.round(kw * 1000)} W`;
  return `${kw.toFixed(1)} kW`;
}

export function formatEnergy(kwh: number | null): string {
  if (kwh === null) return "—";
  if (kwh < 1) return `${Math.round(kwh * 1000)} Wh`;
  return `${kwh.toFixed(1)} kWh`;
}

export function formatCurrency(eur: number | null): string {
  if (eur === null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(eur);
}

export function formatSpotPrice(eurPerKwh: number | null): string {
  if (eurPerKwh === null) return "—";
  return `${(eurPerKwh * 100).toFixed(1)} ct/kWh`;
}

export function formatTemperature(celsius: number | null): string {
  if (celsius === null) return "—";
  return `${celsius.toFixed(1)}°C`;
}

export function formatHumidity(percent: number | null): string {
  if (percent === null) return "—";
  return `${Math.round(percent)}%`;
}

export function formatRange(km: number | null): string {
  if (km === null) return "—";
  return `${Math.round(km)} km`;
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value)}%`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export function formatArea(sqm: number | null): string {
  if (sqm === null) return "—";
  return `${sqm.toFixed(1)} m²`;
}
