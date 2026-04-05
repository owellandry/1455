import type * as AppServer from "app-server-types";
import findLast from "lodash/findLast";
import isEqual from "lodash/isEqual";
import {
  createGitCwd,
  createMcpRequestId,
  isAbsoluteFilesystemPath,
  prependSlashToWindowsDrivePath,
  replaceBackslashesWithSlashes,
  type FileDescriptor,
  type GitCwd,
} from "protocol";

import type { AppServerConversationTurn } from "@/app-server/app-server-manager-types";
import {
  PLAN_IMPLEMENTATION_REQUEST_METHOD,
  type ConversationRequest,
} from "@/app-server/conversation-request";
import { codeReviewResponseSchema } from "@/code-review-schema";
import { extractFileAttachmentsFromPrompt } from "@/prompts/file-attachment-parser";
import { parseAssistantMessageJson } from "@/utils/assistant-json";
import { logger } from "@/utils/logger";

import { getWorkedForTimeLabel } from "../worked-for-divider";
import {
  addEditedArtifactsForFileChange,
  addReferencedArtifactsForAgentMessage,
  createLocalConversationTurnArtifactsCollector,
  finalizeLocalConversationTurnArtifacts,
  type LocalConversationTurnArtifacts,
} from "./artifacts";
import { parseHeartbeatAssistantMessage } from "./heartbeat-structured-output";
import type {
  AssistantMessageStructuredOutput,
  LocalConversationItem,
  LocalConversationItemOrHook,
  McpToolCallConversationItem,
  MultiAgentActionLocalConversationItem,
  PatchApplyLocalConversationItem,
  ReasoningLocalConversationItem,
} from "./local-conversation-item";
import {
  mapCommandActionToParsedCmd,
  mapFileUpdateChanges,
  mapMcpToolCallResult,
  mapPlanSteps,
  mapTurnStatus,
} from "./local-conversation-item";
import { addStatusToParsedCmd } from "./parsed-cmd";
import { quoteCmd } from "./quote-cmd";
import { buildUserMessageItemFromInput } from "./user-message-item";

function looksLikeJsonOutput(message: string): boolean {
  const trimmedMessage = message.trim();
  if (trimmedMessage.startsWith("{") && trimmedMessage.endsWith("}")) {
    return true;
  }
  const fenceMatch = trimmedMessage.match(
    /```(?:json)?\s*\r?\n?([\s\S]*?)```/i,
  );
  if (fenceMatch) {
    const candidate = fenceMatch[1].trim();
    if (candidate.startsWith("{") && candidate.endsWith("}")) {
      return true;
    }
  }
  return trimmedMessage.startsWith("{") && trimmedMessage.endsWith("}");
}

function shouldHideAssistantMessageContent(delta: string): boolean {
  const trimmed = delta.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("```");
}

function shouldIgnoreItemWhenResolvingStreamingTail(
  item: { type?: string } | undefined,
): boolean {
  if (item == null) {
    return true;
  }
  return (
    item.type === "userMessage" ||
    item.type === "steeringUserMessage" ||
    item.type === "automaticApprovalReview" ||
    item.type === "hook"
  );
}

const IMAGE_SOURCE_PREFIX_PATTERN =
  /^(?:data:image\/|https?:\/\/|file:\/\/|app:\/\/|\/@fs)/i;

function toMarkdownImage(value: string, alt: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  let source = trimmed;
  if (isAbsoluteFilesystemPath(trimmed)) {
    source = prependSlashToWindowsDrivePath(
      replaceBackslashesWithSlashes(trimmed),
    );
    return `![${alt}](<${source}>)`;
  } else if (!IMAGE_SOURCE_PREFIX_PATTERN.test(trimmed)) {
    source = `data:image/png;base64,${trimmed}`;
  }
  return `![${alt}](${source})`;
}

function getSavedPath(item: object): string | null {
  if (!("savedPath" in item)) {
    return null;
  }
  const { savedPath } = item;
  return typeof savedPath === "string" ? savedPath : null;
}

export type LocalConversationTurn = {
  items: Array<LocalConversationItemOrHook>;
  status: "complete" | "in_progress" | "cancelled";
  cwd: GitCwd | null;
  collaborationMode: AppServer.CollaborationMode | null;
  artifacts: LocalConversationTurnArtifacts;
};

