import clsx from "clsx";
import { motion } from "framer-motion";
import { createConversationId, type ConversationId } from "protocol";
import { memo, useState } from "react";
import {
  defineMessages,
  FormattedMessage,
  type IntlShape,
  type MessageDescriptor,
  useIntl,
} from "react-intl";
import { useNavigate } from "react-router";

import {
  useAppServerManagerForConversationIdOrDefault,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import { getThreadAgentNickname } from "@/app-server/utils/get-thread-agent-nickname";
import { Tooltip } from "@/components/tooltip";
import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import { ACCORDION_TRANSITION } from "@/utils/animations";
import { formatModelDisplayName } from "@/utils/format-model-display-name";

import { useMeasuredElementHeight } from "../use-measured-element-height";
import type {
  MultiAgentActionLocalConversationItem,
  NonEmptyArray,
} from "./local-conversation-item";
import {
  getAgentMentionColorCssValueForSessionId,
  getAgentMentionForSessionId,
} from "./multi-agent-mentions";
import {
  NON_ASSISTANT_BODY_DESCENDANTS_CLASS,
  NON_ASSISTANT_BODY_TEXT_CLASS,
  NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS,
  NON_ASSISTANT_SUMMARY_TRAILING_TEXT_CLASS,
} from "./non-assistant-tone";
import { TimelineItem } from "./timeline-item";

type MultiAgentStatus = MultiAgentActionLocalConversationItem["status"];
type MultiAgentRow = { key: string; node: React.ReactElement };

const multiAgentMessages = defineMessages({
  headerSpawnInProgress: {
    id: "localConversation.multiAgentAction.header.spawn.inProgress",
    defaultMessage: "Spawning",
    description: "Header for in-progress spawnAgent multi-agent action.",
  },
  headerSpawnCompleted: {
    id: "localConversation.multiAgentAction.header.spawn.completed",
    defaultMessage: "Spawned",
    description: "Header for completed spawnAgent multi-agent action.",
  },
  headerSpawnFailed: {
    id: "localConversation.multiAgentAction.header.spawn.failed",
    defaultMessage: "Failed to spawn",
    description: "Header for failed spawnAgent multi-agent action.",
  },
  headerSendInputInProgress: {
    id: "localConversation.multiAgentAction.header.sendInput.inProgress",
    defaultMessage: "Messaging",
    description: "Header for in-progress sendInput multi-agent action.",
  },
  headerSendInputCompleted: {
    id: "localConversation.multiAgentAction.header.sendInput.completed",
    defaultMessage: "Messaged",
    description: "Header for completed sendInput multi-agent action.",
  },
  headerSendInputFailed: {
    id: "localConversation.multiAgentAction.header.sendInput.failed",
    defaultMessage: "Failed to message",
    description: "Header for failed sendInput multi-agent action.",
  },
  headerResumeInProgress: {
    id: "localConversation.multiAgentAction.header.resume.inProgress",
    defaultMessage: "Resuming",
    description: "Header for in-progress resumeAgent multi-agent action.",
  },
  headerResumeCompleted: {
    id: "localConversation.multiAgentAction.header.resume.completed",
    defaultMessage: "Resumed",
    description: "Header for completed resumeAgent multi-agent action.",
  },
  headerResumeFailed: {
    id: "localConversation.multiAgentAction.header.resume.failed",
    defaultMessage: "Failed to resume",
    description: "Header for failed resumeAgent multi-agent action.",
  },
  headerCloseInProgress: {
    id: "localConversation.multiAgentAction.header.close.inProgress",
    defaultMessage: "Closing",
    description: "Header for in-progress closeAgent multi-agent action.",
  },
  headerCloseCompleted: {
    id: "localConversation.multiAgentAction.header.close.completed",
    defaultMessage: "Closed",
    description: "Header for completed closeAgent multi-agent action.",
  },
  headerCloseFailed: {
    id: "localConversation.multiAgentAction.header.close.failed",
    defaultMessage: "Failed to close",
    description: "Header for failed closeAgent multi-agent action.",
  },
  rowSpawnInProgress: {
    id: "localConversation.multiAgentAction.rowAction.spawn.inProgress",
    defaultMessage: "Spawning",
    description: "Per-agent verb for in-progress spawnAgent actions.",
  },
  rowSpawnCompleted: {
    id: "localConversation.multiAgentAction.rowAction.spawn.completed",
    defaultMessage: "Spawned",
    description: "Per-agent verb for completed spawnAgent actions.",
  },
  rowSpawnFailed: {
    id: "localConversation.multiAgentAction.rowAction.spawn.failed",
    defaultMessage: "Failed spawning",
    description: "Per-agent verb for failed spawnAgent actions.",
  },
  rowSendInputInProgress: {
    id: "localConversation.multiAgentAction.rowAction.sendInput.inProgress",
    defaultMessage: "Messaging",
    description: "Per-agent verb for in-progress sendInput actions.",
  },
  rowSendInputCompleted: {
    id: "localConversation.multiAgentAction.rowAction.sendInput.completed",
    defaultMessage: "Messaged",
    description: "Per-agent verb for completed sendInput actions.",
  },
  rowSendInputFailed: {
    id: "localConversation.multiAgentAction.rowAction.sendInput.failed",
    defaultMessage: "Failed messaging",
    description: "Per-agent verb for failed sendInput actions.",
  },
  rowResumeInProgress: {
    id: "localConversation.multiAgentAction.rowAction.resume.inProgress",
    defaultMessage: "Resuming",
    description: "Per-agent verb for in-progress resumeAgent actions.",
  },
  rowResumeCompleted: {
    id: "localConversation.multiAgentAction.rowAction.resume.completed",
    defaultMessage: "Resumed",
    description: "Per-agent verb for completed resumeAgent actions.",
  },
  rowResumeFailed: {
    id: "localConversation.multiAgentAction.rowAction.resume.failed",
    defaultMessage: "Failed resuming",
    description: "Per-agent verb for failed resumeAgent actions.",
  },
  rowCloseInProgress: {
    id: "localConversation.multiAgentAction.rowAction.close.inProgress",
    defaultMessage: "Closing",
    description: "Per-agent verb for in-progress closeAgent actions.",
  },
  rowCloseCompleted: {
    id: "localConversation.multiAgentAction.rowAction.close.completed",
    defaultMessage: "Closed",
    description: "Per-agent verb for completed closeAgent actions.",
  },
  rowCloseFailed: {
    id: "localConversation.multiAgentAction.rowAction.close.failed",
    defaultMessage: "Failed closing",
    description: "Per-agent verb for failed closeAgent actions.",
  },
  rowSendInputMessagedInProgress: {
    id: "localConversation.multiAgentAction.rowAction.sendInput.messaged.inProgress",
    defaultMessage: "Messaging",
    description: "Row action label for in-progress sendInput rows.",
  },
  rowSendInputMessagedCompleted: {
    id: "localConversation.multiAgentAction.rowAction.sendInput.messaged.completed",
    defaultMessage: "Messaged",
    description: "Row action label for completed sendInput rows.",
  },
  rowSendInputMessagedFailed: {
    id: "localConversation.multiAgentAction.rowAction.sendInput.messaged.failed",
    defaultMessage: "Failed to message",
    description: "Row action label for failed sendInput rows.",
  },
  statePendingInit: {
    id: "localConversation.multiAgentAction.agentState.pendingInit",
    defaultMessage: "pending init",
    description: "Status label for pendingInit sub-agent state.",
  },
  stateRunning: {
    id: "localConversation.multiAgentAction.agentState.running",
    defaultMessage: "running",
    description: "Status label for running sub-agent state.",
  },
  stateInterrupted: {
    id: "localConversation.multiAgentAction.agentState.interrupted",
    defaultMessage: "interrupted",
    description: "Status label for interrupted sub-agent state.",
  },
  stateShutdown: {
    id: "localConversation.multiAgentAction.agentState.shutdown",
    defaultMessage: "shutdown",
    description: "Status label for shutdown sub-agent state.",
  },
  stateCompleted: {
    id: "localConversation.multiAgentAction.agentState.completed",
    defaultMessage: "completed",
    description: "Status label for completed sub-agent state.",
  },
  stateErrored: {
    id: "localConversation.multiAgentAction.agentState.errored",
    defaultMessage: "errored",
    description: "Status label for errored sub-agent state.",
  },
  stateNotFound: {
    id: "localConversation.multiAgentAction.agentState.notFound",
    defaultMessage: "not found",
    description: "Status label for notFound sub-agent state.",
  },
});

const HEADER_MESSAGE_BY_ACTION_STATUS: Record<
  MultiAgentActionLocalConversationItem["action"],
  Record<MultiAgentStatus, MessageDescriptor>
> = {
  spawnAgent: createActionStatusMessageMap({
    inProgress: multiAgentMessages.headerSpawnInProgress,
    completed: multiAgentMessages.headerSpawnCompleted,
    failed: multiAgentMessages.headerSpawnFailed,
  }),
  sendInput: createActionStatusMessageMap({
    inProgress: multiAgentMessages.headerSendInputInProgress,
    completed: multiAgentMessages.headerSendInputCompleted,
    failed: multiAgentMessages.headerSendInputFailed,
  }),
  resumeAgent: createActionStatusMessageMap({
    inProgress: multiAgentMessages.headerResumeInProgress,
    completed: multiAgentMessages.headerResumeCompleted,
    failed: multiAgentMessages.headerResumeFailed,
  }),
  closeAgent: createActionStatusMessageMap({
    inProgress: multiAgentMessages.headerCloseInProgress,
    completed: multiAgentMessages.headerCloseCompleted,
    failed: multiAgentMessages.headerCloseFailed,
  }),
};

const ROW_MESSAGE_BY_ACTION_STATUS: Record<
  MultiAgentActionLocalConversationItem["action"],
  Record<MultiAgentStatus, MessageDescriptor>
> = {
  spawnAgent: createActionStatusMessageMap({
    inProgress: multiAgentMessages.rowSpawnInProgress,
    completed: multiAgentMessages.rowSpawnCompleted,
    failed: multiAgentMessages.rowSpawnFailed,
  }),
  sendInput: createActionStatusMessageMap({
    inProgress: multiAgentMessages.rowSendInputInProgress,
    completed: multiAgentMessages.rowSendInputCompleted,
    failed: multiAgentMessages.rowSendInputFailed,
  }),
  resumeAgent: createActionStatusMessageMap({
    inProgress: multiAgentMessages.rowResumeInProgress,
    completed: multiAgentMessages.rowResumeCompleted,
    failed: multiAgentMessages.rowResumeFailed,
  }),
  closeAgent: createActionStatusMessageMap({
    inProgress: multiAgentMessages.rowCloseInProgress,
    completed: multiAgentMessages.rowCloseCompleted,
    failed: multiAgentMessages.rowCloseFailed,
  }),
};

const SEND_INPUT_ROW_ACTION_BY_STATUS = createActionStatusMessageMap({
  inProgress: multiAgentMessages.rowSendInputMessagedInProgress,
  completed: multiAgentMessages.rowSendInputMessagedCompleted,
  failed: multiAgentMessages.rowSendInputMessagedFailed,
});

const STATE_MESSAGE_BY_STATUS: Record<
  NonNullable<
    MultiAgentActionLocalConversationItem["agentsStates"][string]
  >["status"],
  MessageDescriptor
> = {
  pendingInit: multiAgentMessages.statePendingInit,
  running: multiAgentMessages.stateRunning,
  interrupted: multiAgentMessages.stateInterrupted,
  shutdown: multiAgentMessages.stateShutdown,
  completed: multiAgentMessages.stateCompleted,
  errored: multiAgentMessages.stateErrored,
  notFound: multiAgentMessages.stateNotFound,
};

export function MultiAgentActionItemContent({
  conversationId,
  items,
  forceInProgress = false,
}: {
  conversationId: ConversationId;
  items: NonEmptyArray<MultiAgentActionLocalConversationItem>;
  forceInProgress?: boolean;
}): React.ReactElement | null {
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const intl = useIntl();
  const navigate = useNavigate();
  const manager = useAppServerManagerForConversationIdOrDefault(conversationId);
  const primaryItem = items[0];
  const parentModel = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.latestModel ?? null,
  );
  const [isExpandedWhenIdle, setIsExpandedWhenIdle] = useState(false);
  const displayStatus = getDisplayStatus(primaryItem.status, forceInProgress);
  const isDisplayInProgress = displayStatus === "inProgress";
  const { elementHeightPx: contentHeightPx, elementRef: contentRef } =
    useMeasuredElementHeight<HTMLDivElement>();
  const targetCount = getTargetCount(items);
  const isExpanded = isDisplayInProgress || isExpandedWhenIdle;
  const openAgentThread = async (threadId: string): Promise<void> => {
    const threadConversationId = createConversationId(threadId);
    if (manager.getConversation(threadConversationId) == null) {
      await manager.hydratePinnedThreads([threadConversationId]);
    }
    if (manager.getConversation(threadConversationId) == null) {
      return;
    }
    void navigate(`/local/${threadConversationId}`);
  };

  if (!isBackgroundSubagentsEnabled) {
    return null;
  }

  return (
    <TimelineItem padding="offset">
      <div className="flex flex-col gap-1">
        <div
          className="group flex cursor-interaction items-center gap-1.5"
          data-testid="multi-agent-action-header"
          onClick={() => {
            if (isDisplayInProgress) {
              return;
            }
            setIsExpandedWhenIdle((previous) => !previous);
          }}
        >
          <span className={getHeaderClassName()}>
            <FormattedMessage
              id="localConversation.multiAgentAction.header"
              defaultMessage="{action}{countLabel}"
              description="Header row for multi-agent action events."
              values={{
                action: (
                  <span
                    className={clsx(
                      NON_ASSISTANT_SUMMARY_LEADING_INTERACTIVE_TEXT_CLASS,
                      isDisplayInProgress && "loading-shimmer-pure-text",
                    )}
                  >
                    {getMultiAgentHeaderLabel({
                      action: primaryItem.action,
                      status: displayStatus,
                      intl,
                    })}
                  </span>
                ),
                countLabel:
                  targetCount > 0
                    ? intl.formatMessage(
                        {
                          id: "localConversation.multiAgentAction.header.count",
                          defaultMessage:
                            " {count, plural, one {# agent} other {# agents}}",
                          description:
                            "Agent count suffix shown for multi-agent actions.",
                        },
                        { count: targetCount },
                      )
                    : "",
              }}
            />
          </span>
          <ChevronRightIcon
            className={clsx(
              "text-token-input-placeholder-foreground icon-2xs flex-shrink-0 transition-all duration-300 opacity-0 group-hover:opacity-100",
              isExpanded && "opacity-100",
              isExpanded ? "rotate-90" : "rotate-0",
            )}
          />
        </div>
        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? contentHeightPx : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={ACCORDION_TRANSITION}
          className={clsx(isExpanded ? "overflow-visible" : "overflow-hidden")}
          style={{
            pointerEvents: isExpanded ? "auto" : "none",
          }}
        >
          <div
            ref={contentRef}
            className="flex flex-col gap-0.5"
            data-testid="multi-agent-action-rows"
          >
            <MultiAgentActionRows
              items={items}
              parentModel={parentModel}
              onOpenAgentThread={openAgentThread}
            />
          </div>
        </motion.div>
      </div>
    </TimelineItem>
  );
}

