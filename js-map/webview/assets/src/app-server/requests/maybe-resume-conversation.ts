import type * as AppServer from "app-server-types";
import { castDraft } from "immer";
import {
  APPROVALS_REVIEWER_USER,
  buildWorkspaceWritePermissionsConfig,
  type ConversationId,
  type PermissionsConfig,
} from "protocol";

import { getDefaultServiceTierValue } from "@/utils/local-service-tier";
import { logger } from "@/utils/logger";

import type { AppServerManager } from "../app-server-manager";
import type { AppServerConversationTurn } from "../app-server-manager-types";
import { registerAgentNicknameFromThread } from "../utils/collab-agent-tool-call-item";
import { getConversationCwd } from "../utils/get-conversation-cwd";
import { mapResumeOrForkConversationResponseToTurns } from "../utils/map-resume-or-fork-conversation-response-to-turns";
import { normalizeModelParam } from "../utils/normalize-model-param";

export async function maybeResumeConversation(
  appServerManager: AppServerManager,
  {
    conversationId,
    model,
    serviceTier,
    reasoningEffort,
    workspaceRoots,
    permissions,
    collaborationMode,
  }: {
    conversationId: ConversationId;
    model: string | null;
    serviceTier?: AppServer.ServiceTier | null;
    reasoningEffort: AppServer.ReasoningEffort | null;
    workspaceRoots: Array<string>;
    permissions?: PermissionsConfig;
    collaborationMode?: AppServer.CollaborationMode | null;
  },
): Promise<void> {
  appServerManager.ensureRecentConversationId(conversationId);
  const conversation = appServerManager.getConversation(conversationId);
  const isMissingStreamRole =
    appServerManager.getStreamRole(conversationId) == null;
  if (conversation == null) {
    const now = Date.now();
    appServerManager.setConversation({
      id: conversationId,
      hostId: appServerManager.getHostId(),
      turns: [],
      pendingSteers: [],
      requests: [],
      createdAt: now,
      updatedAt: now,
      title: null,
      latestModel: "",
      latestReasoningEffort: null,
      previousTurnModel: null,
      latestCollaborationMode: {
        mode: "default",
        settings: {
          reasoning_effort: null,
          model: "",
          developer_instructions: null,
        },
      },
      hasUnreadTurn: false,
      threadRuntimeStatus: null,
      rolloutPath: "",
      cwd: "",
      gitInfo: null,
      resumeState: "needs_resume",
      latestTokenUsageInfo: null,
    });
  } else if (
    conversation.resumeState !== "needs_resume" &&
    !isMissingStreamRole
  ) {
    return;
  } else if (
    appServerManager.isConversationStreaming(conversationId) &&
    !isMissingStreamRole
  ) {
    return;
  }

  const effectiveWorkspaceRoots =
    conversation?.cwd != null && conversation.cwd !== ""
      ? [
          conversation.cwd,
          ...workspaceRoots.filter((root) => root !== conversation.cwd),
        ]
      : workspaceRoots.length > 0
        ? workspaceRoots
        : [];
  appServerManager.updateConversationState(conversationId, (draft) => {
    draft.resumeState = "resuming";
  });
  const latestTurnParams = conversation?.turns.at(-1)?.params;
  const defaultPermissions = buildWorkspaceWritePermissionsConfig(
    effectiveWorkspaceRoots,
  );
  const inheritedApprovalsReviewer =
    permissions?.approvalsReviewer ??
    latestTurnParams?.approvalsReviewer ??
    APPROVALS_REVIEWER_USER;
  const perms = permissions ?? {
    approvalPolicy:
      latestTurnParams?.approvalPolicy ?? defaultPermissions.approvalPolicy,
    approvalsReviewer: inheritedApprovalsReviewer,
    sandboxPolicy:
      latestTurnParams?.sandboxPolicy ?? defaultPermissions.sandboxPolicy,
  };
  const requestedModel =
    model ??
    conversation?.latestCollaborationMode.settings.model ??
    collaborationMode?.settings.model ??
    null;
  const createRequest = await appServerManager.buildNewConversationParams(
    requestedModel,
    serviceTier !== undefined
      ? serviceTier
      : appServerManager.getEffectiveServiceTier(getDefaultServiceTierValue()),
    effectiveWorkspaceRoots[0] ?? "/",
    perms,
    perms.approvalsReviewer,
    {
      threadId: conversationId as string,
    },
  );
  const resumeResponse: AppServer.v2.ThreadResumeResponse =
    await appServerManager.sendRequest("thread/resume", {
      threadId: conversationId as string,
      history: null,
      path: conversation?.rolloutPath ?? null,
      model: null,
      modelProvider: createRequest.modelProvider,
      serviceTier: createRequest.serviceTier,
      cwd: createRequest.cwd,
      ...(permissions != null
        ? {
            approvalPolicy: createRequest.approvalPolicy,
            approvalsReviewer: createRequest.approvalsReviewer,
            sandbox: createRequest.sandbox,
          }
        : {}),
      config: createRequest.config,
      baseInstructions: createRequest.baseInstructions,
      developerInstructions: createRequest.developerInstructions,
      personality: createRequest.personality,
      persistExtendedHistory: false,
    });
  const sessionCwd = resumeResponse.cwd;
  const threadCwd = resumeResponse.thread.cwd;
  const cwd = getConversationCwd({
    requestedCwd: conversation?.cwd ?? effectiveWorkspaceRoots[0] ?? null,
    responseCwd: sessionCwd ?? null,
    threadCwd,
    fallbackCwd: effectiveWorkspaceRoots[0],
  });
  const gitInfo = resumeResponse.thread.gitInfo;
  const threadName = resumeResponse.thread.name?.trim() ?? "";
  registerAgentNicknameFromThread(resumeResponse.thread);

  const turns = mapResumeOrForkConversationResponseToTurns(resumeResponse, {
    fallbackCwd: cwd ?? null,
  });
  const mergedTurns = mergeResumedConversationTurns(
    conversation?.turns ?? [],
    turns,
  );
  appServerManager.updateConversationState(conversationId, (draft) => {
    draft.turns = mergedTurns.map(castDraft);
    const resumeModel = normalizeModelParam(resumeResponse.model);
    draft.latestModel = resumeModel ?? draft.latestModel;
    draft.rolloutPath = resumeResponse.thread.path ?? draft.rolloutPath;
    draft.latestReasoningEffort =
      reasoningEffort ??
      resumeResponse.reasoningEffort ??
      draft.latestReasoningEffort;
    draft.resumeState = "resumed";
    draft.cwd = cwd;
    draft.source = resumeResponse.thread.source;
    draft.gitInfo = gitInfo;
    if (!draft.title && threadName) {
      draft.title = threadName;
    }
    const updatedAtMs = Number(resumeResponse.thread.updatedAt) * 1000;
    if (Number.isFinite(updatedAtMs)) {
      draft.updatedAt = Math.max(draft.updatedAt, updatedAtMs);
    }
    draft.latestCollaborationMode = {
      mode: "default",
      settings: {
        ...collaborationMode?.settings,
        model: resumeResponse.model ?? draft.latestModel,
        reasoning_effort:
          resumeResponse.reasoningEffort ?? draft.latestReasoningEffort,
        developer_instructions: null,
      },
    };
  });
  const latestResumedTurn = mergedTurns.at(-1) ?? null;
  // Resume re-establishes this window as the local controller for the thread.
  // Restore both streaming status and owner role so startTurn/interrupt preflights
  // keep working for completed threads after reconnect.
  appServerManager.markConversationStreaming(conversationId);
  appServerManager.setConversationStreamRole(conversationId, {
    role: "owner",
  });
  logger.info("maybe_resume_success", {
    safe: {
      conversationId,
      turnCount: mergedTurns.length,
      latestTurnId: latestResumedTurn?.turnId ?? null,
      latestTurnStatus: latestResumedTurn?.status ?? null,
      markedStreaming: true,
    },
    sensitive: {},
  });
  void appServerManager
    .loadThreadTitleCache()
    .then((cache) => {
      const persistedTitle =
        threadName || (cache.titles[conversationId] ?? null);
      if (!persistedTitle) {
        return;
      }
      appServerManager.updateConversationState(conversationId, (draft) => {
        if (!draft.title) {
          draft.title = persistedTitle;
        }
      });
    })
    .catch((error) => {
      logger.warning("Failed to hydrate persisted thread title after resume", {
        safe: { conversationId },
        sensitive: { error },
      });
    });
}

