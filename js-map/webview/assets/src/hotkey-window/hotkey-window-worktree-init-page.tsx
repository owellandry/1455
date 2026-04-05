import {
  buildHotkeyWindowThreadRoute,
  buildWorktreeInitRoute,
  getHotkeyWindowNewConversationRoute,
} from "protocol";
import type React from "react";
import { FormattedMessage } from "react-intl";
import { Navigate, useParams } from "react-router";

import { messageBus } from "@/message-bus";
import { useFetchFromVSCode } from "@/vscode-api";
import { WorktreeInitPage } from "@/worktrees-v2/worktree-init-v2-page";

import { useHotkeyWindowDetailLayout } from "./use-hotkey-window-detail-layout";

export function HotkeyWindowWorktreeInitPage(): React.ReactElement {
  const { pendingWorktreeId } = useParams<{ pendingWorktreeId: string }>();
  const { data: hotkeyWindowState } = useFetchFromVSCode(
    "hotkey-window-hotkey-state",
  );
  const shouldUseHotkeyHomeRoute =
    hotkeyWindowState == null || hotkeyWindowState.configuredHotkey != null;
  const hotkeyWindowHomeRoute = getHotkeyWindowNewConversationRoute(
    shouldUseHotkeyHomeRoute,
  );

  useHotkeyWindowDetailLayout(
    pendingWorktreeId == null
      ? null
      : {
          title: (
            <span className="max-w-full truncate">
              <FormattedMessage
                id="worktreeInitV2.title"
                defaultMessage="Creating worktree"
                description="Title for the worktree init v2 page"
              />
            </span>
          ),
          mainWindowPath: buildWorktreeInitRoute(pendingWorktreeId),
        },
  );

  if (!pendingWorktreeId) {
    return <Navigate to={hotkeyWindowHomeRoute} replace />;
  }

  return (
    <WorktreeInitPage
      header={null}
      homePath={hotkeyWindowHomeRoute}
      conversationPathBuilder={buildHotkeyWindowThreadRoute}
      onConversationReady={(conversationId) => {
        messageBus.dispatchMessage("open-in-hotkey-window", {
          path: buildHotkeyWindowThreadRoute(conversationId),
        });
      }}
    />
  );
}
