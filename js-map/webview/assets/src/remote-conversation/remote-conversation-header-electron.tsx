import type { UseQueryResult } from "@tanstack/react-query";
import {
  CODEX_HOME_URL,
  type CodeTaskDetailsResponse,
  type PRItemOutput,
  type TaskAssistantTurn,
} from "protocol";
import { useMemo } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import { TaskDiffStats } from "@/diff-stats";
import ArrowTopRightIcon from "@/icons/arrow-top-right.svg";
import { messageBus } from "@/message-bus";
import { ThreadPageHeader } from "@/thread-layout/thread-page-header";

import { ApplyRemoteDiffButton } from "./apply-remote-diff-button";
import { RemotePrButton } from "./remote-pr-button";
import { RemoteThreadOverflowMenu } from "./thread-overflow-menu";
import type { RemoteConversationTurn } from "./turn-tree";

export function RemoteConversationHeaderElectron({
  taskDetailsQuery,
  isDiffPanelOpen,
  onToggleDiffPanel,
  hasDiffPanel,
  turns,
  selectedTurn,
}: {
  taskDetailsQuery: UseQueryResult<CodeTaskDetailsResponse, Error>;
  isDiffPanelOpen: boolean;
  onToggleDiffPanel: () => void;
  hasDiffPanel: boolean;
  turns: Array<RemoteConversationTurn>;
  selectedTurn: TaskAssistantTurn | null;
}): React.ReactElement {
  const taskDetails = taskDetailsQuery.data;
  const taskId = taskDetails?.task.id;
  const diffTaskTurn = taskDetails?.current_diff_task_turn;
  const pullRequests = taskDetails?.task.external_pull_requests ?? [];
  const pr = useMemo<PRItemOutput | null>(() => {
    if (selectedTurn) {
      const fromSelected = selectedTurn.output_items?.find(
        (item): item is PRItemOutput => item.type === "pr",
      );
      if (fromSelected) {
        return fromSelected;
      }
    }
    if (diffTaskTurn) {
      const fromDiffTurn = diffTaskTurn.output_items?.find(
        (item): item is PRItemOutput => item.type === "pr",
      );
      if (fromDiffTurn) {
        return fromDiffTurn;
      }
    }
    return null;
  }, [diffTaskTurn, selectedTurn]);
  const unifiedDiff = pr?.output_diff?.diff ?? null;
  const applyTurnId = selectedTurn?.id ?? diffTaskTurn?.id ?? null;
  const taskEnvironment = taskDetails?.current_assistant_turn?.environment;
  const diffStats =
    taskDetails?.task.task_status_display?.latest_turn_status_display
      ?.diff_stats ?? null;
  const additions = diffStats?.lines_added ?? 0;
  const deletions = diffStats?.lines_removed ?? 0;
  return (
    <ThreadPageHeader
      start={taskDetails?.task.title ?? null}
      showHost
      startActions={
        <RemoteThreadOverflowMenu conversationId={taskId ?? null} />
      }
      panelToggles={{
        right: {
          isOpen: hasDiffPanel ? isDiffPanelOpen : false,
          onToggle: onToggleDiffPanel,
          disabled: !hasDiffPanel,
          buttonContent:
            additions !== 0 || deletions !== 0 ? (
              <TaskDiffStats
                className="ml-1"
                linesAdded={additions}
                linesRemoved={deletions}
              />
            ) : undefined,
        },
      }}
      trailing={
        <div className="flex items-center gap-2">
          {unifiedDiff && applyTurnId ? (
            <ApplyRemoteDiffButton
              turnId={applyTurnId}
              diff={unifiedDiff}
              taskEnvironment={taskEnvironment}
            />
          ) : null}
          <Tooltip
            tooltipContent={
              <FormattedMessage
                id="codex.remoteConversation.viewPreviousTurns.buttonTooltip"
                defaultMessage="Open in web"
                description="Open task in Codex web button"
              />
            }
          >
            <Button
              color="outline"
              size="toolbar"
              onClick={() => {
                if (!taskId) {
                  return;
                }
                messageBus.dispatchMessage("open-in-browser", {
                  url: `${CODEX_HOME_URL}/tasks/${taskId}`,
                });
              }}
            >
              <ArrowTopRightIcon className="icon-2xs" />
              <FormattedMessage
                id="codex.remoteConversation.viewPreviousTurns.buttonText"
                defaultMessage="Open"
                description="Open task in Codex web button text"
              />
            </Button>
          </Tooltip>
          {taskId ? (
            <RemotePrButton
              taskId={taskId}
              turns={turns}
              selectedTurn={selectedTurn}
              diffTaskTurn={diffTaskTurn ?? null}
              pullRequests={pullRequests}
            />
          ) : null}
        </div>
      }
    />
  );
}
