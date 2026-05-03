"use client";

import { useEffect, useRef } from "react";
import { useEnergyFlow } from "@/lib/hooks/useEnergyFlow";

type Particle = {
  sinkIdx: number;
  t: number;        // 0..1 progress along the path
  speed: number;    // 1/sec rate of t
  size: number;     // px
  alpha: number;    // 0..1 base alpha
};

const IDLE_COLOR = "oklch(0.45 0.02 220)";   // matches --signal-idle
const IDLE_THRESHOLD_W = 50;
const MAX_SINKS = 8;
const LABEL_STRIP_PX = 96;

export function ParticleFlow() {
  const flow = useEnergyFlow();
  const flowRef = useRef(flow);
  flowRef.current = flow;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let accentColor = "oklch(0.74 0.14 175)"; // fallback while we read
    let lastAccentRead = 0;
    const readAccent = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--accent-live").trim();
      if (v) accentColor = v;
    };
    readAccent();

    const particles: Particle[] = [];
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const easeInOut = (t: number) => t * t * (3 - 2 * t);

    let lastTime = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (now - lastAccentRead > 1000) {
        readAccent();
        lastAccentRead = now;
      }

      const f = flowRef.current;
      const totalW = f.totalPower;
      const idle = totalW < IDLE_THRESHOLD_W;
      const rooms = f.rooms.slice(0, MAX_SINKS);

      const srcX = Math.max(36, width * 0.08);
      const srcY = height / 2;
      const srcR = Math.max(5, Math.min(28, Math.sqrt(Math.max(1, totalW)) * 1.2));

      const sinkX = Math.max(width * 0.6, width - LABEL_STRIP_PX - 8);
      const sinks = rooms.map((r, i) => {
        const yT = rooms.length === 1 ? 0.5 : i / (rooms.length - 1);
        return {
          x: sinkX,
          y: lerp(height * 0.18, height * 0.82, yT),
          r: Math.max(3, Math.min(18, Math.sqrt(Math.max(1, r.totalPower)) * 1.4)),
          power: r.totalPower,
        };
      });

      // Spawn — weighted by sink share
      if (!idle && sinks.length > 0) {
        const spawnRate = Math.max(0.5, Math.min(8, totalW / 60));
        const spawnTarget = spawnRate * dt * 60;
        let spawnCount = Math.floor(spawnTarget);
        if (Math.random() < spawnTarget - spawnCount) spawnCount += 1;
        const totalSinkPower = sinks.reduce((s, x) => s + x.power, 0) || 1;
        for (let i = 0; i < spawnCount; i++) {
          let r = Math.random() * totalSinkPower;
          let idx = 0;
          for (let s = 0; s < sinks.length; s++) {
            r -= sinks[s].power;
            if (r <= 0) {
              idx = s;
              break;
            }
          }
          particles.push({
            sinkIdx: idx,
            t: 0,
            speed: 0.45 + Math.random() * 0.4,
            size: 1.5 + Math.random() * 1.5,
            alpha: 0.7 + Math.random() * 0.3,
          });
        }
      }

      ctx.clearRect(0, 0, width, height);

      // Connection lines (subtle)
      if (!idle && sinks.length > 0) {
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1;
        for (const sink of sinks) {
          ctx.beginPath();
          ctx.moveTo(srcX, srcY);
          ctx.lineTo(sink.x, sink.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Source — outer halo + inner core
      const sourceColor = idle ? IDLE_COLOR : accentColor;
      ctx.save();
      ctx.fillStyle = sourceColor;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(srcX, srcY, srcR * 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(srcX, srcY, srcR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Sinks
      for (const sink of sinks) {
        ctx.save();
        ctx.fillStyle = idle ? IDLE_COLOR : accentColor;
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.arc(sink.x, sink.y, sink.r * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(sink.x, sink.y, sink.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Particles
      ctx.save();
      ctx.fillStyle = accentColor;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.t += dt * p.speed;
        if (p.t >= 1 || p.sinkIdx >= sinks.length) {
          particles.splice(i, 1);
          continue;
        }
        const sink = sinks[p.sinkIdx];
        const e = easeInOut(p.t);
        // Quadratic-ish curve via slight midpoint offset toward sink Y
        const midX = (srcX + sink.x) / 2;
        const midY = (srcY + sink.y) / 2;
        const x = (1 - e) * (1 - e) * srcX + 2 * (1 - e) * e * midX + e * e * sink.x;
        const y = (1 - e) * (1 - e) * srcY + 2 * (1 - e) * e * midY + e * e * sink.y;
        const fadeIn = p.t < 0.12 ? p.t / 0.12 : 1;
        const fadeOut = p.t > 0.85 ? (1 - p.t) / 0.15 : 1;
        ctx.globalAlpha = p.alpha * fadeIn * fadeOut;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // Sink labels (DOM overlay, right-aligned strip)
  const visibleRooms = flow.rooms.slice(0, MAX_SINKS);
  const labelPos = visibleRooms.map((_, i) => {
    const yT = visibleRooms.length === 1 ? 0.5 : i / (visibleRooms.length - 1);
    return 18 + (82 - 18) * yT;
  });
  const idle = flow.totalPower < IDLE_THRESHOLD_W;
  const totalLabel =
    flow.totalPower < 1000
      ? `${Math.round(flow.totalPower)} W`
      : `${(flow.totalPower / 1000).toFixed(1).replace(".", ",")} kW`;

  return (
    <section
      className="relative overflow-hidden"
      style={{
        padding: "var(--cockpit-pad-zone)",
        borderRadius: "var(--cockpit-radius-zone)",
        background: `
          radial-gradient(120% 100% at 50% 0%, var(--accent-live-glow), transparent 60%),
          var(--cockpit-canvas-soft)
        `,
        boxShadow: "inset 0 1px 0 0 var(--cockpit-edge-soft)",
        transition: "background var(--motion-slow) var(--ease-out)",
      }}
    >
      <div className="mb-3 flex items-center justify-between md:mb-4">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.08em]"
          style={{ color: "var(--cockpit-ink-dim)" }}
        >
          Energiefluss
        </span>
        <span
          className="font-mono text-sm tabular-nums"
          style={{ color: idle ? "var(--cockpit-ink-faint)" : "var(--cockpit-ink)" }}
        >
          {totalLabel}
        </span>
      </div>

      <div ref={containerRef} className="relative h-[200px] w-full md:h-[260px]">
        <canvas ref={canvasRef} className="absolute inset-0" />

        {visibleRooms.length === 0 ? (
          <div
            className="absolute inset-0 flex items-center justify-center text-sm"
            style={{ color: "var(--cockpit-ink-faint)" }}
          >
            {idle ? "Haus ruht" : "Keine aktiven Räume"}
          </div>
        ) : (
          visibleRooms.map((room, i) => (
            <div
              key={room.id}
              className="pointer-events-none absolute -translate-y-1/2 text-right text-[10px] tabular-nums"
              style={{
                right: 8,
                top: `${labelPos[i]}%`,
                width: LABEL_STRIP_PX - 16,
                color: "var(--cockpit-ink-dim)",
              }}
            >
              <div className="truncate" style={{ color: "var(--cockpit-ink)" }}>
                {room.label}
              </div>
              <div className="font-mono">{Math.round(room.totalPower)} W</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
