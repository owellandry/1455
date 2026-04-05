import { useScope } from "maitai";
import { createConversationId, isCodexWorktree } from "protocol";
import type React from "react";
import { startTransition, useMemo } from "react";
import {
  FormattedMessage,
  defineMessage,
  type IntlShape,
  useIntl,
} from "react-intl";
import { useNavigate } from "react-router";

import { useAppServerManagerForConversationIdOrDefault } from "@/app-server/app-server-manager-hooks";
import type { AppServerConversationState } from "@/app-server/app-server-manager-types";
import { getSubagentSourceMetadata } from "@/app-server/utils/get-subagent-source-metadata";
import { ArchiveInfoMessage } from "@/components/archive-info-message";
import { FormattedRelativeDateTime } from "@/components/format-relative-date-time";
import { toast$ } from "@/components/toaster/toast-signal";
import { parseDiff as parseGitDiff } from "@/diff/parse-diff";
import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import { useStartNewConversation } from "@/hooks/use-start-new-conversation";
import { useWindowType } from "@/hooks/use-window-type";
import { getForkedSubagentVisibleTurns } from "@/local-conversation/forked-subagent-visible-turns";
import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";
import type { TurnDiffLocalConversationItem } from "@/local-conversation/items/local-conversation-item";
import { mapStateToLocalConversationItems } from "@/local-conversation/items/map-mcp-conversation-turn";
import { isConversationAwaitingApproval } from "@/local-conversation/pending-request";
import { AppScope } from "@/scopes/app-scope";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import { useNavigateToLocalConversation } from "@/utils/use-navigate-to-local-conversation";
import { useFetchFromVSCode } from "@/vscode-api";

import {
  TaskRowLayout,
  type TaskRowEnvironmentType,
  type TaskRowIconBadgeDescriptor,
  type TaskRowStatusState,
  TaskRowTitleTooltipContent,
} from "./task-row-layout";
import { useArchiveState } from "./use-archive-state";

const archiveLocalTaskMessage = defineMessage({
  id: "codex.localTaskRow.archiveTask",
  defaultMessage: "Archive thread",
  description: "Label for archiving a local thread",
});