export function mapStateToLocalConversationItems(
  conversation_turn: AppServerConversationTurn,
  requests: Array<ConversationRequest>,
  options?: {
    isBackgroundSubagentsEnabled?: boolean;
    enableHeartbeatAutomationRendering?: boolean;
  },
): LocalConversationTurn {
  const {
    isBackgroundSubagentsEnabled = true,
    enableHeartbeatAutomationRendering = false,
  } = options ?? {};
  const items: Array<LocalConversationItemOrHook> = [];
  const artifacts = createLocalConversationTurnArtifactsCollector();
  const automaticApprovalReviewItemsByTargetItemId =
    groupAutomaticApprovalReviewItemsByTargetItemId(conversation_turn.items);
  const renderedAutomaticApprovalReviewItemIds = new Set<string>();

  const paramsUserMessageItem = buildUserMessageItemFromInput(
    conversation_turn.params?.input,
    conversation_turn.params?.attachments ?? [],
    { enableHeartbeatAutomationRendering },
  ).item;
  if (paramsUserMessageItem) {
    items.push(paramsUserMessageItem);
  }
  let lastNonUserMessageIndex = -1;
  for (let i = conversation_turn.items.length - 1; i >= 0; i -= 1) {
    const candidate = conversation_turn.items[i];
    if (!shouldIgnoreItemWhenResolvingStreamingTail(candidate)) {
      lastNonUserMessageIndex = i;
      break;
    }
  }

  for (const [index, item] of conversation_turn.items.entries()) {
    if (!item) {
      continue;
    }
    const automaticApprovalReviewItems =
      "id" in item && typeof item.id === "string"
        ? (automaticApprovalReviewItemsByTargetItemId.get(item.id) ?? [])
        : [];
    if (shouldRenderAutomaticApprovalReviewBeforeTargetItem(item.type)) {
      renderAutomaticApprovalReviewItems({
        items,
        automaticApprovalReviewItems,
        renderedAutomaticApprovalReviewItemIds,
      });
    }
    switch (item.type) {
      case "hookPrompt": {
        break;
      }
      case "agentMessage": {
        addReferencedArtifactsForAgentMessage(artifacts, item.text);
        const streaming =
          conversation_turn.status === "inProgress" &&
          lastNonUserMessageIndex >= 0 &&
          index === lastNonUserMessageIndex;
        const renderPlaceholderWhileStreaming =
          streaming && shouldHideAssistantMessageContent(item.text);
        const parsedHeartbeat =
          !streaming && enableHeartbeatAutomationRendering
            ? parseHeartbeatAssistantMessage(item.text)
            : null;
        const structuredOutput =
          !streaming && looksLikeJsonOutput(item.text)
            ? finalizeJsonOutputAssistantMessage({ message: item.text })
            : finalizeHeartbeatAssistantMessage({ parsedHeartbeat });
        const visibleContent =
          structuredOutput?.type === "heartbeat"
            ? (parsedHeartbeat?.visibleText ?? "")
            : item.text;

        items.push({
          type: "assistant-message",
          content: visibleContent,
          completed: !streaming,
          phase: item.phase,
          renderPlaceholderWhileStreaming,
          structuredOutput,
        });
        break;
      }
      case "plan": {
        const streaming =
          conversation_turn.status === "inProgress" &&
          lastNonUserMessageIndex >= 0 &&
          index === lastNonUserMessageIndex;
        items.push({
          type: "proposed-plan",
          content: item.text,
          completed: !streaming,
        });
        break;
      }
      case "reasoning": {
        const streaming =
          conversation_turn.status === "inProgress" &&
          lastNonUserMessageIndex >= 0 &&
          index === lastNonUserMessageIndex;
        const summaryParts = item.summary ?? [];
        const [firstSummaryPart, ...restSummaryParts] = summaryParts;
        const content =
          firstSummaryPart && restSummaryParts.length > 0
            ? firstSummaryPart.startsWith("**")
              ? [firstSummaryPart, ...restSummaryParts].join("\n\n")
              : [`**${firstSummaryPart}**`, ...restSummaryParts].join("\n\n")
            : (firstSummaryPart ?? "");

        if (content.length > 0) {
          const reasoningItem: ReasoningLocalConversationItem = {
            type: "reasoning",
            content,
            completed: !streaming,
          };
          items.push(reasoningItem);
        }
        break;
      }
      case "commandExecution": {
        const wasLocallyInterrupted =
          conversation_turn.interruptedCommandExecutionItemIds?.includes(
            item.id,
          ) === true;
        const executionStatus =
          item.status === "inProgress" &&
          (wasLocallyInterrupted || conversation_turn.status === "interrupted")
            ? "interrupted"
            : item.status;
        const parsedCmds = item.commandActions.map(mapCommandActionToParsedCmd);
        const parsedCmdsWithoutStatus =
          parsedCmds.length > 0
            ? parsedCmds
            : [
                {
                  type: "unknown" as const,
                  cmd: item.command,
                },
              ];
        const isFinished = executionStatus !== "inProgress";
        const hasAggregatedOutput = item.aggregatedOutput != null;
        const hasExitCode = item.exitCode != null;
        const output =
          hasAggregatedOutput || hasExitCode
            ? {
                aggregatedOutput: item.aggregatedOutput ?? "",
                exitCode: item.exitCode ?? undefined,
              }
            : null;

        parsedCmdsWithoutStatus.forEach((parsedCmdWithoutStatus, index) => {
          const callId =
            parsedCmdsWithoutStatus.length > 1
              ? `${item.id}:${index}`
              : item.id;
          const cmdText = parsedCmdWithoutStatus.cmd.trim();
          const parsedCmd = addStatusToParsedCmd(
            parsedCmdWithoutStatus,
            isFinished,
          );
          items.push({
            type: "exec",
            callId,
            ...(item.processId != null ? { processId: item.processId } : {}),
            cwd: item.cwd ? createGitCwd(item.cwd) : null,
            cmd: cmdText.length > 0 ? [cmdText] : [],
            executionStatus,
            proposedExecpolicyAmendment: null,
            parsedCmd,
            output,
            approvalRequestId: null,
          });
        });
        break;
      }
      case "fileChange": {
        addEditedArtifactsForFileChange(artifacts, item.changes);
        let success: boolean | null = null;
        switch (item.status) {
          case "inProgress":
            success = null;
            break;
          case "completed":
            success = true;
            break;
          case "failed":
            success = false;
            break;
          case "declined":
            success = false;
            break;
        }

        items.push({
          type: "patch",
          callId: item.id,
          changes: mapFileUpdateChanges(item.changes),
          success,
          grantRoot: null,
          approvalRequestId: null,
        });
        break;
      }
      case "mcpToolCall": {
        const mcpToolCallItem: McpToolCallConversationItem = {
          type: "mcp-tool-call",
          callId: item.id,
          functionName: `${item.server}__${item.tool}`,
          invocation: {
            server: item.server,
            tool: item.tool,
            arguments: item.arguments,
          },
          result: mapMcpToolCallResult(item.result, item.error),
          durationMs: item.durationMs,
          completed: item.status === "completed" || item.status === "failed",
        };
        items.push(mcpToolCallItem);
        break;
      }
      case "dynamicToolCall": {
        break;
      }
      case "collabAgentToolCall": {
        if (!isBackgroundSubagentsEnabled) {
          break;
        }
        if (item.tool === "wait") {
          break;
        }
        const multiAgentActionItem: MultiAgentActionLocalConversationItem = {
          type: "multi-agent-action",
          id: item.id,
          action: item.tool,
          status: item.status,
          senderThreadId: item.senderThreadId,
          receiverThreads: item.receiverThreads,
          prompt: item.prompt,
          model: item.model,
          agentsStates: item.agentsStates,
        };
        items.push(multiAgentActionItem);
        break;
      }
      case "todo-list": {
        items.push({
          type: "todo-list",
          explanation: item.explanation ?? null,
          plan: mapPlanSteps(item.plan),
        });
        break;
      }
      case "planImplementation": {
        items.push({
          type: "plan-implementation",
          id: item.id,
          turnId: item.turnId,
          planContent: item.planContent,
          isCompleted: item.isCompleted,
        });
        break;
      }
      case "hook": {
        items.push({
          type: "hook",
          id: item.id,
          run: item.run,
        });
        break;
      }
      case "error": {
        if (item.willRetry) {
          items.push({
            type: "stream-error",
            content: item.message,
            additionalDetails: item.additionalDetails ?? null,
          });
        } else {
          items.push({
            type: "system-error",
            content: item.message,
          });
        }
        break;
      }
      case "automaticApprovalReview":
        break;
      case "remoteTaskCreated": {
        items.push({
          type: "remote-task-created",
          taskId: item.taskId,
        });
        break;
      }
      case "personalityChanged": {
        items.push({
          type: "personality-changed",
          id: item.id,
          personality: item.personality,
        });
        break;
      }
      case "forkedFromConversation": {
        items.push({
          type: "forked-from-conversation",
          id: item.id,
          sourceConversationId: item.sourceConversationId,
        });
        break;
      }
      case "modelChanged": {
        items.push({
          type: "model-changed",
          id: item.id,
          fromModel: item.fromModel,
          toModel: item.toModel,
        });
        break;
      }
      case "modelRerouted": {
        items.push({
          type: "model-rerouted",
          id: item.id,
          fromModel: item.fromModel,
          toModel: item.toModel,
          reason: item.reason,
        });
        break;
      }
      case "userInputResponse": {
        items.push({
          type: "user-input-response",
          requestId: item.requestId,
          turnId: item.turnId,
          questionsAndAnswers: item.questions.map((question) => ({
            id: question.id,
            header: question.header,
            question: question.question,
            answers: item.answers[question.id] ?? [],
          })),
          completed: item.completed,
        });
        break;
      }
      case "mcpServerElicitation": {
        items.push({
          type: "mcp-server-elicitation",
          requestId: item.requestId,
          turnId: item.turnId,
          elicitation: item.elicitation,
          completed: item.completed,
          action: item.action,
        });
        break;
      }
      case "webSearch": {
        const streaming =
          conversation_turn.status === "inProgress" &&
          lastNonUserMessageIndex >= 0 &&
          index === lastNonUserMessageIndex;
        items.push({
          type: "web-search",
          query: item.query,
          action: item.action,
          completed: !streaming,
        });
        break;
      }
      case "contextCompaction": {
        const completed = "completed" in item ? item.completed : true;
        items.push({
          type: "context-compaction",
          id: item.id,
          completed,
        });
        break;
      }
      case "userMessage": {
        if (
          isLeadingServerUserMessageForTurn(
            conversation_turn.items,
            index,
            item.content,
            conversation_turn.params?.input ?? [],
          )
        ) {
          break;
        }

        const userMessageItem = buildUserMessageItemFromInput(
          item.content,
          item.attachments ?? extractAttachmentsFromUserInputs(item.content),
          { enableHeartbeatAutomationRendering },
        ).item;
        if (userMessageItem) {
          items.push(userMessageItem);
        }
        break;
      }
      case "imageGeneration": {
        const streaming =
          conversation_turn.status === "inProgress" &&
          lastNonUserMessageIndex >= 0 &&
          index === lastNonUserMessageIndex;
        const persistedImageSource = toMarkdownImage(
          getSavedPath(item) ?? "",
          "Generated image",
        );
        const imageSource =
          persistedImageSource ??
          (typeof item.result === "string"
            ? toMarkdownImage(item.result, "Generated image")
            : null);
        const isInProgressStatus =
          item.status === "in_progress" || item.status === "inProgress";

        items.push({
          type: "assistant-message",
          content: imageSource ?? "Generating image…",
          completed: !streaming && !isInProgressStatus,
          phase: null,
          renderPlaceholderWhileStreaming: imageSource == null,
          structuredOutput: undefined,
        });

        break;
      }

      case "imageView": {
        const imageMarkdown = toMarkdownImage(item.path, "Image");
        if (imageMarkdown == null) {
          break;
        }

        items.push({
          type: "assistant-message",
          content: imageMarkdown,
          completed: true,
          phase: null,
          renderPlaceholderWhileStreaming: false,
          structuredOutput: undefined,
        });
        break;
      }
      case "enteredReviewMode":
      case "exitedReviewMode":
        break;
    }

    renderAutomaticApprovalReviewItems({
      items,
      automaticApprovalReviewItems,
      renderedAutomaticApprovalReviewItemIds,
    });
  }

  for (const item of conversation_turn.items) {
    if (
      item?.type !== "automaticApprovalReview" ||
      renderedAutomaticApprovalReviewItemIds.has(item.id)
    ) {
      continue;
    }
    items.push(mapAutomaticApprovalReviewItem(item));
  }

  if (conversation_turn.diff) {
    items.push({
      type: "turn-diff",
      unifiedDiff: conversation_turn.diff,
      cwd: conversation_turn.params.cwd
        ? createGitCwd(conversation_turn.params.cwd)
        : null,
    });
  }

  for (const request of requests) {
    switch (request.method) {
      case "item/commandExecution/requestApproval": {
        const { id, params } = request;
        const proposedCommand = params.proposedExecpolicyAmendment ?? [];
        const parsedCmds =
          params.commandActions?.map(mapCommandActionToParsedCmd) ?? [];
        const parsedCmdTexts = parsedCmds.map((parsedCmd) => parsedCmd.cmd);
        const fallbackCmd =
          params.command ??
          (proposedCommand.length > 0 ? quoteCmd(proposedCommand) : "");
        const commandText =
          parsedCmdTexts.length > 0 ? parsedCmdTexts.join(" && ") : fallbackCmd;
        const parsedCmdWithoutStatus = parsedCmds[0] ?? {
          type: "unknown",
          cmd: commandText,
        };
        items.push({
          type: "exec",
          callId: params.itemId,
          cwd: conversation_turn.params?.cwd
            ? createGitCwd(conversation_turn.params.cwd)
            : null,
          cmd: parsedCmdTexts.length > 0 ? parsedCmdTexts : [fallbackCmd],
          approvalReason: params.reason,
          networkApprovalContext: params.networkApprovalContext,
          proposedNetworkPolicyAmendments:
            params.proposedNetworkPolicyAmendments,
          proposedExecpolicyAmendment: params.proposedExecpolicyAmendment,
          parsedCmd: addStatusToParsedCmd(parsedCmdWithoutStatus, false),
          output: null,
          approvalRequestId: createMcpRequestId(id),
        });
        break;
      }

      case "item/fileChange/requestApproval": {
        const { id, params } = request;
        const approvalRequestId = createMcpRequestId(id);
        const patchItem = findLast(
          items,
          (item): item is PatchApplyLocalConversationItem =>
            item.type === "patch" && item.callId === params.itemId,
        );

        if (patchItem) {
          patchItem.approvalRequestId = approvalRequestId;
          patchItem.grantRoot = params.grantRoot
            ? createGitCwd(params.grantRoot)
            : null;
        } else {
          logger.warning(
            "Patch approval for unknown itemId; skipping attachment",
            { safe: { itemId: params.itemId }, sensitive: {} },
          );
        }

        break;
      }
      case "item/tool/requestUserInput": {
        const { id, params } = request;
        const requestCompleted =
          (request as { completed?: boolean }).completed === true;
        const questions = params.questions.map((question) => ({
          id: question.id,
          header: question.header,
          question: question.question,
          isOther: question.isOther === true,
          options: (question.options ?? []).map((option) => ({
            label: option.label,
            description: option.description,
          })),
        }));
        items.push({
          type: "userInput",
          requestId: createMcpRequestId(id),
          callId: params.itemId,
          turnId: params.turnId,
          questions,
          completed: requestCompleted,
        });
        break;
      }
      case "account/chatgptAuthTokens/refresh":
      case "mcpServer/elicitation/request":
      case "item/permissions/requestApproval":
      case "item/tool/call": {
        break;
      }
      case PLAN_IMPLEMENTATION_REQUEST_METHOD: {
        break;
      }
      case "applyPatchApproval":
      case "execCommandApproval": {
        logger.warning("Ignoring legacy approval request method", {
          safe: { method: request.method },
          sensitive: {},
        });
        break;
      }
    }
  }

  const status = mapTurnStatus(conversation_turn.status);
  const itemsWithWorkedFor = maybeInsertWorkedForItem({
    items,
    status,
    turnStartedAtMs: conversation_turn.turnStartedAtMs ?? null,
    finalAssistantStartedAtMs:
      conversation_turn.finalAssistantStartedAtMs ?? null,
  });

  return {
    items: itemsWithWorkedFor,
    status,
    cwd: conversation_turn.params?.cwd
      ? createGitCwd(conversation_turn.params.cwd)
      : null,
    collaborationMode: conversation_turn.params?.collaborationMode ?? null,
    artifacts: finalizeLocalConversationTurnArtifacts(artifacts),
  };
}