function mergeResumedConversationTurns(
  existingTurns: Array<AppServerConversationTurn>,
  resumedTurns: Array<AppServerConversationTurn>,
): Array<AppServerConversationTurn> {
  const existingTurnIds = new Set(
    existingTurns.flatMap((turn) => (turn.turnId == null ? [] : [turn.turnId])),
  );
  const resumedTurnsById = new Map(
    resumedTurns.flatMap((turn) =>
      turn.turnId == null ? [] : [[turn.turnId, turn] as const],
    ),
  );
  const mergedTurns = existingTurns.flatMap((existingTurn) => {
    if (isPreviewPlaceholderTurn(existingTurn)) {
      return [];
    }
    if (existingTurn.turnId == null) {
      return [existingTurn];
    }

    const resumedTurn = resumedTurnsById.get(existingTurn.turnId);
    if (!resumedTurn) {
      return [existingTurn];
    }

    return [getMoreCompleteTurn(existingTurn, resumedTurn)];
  });

  for (const resumedTurn of resumedTurns) {
    if (resumedTurn.turnId != null && existingTurnIds.has(resumedTurn.turnId)) {
      continue;
    }

    mergedTurns.push(resumedTurn);
  }

  return mergedTurns;
}

function getMoreCompleteTurn(
  existingTurn: AppServerConversationTurn,
  resumedTurn: AppServerConversationTurn,
): AppServerConversationTurn {
  return {
    ...resumedTurn,
    items:
      existingTurn.items.length > resumedTurn.items.length
        ? existingTurn.items
        : resumedTurn.items,
    turnStartedAtMs:
      existingTurn.turnStartedAtMs ?? resumedTurn.turnStartedAtMs,
    finalAssistantStartedAtMs:
      existingTurn.finalAssistantStartedAtMs ??
      resumedTurn.finalAssistantStartedAtMs,
  };
}

function isPreviewPlaceholderTurn(turn: AppServerConversationTurn): boolean {
  return (
    turn.turnId == null &&
    turn.status === "completed" &&
    turn.error == null &&
    turn.items.length === 0
  );
}