export function LocalTaskRow({
  conversation,
  onSelect,
  onClick,
  onDoubleClick,
  isActive = false,
  isGrouped = false,
  envIconLocation,
  hideMeta = false,
  indicatorLocation = "end",
  diffStyle = "color",
  indicatorRestNode,
  indicatorHoverNode,
  onContextMenu,
  renderActions,
  metaHidden = false,
  extraIconBadges,
  onArchiveStart,
  onArchiveSuccess,
  onArchiveError,
  indicatorSlotClassName,
  titleOverride,
  forceLoadingIndicator = false,
  blurOnClick = false,
  hasPendingChildApproval = false,
  className,
  isAutomationRun = false,
}: {
  conversation: AppServerConversationState;
  onSelect?: () => void;
  onClick?: () => void;
  onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
  isActive?: boolean;
  isGrouped?: boolean;
  envIconLocation?: "end" | "start" | "middle" | "none";
  hideMeta?: boolean;
  indicatorLocation?: "end" | "start";
  diffStyle?: "color" | "monochrome";
  indicatorRestNode?: React.ReactNode;
  indicatorHoverNode?: React.ReactNode;
  renderActions?: React.ComponentProps<typeof TaskRowLayout>["renderActions"];
  metaHidden?: boolean;
  extraIconBadges?: Array<TaskRowIconBadgeDescriptor>;
  onArchiveStart?: () => void;
  onArchiveSuccess?: () => void;
  onArchiveError?: () => void;
  indicatorSlotClassName?: string;
  titleOverride?: React.ReactNode;
  forceLoadingIndicator?: boolean;
  blurOnClick?: boolean;
  hasPendingChildApproval?: boolean;
  className?: string;
  isAutomationRun?: boolean;
}): React.ReactElement | null {
  const navigateToConversation = useNavigateToLocalConversation();
  const startNewConversation = useStartNewConversation();
  const navigate = useNavigate();
  const mcpManager = useAppServerManagerForConversationIdOrDefault(
    conversation.id,
  );
  const scope = useScope(AppScope);
  const intl = useIntl();
  const {
    archived,
    usesExternalArchiveHandling,
    beginArchive,
    handleArchiveSuccess,
    handleArchiveError,
  } = useArchiveState({
    onArchiveStart,
    onArchiveSuccess,
    onArchiveError,
  });
  const windowType = useWindowType();
  const { data: codexHomeData } = useFetchFromVSCode("codex-home", {
    params: {
      hostId: conversation.hostId ?? DEFAULT_HOST_ID,
    },
  });
  const codexHome = codexHomeData?.codexHome;
  const needsResume = conversation.resumeState === "needs_resume";
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const subagentSourceMetadata = getSubagentSourceMetadata(conversation.source);
  const subagentParentThreadId = subagentSourceMetadata?.parentThreadId ?? null;
  const isSubagentChildConversation =
    isBackgroundSubagentsEnabled && subagentParentThreadId != null;
  const parentConversation =
    subagentParentThreadId != null
      ? (mcpManager.getConversation(
          createConversationId(subagentParentThreadId),
        ) ?? null)
      : null;
  const visibleTurns =
    isSubagentChildConversation && parentConversation != null
      ? getForkedSubagentVisibleTurns({
          conversation,
          parentConversation,
        })
      : conversation.turns;
  const lastVisibleTurn = visibleTurns.at(-1) ?? null;
  const mapped = useMemo(() => {
    return needsResume
      ? { items: [], status: "complete" as const }
      : lastVisibleTurn != null
        ? mapStateToLocalConversationItems(
            lastVisibleTurn,
            conversation.requests,
            {
              isBackgroundSubagentsEnabled,
            },
          )
        : { items: [], status: "in_progress" as const };
  }, [
    conversation.requests,
    isBackgroundSubagentsEnabled,
    lastVisibleTurn,
    needsResume,
  ]);
  const runtimeStatus = needsResume ? conversation.threadRuntimeStatus : null;
  const runtimeStatusIsActive = runtimeStatus?.type === "active";
  const isInProgress = needsResume
    ? runtimeStatusIsActive
    : mapped.status === "in_progress";
  const hasSystemError = needsResume
    ? runtimeStatus?.type === "systemError"
    : mapped.items.some((i) => i.type === "system-error");
  const hasPendingApproval =
    isConversationAwaitingApproval(conversation) || hasPendingChildApproval;
  const hasPendingRequest = needsResume
    ? runtimeStatusIsActive &&
      runtimeStatus.activeFlags.includes("waitingOnUserInput")
    : conversation.requests.some(
        (r) => r.method === "item/tool/requestUserInput",
      );
  const statusType =
    forceLoadingIndicator || isInProgress
      ? "loading"
      : hasSystemError
        ? "error"
        : "idle";
  const { node: titleNode, text: titleText } = useTitle(conversation, {
    titleOverride,
    parentConversation,
    intl,
  });
  const statusState: TaskRowStatusState =
    statusType === "loading"
      ? {
          type: "loading",
          loadingIndicator: "spinner",
          unread: isSubagentChildConversation
            ? false
            : conversation.hasUnreadTurn,
        }
      : {
          type: statusType,
          unread: isSubagentChildConversation
            ? false
            : conversation.hasUnreadTurn,
        };
  const lastTurnDiff = [...mapped.items]
    .reverse()
    .find((i): i is TurnDiffLocalConversationItem => i.type === "turn-diff");

  const aggregatedDiffStats = useMemo(() => {
    if (!lastTurnDiff) {
      return { linesAdded: 0, linesRemoved: 0 };
    }
    return parseGitDiff(lastTurnDiff.unifiedDiff).reduce(
      (acc, diff) => ({
        linesAdded: acc.linesAdded + diff.additions,
        linesRemoved: acc.linesRemoved + diff.deletions,
      }),
      { linesAdded: 0, linesRemoved: 0 },
    );
  }, [lastTurnDiff]);
  const handleArchive = (): void => {
    if (mcpManager == null) {
      return;
    }
    const manager = mcpManager;
    beginArchive();
    void manager
      .archiveConversation(conversation.id)
      .then(() => {
        handleArchiveSuccess();
        if (isActive) {
          if (isSubagentChildConversation && subagentParentThreadId != null) {
            void navigate(`/local/${subagentParentThreadId}`);
          } else {
            startNewConversation();
          }
        }
        const openSettings = (): void => {
          void navigate("/settings/data-controls");
        };
        if (!isSubagentChildConversation) {
          scope
            .get(toast$)
            .info(
              <ArchiveInfoMessage
                windowType={windowType}
                onOpenSettings={openSettings}
              />,
              { id: "archive-thread" },
            );
        }
      })
      .catch(() => {
        handleArchiveError();
        scope.get(toast$).danger(
          intl.formatMessage({
            id: "localTaskRow.archiveError",
            defaultMessage: "Failed to archive conversation",
            description:
              "Error message when archiving a local Codex conversation",
          }),
        );
      });
  };

  const diffStats =
    (!isInProgress || isSubagentChildConversation) &&
    (aggregatedDiffStats.linesAdded > 0 || aggregatedDiffStats.linesRemoved > 0)
      ? aggregatedDiffStats
      : null;
  const chip = hasPendingApproval
    ? {
        id: "awaiting-approval",
        label: (
          <FormattedMessage
            id="codex.localTaskRow.awaitingApproval"
            defaultMessage="Awaiting approval"
            description="Chip indicating a local task is waiting for user approval"
          />
        ),
      }
    : hasPendingRequest
      ? {
          id: "awaiting-response",
          label: (
            <FormattedMessage
              id="codex.localTaskRow.awaitingResponse"
              defaultMessage="Awaiting response"
              description="Chip indicating a local task is waiting for user response"
            />
          ),
        }
      : null;
  const chips =
    chip == null ? [] : hasPendingApproval || isInProgress ? [chip] : [];

  if (archived && !usesExternalArchiveHandling) {
    return null;
  }
  const cwd = conversation.cwd ?? null;
  const isRemoteHost = conversation.hostId !== DEFAULT_HOST_ID;
  const envType: TaskRowEnvironmentType | undefined = isCodexWorktree(
    cwd,
    codexHome,
  )
    ? isRemoteHost
      ? "remote-worktree"
      : "worktree"
    : isRemoteHost
      ? "remote"
      : isGrouped
        ? "localGrouped"
        : undefined;
  const envTooltip = cwd ?? null;
  const titleContent = isAutomationRun ? (
    <TaskRowTitleTooltipContent
      titleText={titleText}
      truncatedTooltipContent={
        titleText == null
          ? undefined
          : intl.formatMessage(
              {
                id: "codex.localTaskRow.automationTooltipWithTitle",
                defaultMessage: "Automation: {title}",
                description:
                  "Tooltip shown for a truncated automation thread title in the recent tasks sidebar",
              },
              { title: titleText },
            )
      }
      untruncatedTooltipContent={intl.formatMessage({
        id: "codex.localTaskRow.automationTooltip",
        defaultMessage: "Automation",
        description:
          "Tooltip shown for an automation thread title in the recent tasks sidebar when the title is fully visible",
      })}
    >
      {titleNode}
    </TaskRowTitleTooltipContent>
  ) : (
    titleNode
  );

  return (
    <TaskRowLayout
      hostId={conversation.hostId}
      className={className}
      isActive={isActive}
      indicatorLocation={indicatorLocation}
      indicatorRestNode={indicatorRestNode}
      indicatorHoverNode={indicatorHoverNode}
      indicatorSlotClassName={indicatorSlotClassName}
      onContextMenu={onContextMenu}
      onClick={() => {
        navigateToConversation(conversation.id);
        startTransition(() => {
          onSelect?.();
          onClick?.();
        });
      }}
      onDoubleClick={onDoubleClick}
      statusState={statusState}
      envType={envType}
      envIconLocation={envIconLocation}
      envTooltip={envTooltip}
      blurOnClick={blurOnClick}
      title={titleContent}
      chips={chips}
      iconBadges={extraIconBadges ?? []}
      diffStats={diffStats}
      diffStyle={diffStyle}
      metaHidden={metaHidden}
      metaContent={
        hideMeta ? null : (
          <FormattedRelativeDateTime
            dateString={new Date(conversation.createdAt).toISOString()}
          />
        )
      }
      onArchive={mcpManager == null ? null : handleArchive}
      archiveAriaLabel={intl.formatMessage(archiveLocalTaskMessage)}
      archiveConfirmLabel={
        <FormattedMessage
          id="codex.localTaskRow.confirmArchiveTask"
          defaultMessage="Confirm"
          description="Confirmation button for archiving a local task"
        />
      }
      renderActions={renderActions}
    />
  );
}