function groupAutomaticApprovalReviewItemsByTargetItemId(
  items: AppServerConversationTurn["items"],
): Map<
  string,
  Array<
    Extract<
      AppServerConversationTurn["items"][number],
      {
        type: "automaticApprovalReview";
      }
    >
  >
> {
  const groupedItems = new Map<
    string,
    Array<
      Extract<
        AppServerConversationTurn["items"][number],
        {
          type: "automaticApprovalReview";
        }
      >
    >
  >();

  for (const item of items) {
    if (item?.type !== "automaticApprovalReview") {
      continue;
    }
    const reviewItems = groupedItems.get(item.targetItemId) ?? [];
    reviewItems.push(item);
    groupedItems.set(item.targetItemId, reviewItems);
  }

  return groupedItems;
}

function shouldRenderAutomaticApprovalReviewBeforeTargetItem(
  itemType: AppServerConversationTurn["items"][number]["type"],
): boolean {
  return (
    itemType === "commandExecution" ||
    itemType === "fileChange" ||
    itemType === "mcpToolCall"
  );
}

function renderAutomaticApprovalReviewItems({
  items,
  automaticApprovalReviewItems,
  renderedAutomaticApprovalReviewItemIds,
}: {
  items: Array<LocalConversationItemOrHook>;
  automaticApprovalReviewItems: Array<
    Extract<
      AppServerConversationTurn["items"][number],
      {
        type: "automaticApprovalReview";
      }
    >
  >;
  renderedAutomaticApprovalReviewItemIds: Set<string>;
}): void {
  for (const automaticApprovalReviewItem of automaticApprovalReviewItems) {
    if (
      renderedAutomaticApprovalReviewItemIds.has(automaticApprovalReviewItem.id)
    ) {
      continue;
    }
    items.push(mapAutomaticApprovalReviewItem(automaticApprovalReviewItem));
    renderedAutomaticApprovalReviewItemIds.add(automaticApprovalReviewItem.id);
  }
}

