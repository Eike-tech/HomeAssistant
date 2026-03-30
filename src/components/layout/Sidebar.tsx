"use client";

import { LayoutDashboard, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type Page = "dashboard" | "energie";

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "energie", label: "Energie", icon: Zap },
];

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <>
      {/* Desktop: vertical sidebar */}
      <nav className="hidden md:flex h-screen w-[60px] shrink-0 flex-col items-center gap-2 border-r border-white/[0.08] bg-white/[0.03] pt-5">
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
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onNavigate(item.id); }}
                  className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-colors ${
                    isActive
                      ? "bg-white/[0.1] text-foreground"
                      : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Mobile: bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/[0.08] bg-black/90 backdrop-blur-xl px-4 py-2 safe-area-pb">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