function useTitle(
  conversation: AppServerConversationState,
  {
    titleOverride,
    parentConversation,
    intl,
  }: {
    titleOverride?: React.ReactNode;
    parentConversation?: AppServerConversationState | null;
    intl: IntlShape;
  },
): { node: React.ReactNode; text: string | null } {
  return useMemo(() => {
    if (typeof titleOverride !== "string" && titleOverride != null) {
      return { node: titleOverride, text: null };
    }
    const explicitTitle = conversation.title?.trim() ?? "";
    if (explicitTitle.length > 0) {
      const localTitle = getLocalConversationTitle(
        conversation,
        parentConversation,
      );
      if (localTitle != null) {
        return { node: localTitle, text: localTitle };
      }
    }
    const projectedTitle = titleOverride?.trim() ?? "";
    if (projectedTitle.length > 0) {
      return { node: projectedTitle, text: projectedTitle };
    }
    const localTitle = getLocalConversationTitle(
      conversation,
      parentConversation,
    );
    if (localTitle != null) {
      return { node: localTitle, text: localTitle };
    }
    const fallbackTitle = intl.formatMessage({
      id: "codex.taskRow.title",
      defaultMessage: "New thread",
      description: "Default title for a Codex thread that doesn't have a title",
    });
    return {
      node: (
        <FormattedMessage
          id="codex.taskRow.title"
          defaultMessage="New thread"
          description="Default title for a Codex thread that doesn't have a title"
        />
      ),
      text: fallbackTitle,
    };
  }, [conversation, intl, parentConversation, titleOverride]);
}
