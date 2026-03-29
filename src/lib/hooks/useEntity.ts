"use client";

import { useMemo } from "react";
import { HassEntity } from "home-assistant-js-websocket";
import { useHass } from "./useHass";

export function useEntity(entityId: string): HassEntity | null {
  const { entities } = useHass();
  return entities[entityId] ?? null;
}

export function useEntities(entityIds: string[]): (HassEntity | null)[] {
  const { entities } = useHass();
  return useMemo(
    () => entityIds.map((id) => entities[id] ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entities, ...entityIds]
  );
}

export function useEntityState(entityId: string): string | null {
  const entity = useEntity(entityId);
  return entity?.state ?? null;
}

export function useEntityNumericState(entityId: string): number | null {
  const entity = useEntity(entityId);
  if (!entity) return null;
  const num = parseFloat(entity.state);
  return isNaN(num) ? null : num;
}

export function useEntityAttribute<T = unknown>(
  entityId: string,
  attribute: string
): T | null {
  const entity = useEntity(entityId);
  return (entity?.attributes?.[attribute] as T) ?? null;
}
