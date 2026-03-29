"use client";

function getBatteryGradient(percentage: number): [string, string] {
  if (percentage > 50) return ["#34d399", "#10b981"];
  if (percentage > 20) return ["#fbbf24", "#f59e0b"];
  return ["#f87171", "#ef4444"];
}

export function BatteryGauge({
  percentage,
  target,
}: {
  percentage: number | null;
  target: number | null;
}) {
  const pct = percentage ?? 0;
  const radius = 44;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const [colorStart, colorEnd] = getBatteryGradient(pct);

  return (
    <div className="relative flex-shrink-0">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <defs>
          <linearGradient id="batteryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd} />
          </linearGradient>
        </defs>
        {/* Background ring */}
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Value ring */}
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke="url(#batteryGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 52 52)"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
        {/* Target marker */}
        {target !== null && target < 100 && (
          <circle
            cx="52"
            cy="52"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={2}
            strokeDasharray={`2 ${circumference - 2}`}
            strokeDashoffset={circumference - (target / 100) * circumference}
            transform="rotate(-90 52 52)"
          />
        )}
      </svg>
    </div>
  );
}
