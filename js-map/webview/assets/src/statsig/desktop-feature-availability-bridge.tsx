import { useEffect } from "react";

import { messageBus } from "@/message-bus";

import { useGate } from "./statsig";

export function UseDesktopFeatureAvailabilityBridge(): null {
  const artifactsPane = useGate(__statsigName("codex-app-artifacts-pane"));
  const multiWindow = useGate(__statsigName("codex_rollout_multi_window"));

  useEffect(() => {
    messageBus.dispatchMessage("electron-desktop-features-changed", {
      artifactsPane,
      multiWindow,
    });
  }, [artifactsPane, multiWindow]);

  return null;
}
