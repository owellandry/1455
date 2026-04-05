import { useEffect } from "react";

import { messageBus } from "@/message-bus";

import { useGate } from "./statsig";

export function UseHeartbeatAutomationsEnabledGate(): null {
  const enabled = useGate(__statsigName("codex-app-automation-heartbeat"));

  useEffect(() => {
    messageBus.dispatchMessage("heartbeat-automations-enabled-changed", {
      enabled,
    });
  }, [enabled]);

  return null;
}