const MultiAgentActionRows = memo(function MultiAgentActionRows({
  items,
  parentModel,
  onOpenAgentThread,
}: {
  items: Array<MultiAgentActionLocalConversationItem>;
  parentModel: string | null;
  onOpenAgentThread: (threadId: string) => void;
}): React.ReactElement {
  const intl = useIntl();
  const rows = buildRows(items, parentModel, intl, onOpenAgentThread);

  return (
    <>
      {rows.map((row) => (
        <div
          key={row.key}
          className={`${NON_ASSISTANT_BODY_TEXT_CLASS} ${NON_ASSISTANT_BODY_DESCENDANTS_CLASS} text-size-chat min-w-0 truncate`}
        >
          {row.node}
        </div>
      ))}
    </>
  );
});

function createActionStatusMessageMap(params: {
  inProgress: MessageDescriptor;
  completed: MessageDescriptor;
  failed: MessageDescriptor;
}): Record<MultiAgentStatus, MessageDescriptor> {
  return {
    inProgress: params.inProgress,
    completed: params.completed,
    failed: params.failed,
  };
}

function getHeaderClassName(): string {
  return clsx(
    NON_ASSISTANT_SUMMARY_TRAILING_TEXT_CLASS,
    "text-size-chat truncate",
  );
}

function getAgentIds(
  item: MultiAgentActionLocalConversationItem,
): Array<string> {
  const receiverThreads = item.receiverThreads ?? [];
  const agentsStates = item.agentsStates ?? {};
  return Array.from(
    new Set([
      ...receiverThreads.map((receiverThread) => receiverThread.threadId),
      ...Object.keys(agentsStates),
    ]),
  ).sort();
}

