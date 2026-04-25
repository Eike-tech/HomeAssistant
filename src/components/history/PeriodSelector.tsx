"use client";

import type { TimePeriod } from "@/lib/hooks/useHistoryData";

const periods: { id: TimePeriod; label: string }[] = [
  { id: "today", label: "Heute" },
  { id: "7d", label: "7 Tage" },
  { id: "30d", label: "30 Tage" },
  { id: "year", label: "Jahr" },
];

interface PeriodSelectorProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
      {periods.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            value === p.id
              ? "bg-white/[0.1] text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
