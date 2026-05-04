"use client";

import { HassProvider } from "@/lib/hooks/useHass";
import { AmbientAccentMount } from "@/lib/hooks/useAmbientAccent";
import { IpadShell } from "@/components/ipad/IpadShell";

export default function IpadPage() {
  return (
    <HassProvider>
      <AmbientAccentMount />
      <IpadShell />
    </HassProvider>
  );
}