function getReceiverThreadMap(
  item: MultiAgentActionLocalConversationItem,
): Map<
  string,
  MultiAgentActionLocalConversationItem["receiverThreads"][number]["thread"]
> {
  const receiverThreads = item.receiverThreads ?? [];
  return new Map(
    receiverThreads.map((receiverThread) => [
      receiverThread.threadId,
      receiverThread.thread,
    ]),
  );
}

function buildRows(
  items: Array<MultiAgentActionLocalConversationItem>,
  parentModel: string | null,
  intl: ReturnType<typeof useIntl>,
  onOpenAgentThread: (threadId: string) => void,
): Array<MultiAgentRow> {
  const rows = Array<MultiAgentRow>();
  const spawnModelByAgentId = getSpawnModelByAgentId(items, parentModel);

  for (const item of items) {
    const agentIds = getAgentIds(item);
    const receiverThreadMap = getReceiverThreadMap(item);

    const isCreatedWithInstructions =
      item.action === "spawnAgent" &&
      item.status === "completed" &&
      item.prompt != null &&
      item.prompt.trim().length > 0;
    const isMessagedWithPrompt =
      item.action === "sendInput" &&
      item.prompt != null &&
      item.prompt.trim().length > 0;

    if (agentIds.length === 0) {
      rows.push({
        key: `row-generic-${item.id}`,
        node: (
          <FormattedMessage
            id="localConversation.multiAgentAction.row.generic"
            defaultMessage="{action}"
            description="Fallback row when there are no known agent ids yet."
            values={{
              action: getMultiAgentRowActionLabel({
                action: item.action,
                status: item.status,
                intl,
              }),
            }}
          />
        ),
      });
    } else {
      for (const agentId of agentIds) {
        rows.push({
          key: `row-${item.id}-${agentId}`,
          node: isCreatedWithInstructions ? (
            <FormattedMessage
              id="localConversation.multiAgentAction.row.spawn.createdWithInstructions"
              defaultMessage="Created {agent} with the instructions: {instructions}"
              description="Per-agent row for completed spawn actions when prompt instructions are present."
              values={{
                agent: getAgentDisplayName(
                  agentId,
                  spawnModelByAgentId.get(agentId) ?? null,
                  receiverThreadMap.get(agentId) ?? null,
                  () => {
                    onOpenAgentThread(agentId);
                  },
                ),
                instructions: (
                  <span className={NON_ASSISTANT_SUMMARY_TRAILING_TEXT_CLASS}>
                    {item.prompt ?? ""}
                  </span>
                ),
              }}
            />
          ) : isMessagedWithPrompt ? (
            <FormattedMessage
              id="localConversation.multiAgentAction.row.sendInput.messagedWithPrompt"
              defaultMessage="{action} {agent}: {prompt}"
              description="Per-agent row for sendInput actions when prompt text is present."
              values={{
                action: getMultiAgentSendInputRowActionLabel({
                  status: item.status,
                  intl,
                }),
                agent: getAgentDisplayName(
                  agentId,
                  spawnModelByAgentId.get(agentId) ?? null,
                  receiverThreadMap.get(agentId) ?? null,
                  () => {
                    onOpenAgentThread(agentId);
                  },
                ),
                prompt: (
                  <span className={NON_ASSISTANT_SUMMARY_TRAILING_TEXT_CLASS}>
                    {item.prompt ?? ""}
                  </span>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="localConversation.multiAgentAction.row.agent"
              defaultMessage="{action} {agent}{stateSuffix}"
              description="Per-agent row for multi-agent action events."
              values={{
                action: getMultiAgentRowActionLabel({
                  action: item.action,
                  status: item.status,
                  intl,
                }),
                agent: getAgentDisplayName(
                  agentId,
                  spawnModelByAgentId.get(agentId) ?? null,
                  receiverThreadMap.get(agentId) ?? null,
                  () => {
                    onOpenAgentThread(agentId);
                  },
                ),
                stateSuffix: getRowStateSuffix(
                  item,
                  item.agentsStates[agentId],
                  intl,
                ),
              }}
            />
          ),
        });
      }
    }

    if (
      !isCreatedWithInstructions &&
      !isMessagedWithPrompt &&
      item.prompt != null &&
      item.prompt.trim().length > 0
    ) {
      rows.push({
        key: `meta-prompt-${item.id}`,
        node: (
          <FormattedMessage
            id="localConversation.multiAgentAction.meta.prompt"
            defaultMessage="Input: {prompt}"
            description="Input prompt metadata for multi-agent actions."
            values={{
              prompt: (
                <span className="break-words whitespace-pre-wrap">
                  {item.prompt}
                </span>
              ),
            }}
          />
        ),
      });
    }
  }

  return rows;
}

function getTargetCount(
  items: Array<MultiAgentActionLocalConversationItem>,
): number {
  const uniqueIds = new Set<string>();
  for (const item of items) {
    for (const agentId of getAgentIds(item)) {
      uniqueIds.add(agentId);
    }
  }

  if (uniqueIds.size > 0) {
    return uniqueIds.size;
  }

  return items.length;
}

function getAgentDisplayName(
  agentId: string,
  model: string | null,
  thread: MultiAgentActionLocalConversationItem["receiverThreads"][number]["thread"],
  onOpenThread: () => void,
): React.ReactElement {
  const agentRoleLabel = getAgentRoleLabel(thread);
  const agentRoleSuffix =
    agentRoleLabel == null ? null : ` (${agentRoleLabel})`;
  const tooltipModel = getNonEmptyModel(model);

  return (
    <>
      <Tooltip
        disabled={tooltipModel == null}
        tooltipContent={
          tooltipModel == null
            ? null
            : `Uses ${formatModelDisplayName(tooltipModel)}`
        }
      >
        <button
          type="button"
          className="inline cursor-pointer bg-transparent p-0 font-medium"
          onClick={onOpenThread}
          style={{ color: getAgentMentionColorCssValueForSessionId(agentId) }}
        >
          {getAgentMentionLabel(agentId, thread)}
        </button>
      </Tooltip>
      {agentRoleSuffix == null ? null : <span>{agentRoleSuffix}</span>}
    </>
  );
}

function getSpawnModelByAgentId(
  items: Array<MultiAgentActionLocalConversationItem>,
  parentModel: string | null,
): Map<string, string | null> {
  const spawnModelByAgentId = new Map<string, string | null>();
  const parentTooltipModel = getNonEmptyModel(parentModel);

  for (const item of items) {
    const model = getNonEmptyModel(item.model) ?? parentTooltipModel;
    if (item.action !== "spawnAgent" || model == null) {
      continue;
    }

    for (const receiverThread of item.receiverThreads) {
      spawnModelByAgentId.set(receiverThread.threadId, model);
    }
  }

  return spawnModelByAgentId;
}

function getNonEmptyModel(model: string | null): string | null {
  if (model == null || model.trim().length === 0) {
    return null;
  }

  return model;
}

function getAgentMentionLabel(
  agentId: string,
  thread: MultiAgentActionLocalConversationItem["receiverThreads"][number]["thread"],
): string {
  const agentNickname = getThreadAgentNickname(thread);
  if (agentNickname != null) {
    return formatAgentNicknameForDisplay(agentNickname);
  }

  return formatAgentNicknameForDisplay(getAgentMentionForSessionId(agentId));
}

function formatAgentNicknameForDisplay(agentNickname: string): string {
  const trimmedAgentNickname = agentNickname.trim();
  if (trimmedAgentNickname.startsWith("@")) {
    return trimmedAgentNickname.slice(1);
  }

  return trimmedAgentNickname;
}

function getAgentRoleLabel(
  thread: MultiAgentActionLocalConversationItem["receiverThreads"][number]["thread"],
): string | null {
  const agentRole = thread?.agentRole;
  if (agentRole == null) {
    return null;
  }

  const trimmedAgentRole = agentRole.trim();
  if (trimmedAgentRole.length === 0) {
    return null;
  }

  if (trimmedAgentRole === "default") {
    return null;
  }

  return trimmedAgentRole;
}

function getStateSuffix(
  state: MultiAgentActionLocalConversationItem["agentsStates"][string],
  intl: ReturnType<typeof useIntl>,
): string {
  if (state == null) {
    return "";
  }
  const status = getMultiAgentStateStatusLabel({ status: state.status, intl });
  if (state.message == null || state.message.trim().length === 0) {
    return ` (${status})`;
  }
  return ` (${status}: ${state.message})`;
}

function getRowStateSuffix(
  item: MultiAgentActionLocalConversationItem,
  state: MultiAgentActionLocalConversationItem["agentsStates"][string],
  intl: ReturnType<typeof useIntl>,
): string {
  if (item.action === "closeAgent" || item.action === "resumeAgent") {
    return "";
  }
  return getStateSuffix(state, intl);
}

function getMultiAgentHeaderLabel(params: {
  action: MultiAgentActionLocalConversationItem["action"];
  status: MultiAgentStatus;
  intl: IntlShape;
}): string {
  return params.intl.formatMessage(
    HEADER_MESSAGE_BY_ACTION_STATUS[params.action][params.status],
  );
}

function getMultiAgentRowActionLabel(params: {
  action: MultiAgentActionLocalConversationItem["action"];
  status: MultiAgentStatus;
  intl: IntlShape;
}): string {
  return params.intl.formatMessage(
    ROW_MESSAGE_BY_ACTION_STATUS[params.action][params.status],
  );
}

function getMultiAgentSendInputRowActionLabel(params: {
  status: MultiAgentStatus;
  intl: IntlShape;
}): string {
  return params.intl.formatMessage(
    SEND_INPUT_ROW_ACTION_BY_STATUS[params.status],
  );
}

function getMultiAgentStateStatusLabel(params: {
  status: NonNullable<
    MultiAgentActionLocalConversationItem["agentsStates"][string]
  >["status"];
  intl: IntlShape;
}): string {
  return params.intl.formatMessage(STATE_MESSAGE_BY_STATUS[params.status]);
}

function getDisplayStatus(
  status: MultiAgentStatus,
  forceInProgress: boolean,
): MultiAgentStatus {
  return forceInProgress ? "inProgress" : status;
}
