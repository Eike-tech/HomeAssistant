"use client";

import { useRecordedHistory } from "@/lib/hooks/useRecordedHistory";

/**
 * Invisible component that records daily consumption & cost values
 * to localStorage. Mount once at the app root (inside HassProvider)
 * so data is captured regardless of which page is active.
 */
export function DailyRecorder() {
  useRecordedHistory();
  return null;
}
