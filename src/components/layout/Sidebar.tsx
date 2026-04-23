"use client";

import { LayoutDashboard, Zap, History, Bot } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type Page = "dashboard" | "energie" | "verlauf" | "automationen";

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "energie", label: "Energie", icon: Zap },
  { id: "verlauf", label: "Verlauf", icon: History },
  { id: "automationen", label: "Automationen", icon: Bot },
];

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <>
      {/* Desktop: vertical sidebar */}
      <nav
        className="hidden md:flex sticky top-0 h-screen w-[72px] shrink-0 flex-col items-center gap-1.5 pt-6"
        style={{
          background:
            "linear-gradient(180deg, oklch(1 0 0 / 0.03), oklch(1 0 0 / 0.01))",
          boxShadow:
            "inset -1px 0 0 0 oklch(1 0 0 / 0.06), inset 1px 0 0 0 oklch(1 0 0 / 0.02)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigate(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onNavigate(item.id);
                  }}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-[14px] transition-all duration-200 ease-out ${
                    isActive
                      ? "text-foreground scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                  }`}
                  style={
                    isActive
                      ? {
                          background:
                            "linear-gradient(180deg, oklch(1 0 0 / 0.14), oklch(1 0 0 / 0.07))",
                          boxShadow:
                            "inset 0 1px 0 0 oklch(1 0 0 / 0.12), 0 1px 2px oklch(0 0 0 / 0.35), 0 0 0 1px oklch(1 0 0 / 0.04)",
                        }
                      : undefined
                  }
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.9} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Mobile: bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-4 pt-2 pb-[max(env(safe-area-inset-bottom),_0.5rem)]"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.14 0.004 260 / 0.7), oklch(0.1 0.004 260 / 0.92))",
          boxShadow: "inset 0 1px 0 0 oklch(1 0 0 / 0.06)",
          backdropFilter: "blur(28px) saturate(160%)",
          WebkitBackdropFilter: "blur(28px) saturate(160%)",
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
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.9} />
              <span className="text-[10px] font-medium tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
