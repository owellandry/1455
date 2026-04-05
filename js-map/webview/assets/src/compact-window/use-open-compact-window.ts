import {
  buildHotkeyWindowThreadRoute,
  type HotkeyWindowHotkeyState,
  type ConversationId,
  getHotkeyWindowNewConversationRoute,
} from "protocol";
import { defineMessage } from "react-intl";

import { useIsRemoteHost } from "@/hooks/use-is-remote-host";
import { useWindowType } from "@/hooks/use-window-type";
import { messageBus } from "@/message-bus";
import { useGate } from "@/statsig/statsig";
import { useFetchFromVSCode } from "@/vscode-api";

export type CompactWindowAction =
  | { kind: "hidden" }
  | { kind: "open-hotkey-window" }
  | { kind: "local-only" };

export const compactWindowActionMessages = {
  "open-hotkey-window": defineMessage({
    id: "threadPage.openInHotkeyWindow",
    defaultMessage: "Open in Popout Window",
    description:
      "Button label for opening the current view in the hotkey window",
  }),
  "local-only": defineMessage({
    id: "threadPage.hotkeyWindowLocalOnly",
    defaultMessage: "Popout Window is only available when working locally",
    description:
      "Tooltip for the compact window button when the hotkey window is unavailable on remote hosts",
  }),
} as const;

export function useOpenCompactWindow({
  conversationId,
  prefillCwd,
}: {
  conversationId: ConversationId | null;
  prefillCwd?: string | null;
}): {
  compactWindowAction: CompactWindowAction;
  hasConfiguredHotkey: boolean;
  openCompactWindow: () => void;
} {
  const isRemoteHost = useIsRemoteHost();
  const isHotkeyWindowSupported = useGate(
    __statsigName("codex-app-hotkey-window-enabled"),
  );
  const windowType = useWindowType();
  const { data: hotkeyWindowState } = useFetchFromVSCode(
    "hotkey-window-hotkey-state",
    {
      queryConfig: {
        enabled: windowType === "electron",
      },
    },
  );
  const compactWindowAction = getCompactWindowAction({
    hotkeyWindowState,
    isHotkeyWindowSupported,
    isRemoteHost,
    windowType,
  });
  const hasConfiguredHotkey = hotkeyWindowState?.configuredHotkey != null;
  const shouldUseHotkeyHomeRoute =
    hotkeyWindowState == null || hasConfiguredHotkey;
  const newConversationRoute = getHotkeyWindowNewConversationRoute(
    shouldUseHotkeyHomeRoute,
  );

  const openCompactWindow = (): void => {
    if (windowType !== "electron") {
      return;
    }
    switch (compactWindowAction.kind) {
      case "open-hotkey-window":
        if (conversationId != null) {
          messageBus.dispatchMessage("open-in-hotkey-window", {
            path: buildHotkeyWindowThreadRoute(conversationId),
          });
          return;
        }
        messageBus.dispatchMessage("open-in-hotkey-window", {
          path: newConversationRoute,
          prefillCwd,
        });
        return;
      case "hidden":
      case "local-only":
        return;
    }
  };

  return {
    compactWindowAction,
    hasConfiguredHotkey,
    openCompactWindow,
  };
}

function getCompactWindowAction({
  hotkeyWindowState,
  isHotkeyWindowSupported,
  isRemoteHost,
  windowType,
}: {
  hotkeyWindowState: HotkeyWindowHotkeyState | undefined;
  isHotkeyWindowSupported: boolean;
  isRemoteHost: boolean;
  windowType: ReturnType<typeof useWindowType>;
}): CompactWindowAction {
  if (windowType !== "electron") {
    return { kind: "hidden" };
  }

  if (isHotkeyWindowSupported) {
    if (hotkeyWindowState == null || hotkeyWindowState.supported === false) {
      return { kind: "hidden" };
    }
    if (isRemoteHost) {
      return { kind: "local-only" };
    }
    return { kind: "open-hotkey-window" };
  }

  return { kind: "hidden" };
}