function mapAutomaticApprovalReviewItem(
  item: Extract<
    AppServerConversationTurn["items"][number],
    {
      type: "automaticApprovalReview";
    }
  >,
): LocalConversationItem {
  return {
    type: "automatic-approval-review",
    id: item.id,
    targetItemId: item.targetItemId,
    status: item.status,
    riskScore: item.riskScore,
    riskLevel: item.riskLevel,
    rationale: item.rationale,
  };
}

export function hasRenderableLocalConversationTurn(
  conversationTurn: AppServerConversationTurn,
  requests: Array<ConversationRequest>,
  options?: {
    isBackgroundSubagentsEnabled?: boolean;
  },
): boolean {
  return (
    mapStateToLocalConversationItems(conversationTurn, requests, options).items
      .length > 0
  );
}

function maybeInsertWorkedForItem({
  items,
  status,
  turnStartedAtMs,
  finalAssistantStartedAtMs,
}: {
  items: Array<LocalConversationItemOrHook>;
  status: LocalConversationTurn["status"];
  turnStartedAtMs: number | null;
  finalAssistantStartedAtMs: number | null;
}): Array<LocalConversationItemOrHook> {
  const workedForAssistantIndex = findWorkedForAssistantIndex(items, status);
  if (workedForAssistantIndex < 0) {
    return items;
  }

  const hasAboveAssistantWork = hasRenderableAboveAssistantItemBeforeIndex(
    items,
    workedForAssistantIndex,
  );
  const timeLabel = getWorkedForTimeLabel({
    hasAssistant: true,
    hasAboveAssistantWork,
    turnStartedAtMs,
    finalAssistantStartedAtMs,
  });
  if (timeLabel == null) {
    return items;
  }

  return [
    ...items.slice(0, workedForAssistantIndex),
    {
      type: "worked-for",
      timeLabel,
    },
    ...items.slice(workedForAssistantIndex),
  ];
}

