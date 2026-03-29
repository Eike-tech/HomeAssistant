import { callService, Connection } from "home-assistant-js-websocket";

export function toggleLight(connection: Connection, entityId: string) {
  return callService(connection, "light", "toggle", { entity_id: entityId });
}

export function turnOnLight(connection: Connection, entityId: string, brightness?: number) {
  const data: Record<string, unknown> = { entity_id: entityId };
  if (brightness !== undefined) {
    data.brightness = Math.round((brightness / 100) * 255);
  }
  return callService(connection, "light", "turn_on", data);
}

export function turnOffLight(connection: Connection, entityId: string) {
  return callService(connection, "light", "turn_off", { entity_id: entityId });
}

export function activateScene(connection: Connection, entityId: string) {
  return callService(connection, "scene", "turn_on", { entity_id: entityId });
}

export function setClimateTemp(connection: Connection, entityId: string, temperature: number) {
  return callService(connection, "climate", "set_temperature", {
    entity_id: entityId,
    temperature,
  });
}

export function lockEntity(connection: Connection, entityId: string) {
  return callService(connection, "lock", "lock", { entity_id: entityId });
}

export function unlockEntity(connection: Connection, entityId: string) {
  return callService(connection, "lock", "unlock", { entity_id: entityId });
}

export function openCover(connection: Connection, entityId: string) {
  return callService(connection, "cover", "open_cover", { entity_id: entityId });
}

export function closeCover(connection: Connection, entityId: string) {
  return callService(connection, "cover", "close_cover", { entity_id: entityId });
}

export function setCoverPosition(connection: Connection, entityId: string, position: number) {
  return callService(connection, "cover", "set_cover_position", {
    entity_id: entityId,
    position,
  });
}

export function startVacuum(connection: Connection, entityId: string) {
  return callService(connection, "vacuum", "start", { entity_id: entityId });
}

export function stopVacuum(connection: Connection, entityId: string) {
  return callService(connection, "vacuum", "stop", { entity_id: entityId });
}

export function returnVacuumToDock(connection: Connection, entityId: string) {
  return callService(connection, "vacuum", "return_to_base", { entity_id: entityId });
}

export function mediaPlayPause(connection: Connection, entityId: string) {
  return callService(connection, "media_player", "media_play_pause", {
    entity_id: entityId,
  });
}

export function mediaNext(connection: Connection, entityId: string) {
  return callService(connection, "media_player", "media_next_track", {
    entity_id: entityId,
  });
}

export function mediaPrevious(connection: Connection, entityId: string) {
  return callService(connection, "media_player", "media_previous_track", {
    entity_id: entityId,
  });
}

export function setMediaVolume(connection: Connection, entityId: string, volume: number) {
  return callService(connection, "media_player", "volume_set", {
    entity_id: entityId,
    volume_level: volume,
  });
}
