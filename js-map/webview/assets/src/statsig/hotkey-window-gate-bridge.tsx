import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { messageBus } from "@/message-bus";
import { getQueryKey } from "@/vscode-api";

import { useGate } from "./statsig";

export function UseHotkeyWindowEnabledGate(): null {
  const enabled = useGate(__statsigName("codex-app-hotkey-window-enabled"));
  const queryClient = useQueryClient();

  useEffect(() => {
    messageBus.dispatchMessage("hotkey-window-enabled-changed", { enabled });
    void queryClient.invalidateQueries({
      queryKey: getQueryKey("hotkey-window-hotkey-state"),
    });
  }, [enabled, queryClient]);

  return null;
}
