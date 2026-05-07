"use client";

import { LayoutDashboard, Zap, History, Bot, Home } from "lucide-react";
import { useHass } from "@/lib/hooks/useHass";

export type Page = "dashboard" | "energie" | "auswertung" | "automationen";

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "energie", label: "Energie", icon: Zap },
  { id: "auswertung", label: "Auswertung", icon: History },
  { id: "automationen", label: "Automationen", icon: Bot },
];

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

function ConnectionPill() {
  const { connectionState } = useHass();
  const ok = connectionState === "connected";
  const tone = ok
    ? "var(--system-green)"
    : connectionState === "connecting"
      ? "var(--system-yellow)"
      : "var(--system-red)";
  const label = ok ? "Verbunden" : connectionState === "connecting" ? "Verbinde …" : "Getrennt";
  return (
    <div
      className="rounded-xl p-3 text-[11px]"
      style={{ background: "var(--surface-1)", border: "1px solid var(--cockpit-edge-soft)", color: "var(--cockpit-ink-dim)" }}
    >
      <div className="mb-0.5 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
        <span style={{ color: tone, fontWeight: 500 }}>{label}</span>
      </div>
      <div className="text-[10px]" style={{ color: "var(--cockpit-ink-faint)" }}>
        homeassistant.local
      </div>
    </div>
  );
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <>
      {/* Desktop: fixed-width vertical sidebar with labels */}
      <aside
        className="hidden md:flex sticky top-0 h-screen w-[220px] shrink-0 flex-col gap-1 px-4 py-6"
        style={{
          background: "var(--cockpit-canvas-soft)",
          borderRight: "1px solid var(--cockpit-edge-soft)",
        }}
      >
        <div className="mb-4 flex items-center gap-2.5 px-2">
          <div
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ background: "var(--cockpit-ink)", color: "var(--cockpit-canvas-soft)" }}
          >
            <Home className="h-4 w-4" strokeWidth={2} />
          </div>
          <div>
            <div className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--cockpit-ink)" }}>
              Eikenhof
            </div>
            <div className="text-[11px]" style={{ color: "var(--cockpit-ink-dim)" }}>
              Smart Home
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? "page" : undefined}
                className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] transition-colors"
                style={
                  isActive
                    ? {
                        background: "var(--surface-1)",
                        border: "1px solid var(--cockpit-edge-soft)",
                        color: "var(--cockpit-ink)",
                        fontWeight: 500,
                      }
                    : {
                        background: "transparent",
                        border: "1px solid transparent",
                        color: "var(--cockpit-ink-dim)",
                      }
                }
              >
                <Icon className="h-4 w-4" strokeWidth={isActive ? 2.1 : 1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex-1" />
        <ConnectionPill />
      </aside>

      {/* Mobile: bottom tab bar (unchanged glass, force-dark gradient stays for mobile glass aesthetic) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-4 pt-2 pb-[max(env(safe-area-inset-bottom),_0.5rem)]"
        style={{
          background: "var(--cockpit-canvas-soft)",
          borderTop: "1px solid var(--cockpit-edge-soft)",
        }}
      >
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 transition-colors"
              style={{ color: isActive ? "var(--cockpit-ink)" : "var(--cockpit-ink-dim)" }}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.9} />
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
