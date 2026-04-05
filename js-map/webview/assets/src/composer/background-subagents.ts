import type * as AppServer from "app-server-types";
import type { ConversationId } from "protocol";
import { createConversationId } from "protocol";

import type {
  AppServerConversationState,
  AppServerConversationTurn,
} from "@/app-server/app-server-manager-types";
import type { CollabAgentToolCallItem } from "@/app-server/item-schema";
import { getSubagentSourceMetadata } from "@/app-server/utils/get-subagent-source-metadata";
import { getThreadAgentNickname } from "@/app-server/utils/get-thread-agent-nickname";
import { parseDiff as parseGitDiff } from "@/diff/parse-diff";
import {
  getApprovalPendingRequestFromConversation,
  type PendingRequest,
} from "@/local-conversation/pending-request";

// Membership is the set of child threads this parent conversation spawned.
export type BackgroundSubagentMembership = {
  conversationId: ConversationId;
  thread: AppServer.v2.Thread | null;
};

export type BackgroundSubagentLatestReference = {
  tool: AppServer.v2.CollabAgentTool;
  parentTurnKey: string;
  thread: AppServer.v2.Thread | null;
  agentState: AppServer.v2.CollabAgentState | null;
  spawnModel: string | null;
};

export type BackgroundSubagentDisplayRow = {
  conversationId: ConversationId;
  displayName: string;
  agentRole: string | null;
  spawnModel: string | null;
  status: "active" | "waiting" | "done";
  statusSummary: string | null;
  diffStats: {
    linesAdded: number;
    linesRemoved: number;
  } | null;
};

export type BackgroundSubagentApprovalRow = {
  conversationId: ConversationId;
  mentionLabel: string;
  pendingRequest: Extract<PendingRequest, { type: "approval" }>;
};

type BackgroundSubagentParentConversation = {
  turns: AppServerConversationState["turns"];
};

export function collectBackgroundSubagentMemberships(
  conversation: BackgroundSubagentParentConversation | null,
): Array<BackgroundSubagentMembership> {
  if (conversation == null) {
    return [];
  }

  const membershipsByConversationId = new Map<
    ConversationId,
    BackgroundSubagentMembership
  >();

  for (const turn of conversation.turns) {
    for (const item of turn.items) {
      if (item.type !== "collabAgentToolCall" || item.tool !== "spawnAgent") {
        continue;
      }

      const receiverThreadsById = getReceiverThreadsById(item);
      for (const receiverThreadId of item.receiverThreadIds) {
        const conversationId = createConversationId(receiverThreadId);
        if (membershipsByConversationId.has(conversationId)) {
          continue;
        }

        membershipsByConversationId.set(conversationId, {
          conversationId,
          thread: receiverThreadsById.get(receiverThreadId) ?? null,
        });
      }
    }
  }

  return Array.from(membershipsByConversationId.values());
}

export function collectBackgroundSubagentLatestReferences(params: {
  conversation: BackgroundSubagentParentConversation | null;
  memberships: Array<BackgroundSubagentMembership>;
}): Map<ConversationId, BackgroundSubagentLatestReference> {
  if (params.conversation == null || params.memberships.length === 0) {
    return new Map();
  }

  const membershipByConversationId = new Map<
    ConversationId,
    BackgroundSubagentMembership
  >();
  for (const membership of params.memberships) {
    membershipByConversationId.set(membership.conversationId, membership);
  }
  const latestReferences = new Map<
    ConversationId,
    BackgroundSubagentLatestReference
  >();

  for (
    let turnIndex = 0;
    turnIndex < params.conversation.turns.length;
    turnIndex += 1
  ) {
    const turn = params.conversation.turns[turnIndex];
    if (turn == null) {
      continue;
    }

    for (const item of turn.items) {
      if (item.type !== "collabAgentToolCall") {
        continue;
      }

      const receiverThreadsById = getReceiverThreadsById(item);
      const parentTurnKey = getBackgroundSubagentTurnKey(turn, turnIndex);

      for (const receiverThreadId of item.receiverThreadIds) {
        const conversationId = createConversationId(receiverThreadId);
        const membership = membershipByConversationId.get(conversationId);
        const previousReference = latestReferences.get(conversationId);
        if (membership == null) {
          continue;
        }

        latestReferences.set(conversationId, {
          tool:
            item.tool === "wait"
              ? (previousReference?.tool ?? item.tool)
              : item.tool,
          parentTurnKey,
          thread:
            receiverThreadsById.get(receiverThreadId) ??
            previousReference?.thread ??
            membership.thread,
          agentState:
            item.agentsStates[receiverThreadId] ??
            previousReference?.agentState ??
            null,
          spawnModel:
            item.tool === "spawnAgent"
              ? (item.model ?? previousReference?.spawnModel ?? null)
              : (previousReference?.spawnModel ?? null),
        });
      }
    }
  }

  return latestReferences;
}

