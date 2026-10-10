"use client";

import { useEffect, useState } from "react";
import { HassProvider } from "@/lib/hooks/useHass";
import { TabletShell } from "@/components/tablet/TabletShell";

export default function TabletPage() {
  // Client-only: theme (sun/clock) and clock text differ between server and
  // device, so we skip SSR markup instead of risking hydration mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ position: "fixed", inset: 0, background: "#05080d" }} />;

  return (
    <HassProvider>
      <TabletShell />
    </HassProvider>
  );
}
