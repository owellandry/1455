import type { AppStateSnapshotReason } from "protocol";

import { messageBus } from "@/message-bus";

export function requestHostAppStateSnapshot(
  reason: AppStateSnapshotReason,
): void {
  if (__WINDOW_TYPE__ !== "electron" || import.meta.env.MODE === "test") {
    return;
  }
  messageBus.dispatchMessage("electron-app-state-snapshot-trigger", {
    reason,
  });
}