export function getBackgroundSubagentParentTurnKey(
  conversation: BackgroundSubagentParentConversation | null,
): string {
  if (conversation == null || conversation.turns.length === 0) {
    return "0";
  }

  const lastTurnIndex = conversation.turns.length - 1;
  return getBackgroundSubagentTurnKey(
    conversation.turns[lastTurnIndex] ?? null,
    lastTurnIndex,
  );
}

export function getBackgroundSubagentTurnKey(
  turn: AppServerConversationTurn | null | undefined,
  turnIndex: number,
): string {
  if (turn?.turnId != null) {
    return turn.turnId;
  }

  return `${turnIndex + 1}`;
}

export function getBackgroundSubagentStatusSummary(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  let normalized = value
    .replace(/^\s*(?:>\s*|#{1,6}\s+|(?:[-*+]|\d+\.)\s+)*/u, "")
    .replace(/\*/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  normalized = stripWrappedBackgroundSubagentStatusMarkdown(normalized);
  normalized = normalized.replace(/^(?:i['’]m|i am)\s+/iu, "");
  normalized = normalized.replace(/[.!?;,:]+$/u, "").trim();

  if (normalized.replace(/[*_`]/gu, "").trim().length === 0) {
    return null;
  }

  if (/^\p{Lu}\p{Ll}/u.test(normalized)) {
    normalized = `${normalized[0]?.toLowerCase() ?? ""}${normalized.slice(1)}`;
  }

  return normalized;
}

export function getLatestActiveBackgroundSubagentReasoningSummary(
  conversation: AppServerConversationState | null,
): string | null {
  if (conversation == null || conversation.turns.length === 0) {
    return null;
  }

  const latestTurn = conversation.turns[conversation.turns.length - 1] ?? null;
  if (latestTurn?.status !== "inProgress") {
    return null;
  }

  for (
    let itemIndex = latestTurn.items.length - 1;
    itemIndex >= 0;
    itemIndex -= 1
  ) {
    const item = latestTurn.items[itemIndex];
    if (item?.type !== "reasoning") {
      continue;
    }

    for (
      let summaryIndex = item.summary.length - 1;
      summaryIndex >= 0;
      summaryIndex -= 1
    ) {
      const normalized = getBackgroundSubagentStatusSummary(
        item.summary[summaryIndex],
      );
      if (normalized != null) {
        return normalized;
      }
    }
  }

  return null;
}

export function buildBackgroundSubagentDisplayRow(params: {
  membership: BackgroundSubagentMembership;
  latestReference: BackgroundSubagentLatestReference | null;
  childConversation: AppServerConversationState | null;
  isSuppressedAfterArchive: boolean;
  currentParentTurnKey: string;
}): BackgroundSubagentDisplayRow | null {
  if (params.isSuppressedAfterArchive) {
    return null;
  }

  const latestReference = params.latestReference;
  if (latestReference == null) {
    return null;
  }

  const latestStatus = latestReference.agentState?.status ?? null;
  const projectedActivity =
    getBackgroundSubagentProjectedActivity(latestStatus);
  if (latestReference.tool === "closeAgent" || projectedActivity === "hidden") {
    return null;
  }

  const isCurrentParentTurnReference =
    latestReference.parentTurnKey === params.currentParentTurnKey;
  const childConversationProgressState =
    getBackgroundSubagentConversationProgressState(params.childConversation);
  const isActive =
    childConversationProgressState === "inProgress" ||
    (projectedActivity === "active" && isCurrentParentTurnReference);
  const hasExplicitWaitingState = !isActive && projectedActivity === "waiting";
  const usesCurrentTurnWaitingFallback =
    !isActive &&
    !hasExplicitWaitingState &&
    isCurrentParentTurnReference &&
    projectedActivity !== "done";
  const isWaiting = hasExplicitWaitingState || usesCurrentTurnWaitingFallback;
  const isDone =
    !isActive &&
    !isWaiting &&
    (projectedActivity === "done" ||
      childConversationProgressState === "notInProgress");

  if (!isActive && !isWaiting && !isDone) {
    return null;
  }

  const displayName = getBackgroundSubagentDisplayName({
    membership: params.membership,
    latestReference,
    childConversation: params.childConversation,
  });
  const agentRole = getBackgroundSubagentRole({
    membership: params.membership,
    latestReference,
    childConversation: params.childConversation,
  });
  const diffStats = getBackgroundSubagentDiffStats(params.childConversation);

  if (isDone) {
    return {
      conversationId: params.membership.conversationId,
      displayName,
      agentRole,
      spawnModel: latestReference.spawnModel,
      status: "done",
      statusSummary: null,
      diffStats,
    };
  }

  if (isWaiting) {
    return {
      conversationId: params.membership.conversationId,
      displayName,
      agentRole,
      spawnModel: latestReference.spawnModel,
      status: "waiting",
      statusSummary: null,
      diffStats,
    };
  }

  return {
    conversationId: params.membership.conversationId,
    displayName,
    agentRole,
    spawnModel: latestReference.spawnModel,
    status: "active",
    statusSummary: getLatestActiveBackgroundSubagentReasoningSummary(
      params.childConversation,
    ),
    diffStats,
  };
}

export function collectBackgroundSubagentDisplayRows(params: {
  conversation: BackgroundSubagentParentConversation | null;
  memberships: Array<BackgroundSubagentMembership>;
  childConversations: Array<AppServerConversationState | null>;
  childConversationSuppressedStates: Array<boolean>;
}): Array<BackgroundSubagentDisplayRow> {
  const latestReferences = collectBackgroundSubagentLatestReferences({
    conversation: params.conversation,
    memberships: params.memberships,
  });
  const currentParentTurnKey = getBackgroundSubagentParentTurnKey(
    params.conversation,
  );
  const rows = Array<BackgroundSubagentDisplayRow>();

  for (let index = 0; index < params.memberships.length; index += 1) {
    const membership = params.memberships[index];
    if (membership == null) {
      continue;
    }

    const row = buildBackgroundSubagentDisplayRow({
      membership,
      latestReference: latestReferences.get(membership.conversationId) ?? null,
      childConversation: params.childConversations[index] ?? null,
      isSuppressedAfterArchive:
        params.childConversationSuppressedStates[index] ?? false,
      currentParentTurnKey,
    });
    if (row != null) {
      rows.push(row);
    }
  }

  return rows;
}

export function getFirstBackgroundSubagentApprovalRow(params: {
  activeConversationId: ConversationId | null;
  memberships: Array<BackgroundSubagentMembership>;
  childConversations: Array<AppServerConversationState | null>;
}): BackgroundSubagentApprovalRow | null {
  for (let index = 0; index < params.memberships.length; index += 1) {
    const membership = params.memberships[index];
    const childConversation = params.childConversations[index] ?? null;
    if (membership == null || childConversation == null) {
      continue;
    }

    if (membership.conversationId === params.activeConversationId) {
      continue;
    }

    const pendingRequest =
      getApprovalPendingRequestFromConversation(childConversation);
    if (pendingRequest == null) {
      continue;
    }

    return {
      conversationId: membership.conversationId,
      mentionLabel: getBackgroundSubagentApprovalMentionLabel({
        membership,
        childConversation,
      }),
      pendingRequest,
    };
  }

  return null;
}

function getReceiverThreadsById(
  item: CollabAgentToolCallItem,
): Map<string, AppServer.v2.Thread | null> {
  return new Map(
    item.receiverThreads.map((receiverThread) => [
      receiverThread.threadId,
      receiverThread.thread,
    ]),
  );
}

function getBackgroundSubagentDisplayName(params: {
  membership: BackgroundSubagentMembership;
  latestReference: BackgroundSubagentLatestReference;
  childConversation: AppServerConversationState | null;
}): string {
  const name =
    getThreadAgentNickname(params.latestReference.thread) ??
    getThreadAgentNickname(params.membership.thread) ??
    getSubagentSourceMetadata(params.childConversation?.source)
      ?.agentNickname ??
    `${params.membership.conversationId}`;

  return normalizeBackgroundSubagentName(name);
}

function getBackgroundSubagentApprovalMentionLabel(params: {
  membership: BackgroundSubagentMembership;
  childConversation: AppServerConversationState | null;
}): string {
  const name =
    getThreadAgentNickname(params.membership.thread) ??
    getSubagentSourceMetadata(params.childConversation?.source)
      ?.agentNickname ??
    "Agent";

  return normalizeBackgroundSubagentName(name);
}

function getBackgroundSubagentRole(params: {
  membership: BackgroundSubagentMembership;
  latestReference: BackgroundSubagentLatestReference;
  childConversation: AppServerConversationState | null;
}): string | null {
  const agentRole =
    params.latestReference.thread?.agentRole ??
    params.membership.thread?.agentRole ??
    getSubagentSourceMetadata(params.childConversation?.source)?.agentRole;

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

function normalizeBackgroundSubagentName(name: string): string {
  const trimmedName = name.trim();
  if (trimmedName.startsWith("@")) {
    return trimmedName.slice(1);
  }

  return trimmedName;
}

function stripWrappedBackgroundSubagentStatusMarkdown(value: string): string {
  let normalized = value;

  while (true) {
    const stripped = normalized
      .replace(/^\*\*(.+)\*\*$/u, "$1")
      .replace(/^__(.+)__$/u, "$1")
      .replace(/^\*(.+)\*$/u, "$1")
      .replace(/^_(.+)_$/u, "$1")
      .replace(/^`(.+)`$/u, "$1")
      .trim();

    if (stripped === normalized) {
      return normalized;
    }

    normalized = stripped;
  }
}

function getBackgroundSubagentConversationProgressState(
  conversation: AppServerConversationState | null,
): "inProgress" | "notInProgress" | "unknown" {
  if (conversation == null || conversation.turns.length === 0) {
    return "unknown";
  }

  if (
    conversation.turns[conversation.turns.length - 1]?.status === "inProgress"
  ) {
    return "inProgress";
  }

  return "notInProgress";
}

function getBackgroundSubagentDiffStats(
  conversation: AppServerConversationState | null,
): BackgroundSubagentDisplayRow["diffStats"] {
  const latestTurn = conversation?.turns.at(-1) ?? null;
  if (latestTurn?.diff == null) {
    return null;
  }

  const diffStats = { linesAdded: 0, linesRemoved: 0 };

  for (const diff of parseGitDiff(latestTurn.diff)) {
    diffStats.linesAdded += diff.additions;
    diffStats.linesRemoved += diff.deletions;
  }

  if (diffStats.linesAdded === 0 && diffStats.linesRemoved === 0) {
    return null;
  }

  return diffStats;
}

function getBackgroundSubagentProjectedActivity(
  status: AppServer.v2.CollabAgentStatus | null | undefined,
): "active" | "waiting" | "done" | "hidden" | "unknown" {
  switch (status) {
    case "pendingInit":
      return "waiting";
    case "running":
      return "active";
    case "completed":
      return "done";
    case "interrupted":
    case "errored":
    case "shutdown":
    case "notFound":
      return "hidden";
    case null:
    case undefined:
      return "unknown";
  }
}
