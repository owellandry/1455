import { ScopeProvider } from "maitai";
import { buildRemoteConversationRoute } from "protocol";
import { useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Navigate, useParams } from "react-router";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useTaskDetails, useTaskTurns } from "@/codex-api";
import { SearchBar } from "@/content-search/search-bar";
import { useWindowType } from "@/hooks/use-window-type";
import { useHotkeyWindowDetailLayout } from "@/hotkey-window/use-hotkey-window-detail-layout";
import {
  createThreadRouteScopeValue,
  ThreadRouteScope,
} from "@/scopes/thread-route-scope";
import { ThreadScope } from "@/scopes/thread-scope";
import { useThreadDetailLevel } from "@/settings/thread-detail-level";
import { useHostConfig } from "@/shared-objects/use-host-config";
import { useFetchFromVSCode } from "@/vscode-api";

import { RemoteConversationPageElectron } from "./remote-conversation-page-electron";
import { RemoteConversationThread } from "./remote-conversation-thread";
import {
  buildRemoteTurns,
  getDefaultFocusId,
  isTaskUserTurn,
} from "./turn-tree";

export function RemoteConversationPage({
  variant = "main",
}: {
  variant?: "hotkey" | "main";
}): React.ReactElement {
  const windowType = useWindowType();
  const { taskId } = useParams<{ taskId: string }>();
  const taskDetailsQuery = useTaskDetails(taskId ?? null);
  const taskTurnsQuery = useTaskTurns(taskId ?? null);
  const defaultAppServerManager = useDefaultAppServerManager();
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const threadDetailLevel = useThreadDetailLevel();
  const { data: codexHome } = useFetchFromVSCode("codex-home", {
    select: (data) => data.codexHome,
  });
  const taskDetails = taskDetailsQuery.data;
  const taskTurns = taskTurnsQuery.data;
  const projectShortName =
    taskDetails?.task.task_status_display?.environment_label;

  useHotkeyWindowDetailLayout(
    variant !== "hotkey" || taskId == null
      ? null
      : {
          title: (
            <div className="flex max-w-full min-w-0 items-baseline gap-2">
              <div className="min-w-0 shrink-[999] truncate text-token-foreground">
                {taskDetails?.task.title ?? (
                  <FormattedMessage
                    id="hotkeyWindow.defaultTitle"
                    defaultMessage="Codex"
                    description="Fallback title for hotkey window thread header"
                  />
                )}
              </div>
              {projectShortName != null ? (
                <div className="flex shrink-0 items-center gap-1 whitespace-nowrap text-token-description-foreground">
                  <span className="truncate">{projectShortName}</span>
                </div>
              ) : null}
            </div>
          ),
          mainWindowPath: buildRemoteConversationRoute(taskId),
        },
  );

  const turns = useMemo(
    () =>
      buildRemoteTurns({
        taskTurns,
        fallbackUserTurn: taskDetails?.current_user_turn ?? null,
        fallbackAssistantTurn: taskDetails?.current_assistant_turn ?? null,
      }),
    [
      taskTurns,
      taskDetails?.current_user_turn,
      taskDetails?.current_assistant_turn,
    ],
  );

  const selectedTurn = useMemo(() => {
    const focusedAssistantId =
      selectedTurnId ??
      taskDetails?.current_assistant_turn?.id ??
      getDefaultFocusId(turns);
    if (!focusedAssistantId) {
      return null;
    }
    const turn = turns.find((entry) => entry.id === focusedAssistantId);
    if (!turn || isTaskUserTurn(turn)) {
      return null;
    }
    return turn;
  }, [selectedTurnId, taskDetails?.current_assistant_turn?.id, turns]);
  const hostId = defaultAppServerManager.getHostId();
  const hostConfig = useHostConfig(hostId);

  if (!taskId) {
    return <Navigate to="/" />;
  }

  const pageContent =
    windowType === "extension" ? (
      <RemoteConversationThread
        key={taskId}
        taskDetailsQuery={taskDetailsQuery}
        taskTurnsQuery={taskTurnsQuery}
        turns={turns}
        selectedTurnId={selectedTurnId}
        setSelectedTurnId={setSelectedTurnId}
        selectedTurn={selectedTurn}
      />
    ) : variant === "hotkey" ? (
      <RemoteConversationThread
        key={taskId}
        taskDetailsQuery={taskDetailsQuery}
        taskTurnsQuery={taskTurnsQuery}
        turns={turns}
        selectedTurnId={selectedTurnId}
        setSelectedTurnId={setSelectedTurnId}
        selectedTurn={selectedTurn}
      />
    ) : (
      <RemoteConversationPageElectron
        key={taskId}
        taskId={taskId}
        taskDetailsQuery={taskDetailsQuery}
        taskTurnsQuery={taskTurnsQuery}
        turns={turns}
        selectedTurnId={selectedTurnId}
        setSelectedTurnId={setSelectedTurnId}
        selectedTurn={selectedTurn}
        threadDetailLevel={threadDetailLevel}
      />
    );

  return (
    <ScopeProvider
      scope={ThreadScope}
      value={{ threadId: taskId, threadType: "remote" }}
    >
      <ScopeProvider
        scope={ThreadRouteScope}
        value={createThreadRouteScopeValue({
          codexHome: codexHome ?? null,
          cwd: null,
          hostConfig,
          hostId,
        })}
      >
        <SearchBar.Surface />
        {pageContent}
      </ScopeProvider>
    </ScopeProvider>
  );
}
