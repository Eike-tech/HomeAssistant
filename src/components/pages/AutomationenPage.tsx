"use client";

import { useEffect, useState, useCallback } from "react";
import { Bot, ToggleLeft, ToggleRight, Clock, AlertCircle } from "lucide-react";
import { callService } from "home-assistant-js-websocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { useHass } from "@/lib/hooks/useHass";
import type { Connection, HassEntities } from "home-assistant-js-websocket";

interface AutomationInfo {
  entityId: string;
  name: string;
  description: string;
  enabled: boolean;
  lastTriggered: string | null;
}

function useAutomations(): { automations: AutomationInfo[]; loading: boolean } {
  const { entities } = useHass();
  const [automations, setAutomations] = useState<AutomationInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const result: AutomationInfo[] = [];
    for (const [entityId, entity] of Object.entries(entities)) {
      if (!entityId.startsWith("automation.")) continue;
      const attrs = entity.attributes as Record<string, unknown>;
      result.push({
        entityId,
        name: (attrs.friendly_name as string) ?? entityId,
        description: (attrs.description as string) ?? "",
        enabled: entity.state === "on",
        lastTriggered: (attrs.last_triggered as string) ?? null,
      });
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    setAutomations(result);
    setLoading(false);
  }, [entities]);

  return { automations, loading };
}

function formatLastTriggered(iso: string | null): string {
  if (!iso || iso === "None") return "Noch nie";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Noch nie";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "Gerade eben";
  if (diffMin < 60) return `Vor ${diffMin} Min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Vor ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Vor ${diffD} Tag${diffD !== 1 ? "en" : ""}`;
}

function AutomationTile({ automation, connection }: { automation: AutomationInfo; connection: Connection | null }) {
  const [toggling, setToggling] = useState(false);

  const toggle = useCallback(async () => {
    if (!connection || toggling) return;
    setToggling(true);
    try {
      await callService(
        connection,
        "automation",
        automation.enabled ? "turn_off" : "turn_on",
        { entity_id: automation.entityId }
      );
    } finally {
      setToggling(false);
    }
  }, [connection, automation.entityId, automation.enabled, toggling]);

  return (
    <div className="rounded-2xl bg-white/[0.04] px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Bot className={`h-4 w-4 shrink-0 ${automation.enabled ? "text-green-400" : "text-muted-foreground"}`} />
          <span className="text-sm font-medium truncate">{automation.name}</span>
        </div>
        <button
          onClick={toggle}
          disabled={toggling}
          className="shrink-0 transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {automation.enabled
            ? <ToggleRight className="h-6 w-6 text-green-400" />
            : <ToggleLeft className="h-6 w-6 text-muted-foreground" />
          }
        </button>
      </div>

      {automation.description && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {automation.description}
        </p>
      )}

      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{formatLastTriggered(automation.lastTriggered)}</span>
      </div>
    </div>
  );
}

export function AutomationenPage() {
  const { connection } = useHass();
  const { automations, loading } = useAutomations();

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-5 md:p-8">
      <Header />

      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground font-medium text-sm">
            Automationen
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">
            {automations.filter((a) => a.enabled).length} von {automations.length} aktiv
          </span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.06]" />
              ))}
            </div>
          ) : automations.length > 0 ? (
            <div className="space-y-3">
              {automations.map((a) => (
                <AutomationTile key={a.entityId} automation={a} connection={connection} />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Keine Automationen gefunden
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