function findWorkedForAssistantIndex(
  items: Array<LocalConversationItemOrHook>,
  status: LocalConversationTurn["status"],
): number {
  if (status !== "complete") {
    for (const [index, item] of items.entries()) {
      if (item.type === "assistant-message" && item.phase === "final_answer") {
        return index;
      }
    }

    return -1;
  }

  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index]?.type === "assistant-message") {
      return index;
    }
  }
  return -1;
}

function hasRenderableAboveAssistantItemBeforeIndex(
  items: Array<LocalConversationItemOrHook>,
  endExclusive: number,
): boolean {
  for (let index = 0; index < endExclusive; index += 1) {
    const item = items[index];
    if (item != null && isVisibleAboveAssistantItem(item)) {
      return true;
    }
  }
  return false;
}

function isVisibleAboveAssistantItem(
  item: LocalConversationItemOrHook,
): boolean {
  switch (item.type) {
    case "assistant-message":
    case "model-changed":
    case "model-rerouted":
    case "exec":
    case "patch":
    case "mcp-tool-call":
    case "automatic-approval-review":
    case "hook":
    case "stream-error":
    case "system-error":
    case "context-compaction":
    case "user-input-response":
    case "mcp-server-elicitation":
      return true;
    case "web-search":
      return item.query.trim().length > 0;
    case "reasoning":
    case "todo-list":
    case "turn-diff":
    case "user-message":
    case "worked-for":
    case "proposed-plan":
    case "plan-implementation":
    case "remote-task-created":
    case "personality-changed":
    case "forked-from-conversation":
    case "userInput":
    case "multi-agent-action":
      return false;
  }
}

