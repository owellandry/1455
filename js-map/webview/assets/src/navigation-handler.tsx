import { useScope } from "maitai";
import { createConversationId, GlobalStateKey } from "protocol";
import { useEffect, useEffectEvent, useRef } from "react";
import { useMatch, useNavigate } from "react-router";

import { useLocalConversationSelector } from "@/app-server/app-server-manager-hooks";
import { useGlobalState } from "@/hooks/use-global-state";
import { productEventLogger$ } from "@/product-event-signal";
import type { ProductEventPayload } from "@/product-events";
import { AppScope } from "@/scopes/app-scope";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";

import {
  isCompactWindowContextFromWindow,
  isCompactWindowRoutePath,
} from "./compact-window/is-compact-window-context";
import { useMessage } from "./message-bus";

export function NavigationHandler(): null {
  const navigate = useNavigate();
  const isCompactWindow = isCompactWindowContextFromWindow();
  const scope = useScope(AppScope);
  const { setData: setSelectedRemoteProjectId } = useGlobalState(
    GlobalStateKey.ACTIVE_REMOTE_PROJECT_ID,
  );
  const logProductEventEvent = useEffectEvent(
    (payload: ProductEventPayload) => {
      scope.get(productEventLogger$).log(payload);
    },
  );
  // Dedupe so we only log another event if the thread changes (e.g. avoid remount/StrictMode duplicates).
  const lastThreadKeyRef = useRef<string | null>(null);
  const localMatch = useMatch("/local/:conversationId");
  const hotkeyWindowMatch = useMatch("/hotkey-window/thread/:conversationId");
  const remoteMatch = useMatch("/remote/:taskId");
  const hotkeyRemoteMatch = useMatch("/hotkey-window/remote/:taskId");
  const pendingMatch = useMatch("/worktree-init-v2/:pendingWorktreeId");
  const hotkeyPendingMatch = useMatch(
    "/hotkey-window/worktree-init-v2/:pendingWorktreeId",
  );
  const localConversationId =
    localMatch?.params.conversationId ??
    hotkeyWindowMatch?.params.conversationId ??
    null;
  const localConversationHostId = useLocalConversationSelector(
    localConversationId == null
      ? null
      : createConversationId(localConversationId),
    (conversation) => conversation?.hostId,
  );
  const remoteConversationId =
    remoteMatch?.params.taskId ?? hotkeyRemoteMatch?.params.taskId ?? null;
  const pendingWorktreeId =
    pendingMatch?.params.pendingWorktreeId ??
    hotkeyPendingMatch?.params.pendingWorktreeId ??
    null;

  useEffect(() => {
    if (
      localConversationId == null ||
      localConversationHostId !== DEFAULT_HOST_ID
    ) {
      return;
    }

    void setSelectedRemoteProjectId(undefined);
  }, [
    localConversationHostId,
    localConversationId,
    setSelectedRemoteProjectId,
  ]);

  useEffect(() => {
    let kind: "local" | "remote" | "pending_worktree" | null = null;
    let key: string | null = null;
    if (localConversationId != null) {
      kind = "local";
      key = `local:${localConversationId}`;
    } else if (remoteConversationId != null) {
      kind = "remote";
      key = `remote:${remoteConversationId}`;
    } else if (pendingWorktreeId != null) {
      kind = "pending_worktree";
      key = `pending_worktree:${pendingWorktreeId}`;
    }

    if (key == null || kind == null) {
      lastThreadKeyRef.current = null;
      return;
    }
    if (lastThreadKeyRef.current === key) {
      return;
    }
    lastThreadKeyRef.current = key;
    logProductEventEvent({
      eventName: "codex_thread_opened",
      metadata: { kind },
    });
  }, [localConversationId, pendingWorktreeId, remoteConversationId]);

  useMessage("navigate-to-route", (message) => {
    if (isCompactWindow && !isCompactWindowRoutePath(message.path)) {
      return;
    }
    void navigate(message.path, { state: message.state });
  });
  useMessage("navigate-back", () => {
    if (isCompactWindow) {
      return;
    }
    void navigate(-1);
  });
  useMessage("navigate-forward", () => {
    if (isCompactWindow) {
      return;
    }
    void navigate(1);
  });

  return null;
}