function isLeadingServerUserMessageForTurn(
  items: AppServerConversationTurn["items"],
  targetIndex: number,
  content: Array<AppServer.v2.UserInput>,
  paramsInput: Array<AppServer.v2.UserInput>,
): boolean {
  if (!isEqual(content, paramsInput)) {
    return false;
  }

  for (let index = 0; index < targetIndex; index += 1) {
    const item = items[index];
    if (item == null || isLeadingSyntheticTurnItem(item)) {
      continue;
    }
    return false;
  }

  return true;
}

function isLeadingSyntheticTurnItem(
  item: AppServerConversationTurn["items"][number],
): boolean {
  return (
    item.type === "automaticApprovalReview" ||
    item.type === "forkedFromConversation" ||
    item.type === "hook" ||
    item.type === "modelChanged" ||
    item.type === "modelRerouted" ||
    item.type === "personalityChanged" ||
    item.type === "remoteTaskCreated"
  );
}

function extractAttachmentsFromUserInputs(
  input: Array<AppServer.v2.UserInput>,
): Array<FileDescriptor> {
  const textItems = input.filter(
    (item): item is Extract<AppServer.v2.UserInput, { type: "text" }> =>
      item.type === "text",
  );
  if (textItems.length === 0) {
    return [];
  }

  return extractFileAttachmentsFromPrompt(
    textItems.map((item) => item.text).join("\n"),
  );
}

function finalizeJsonOutputAssistantMessage({
  message,
}: {
  message: string;
}): AssistantMessageStructuredOutput | undefined {
  const parseResult = parseAssistantMessageJson(
    message,
    codeReviewResponseSchema,
  );
  if (!parseResult) {
    return undefined;
  }

  if (parseResult.success) {
    const data = parseResult.data;
    return {
      type: "code-review",
      findings: data.findings,
      overallCorrectness: data.overall_correctness ?? null,
      overallExplanation: data.overall_explanation ?? null,
      overallConfidenceScore: data.overall_confidence_score ?? null,
    };
  }
  return undefined;
}

function finalizeHeartbeatAssistantMessage({
  parsedHeartbeat,
}: {
  parsedHeartbeat: ReturnType<typeof parseHeartbeatAssistantMessage>;
}): AssistantMessageStructuredOutput | undefined {
  if (parsedHeartbeat == null) {
    return undefined;
  }
  return {
    type: "heartbeat",
    decision: parsedHeartbeat.decision,
    notificationMessage: parsedHeartbeat.notificationMessage,
  };
}
