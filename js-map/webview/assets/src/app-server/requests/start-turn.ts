import type * as AppServer from "app-server-types";
import { castDraft } from "immer";
import last from "lodash/last";
import {
  APPROVALS_REVIEWER_USER,
  buildWorkspaceWritePermissionsConfig,
  type ConversationId,
} from "protocol";
import { v4 as uuidv4 } from "uuid";

import { getDefaultServiceTierValue } from "@/utils/local-service-tier";
import { logger } from "@/utils/logger";
import type { OptionalFields } from "@/utils/types";

import type { AppServerManager } from "../app-server-manager";
import {
  DEFAULT_TIMEOUT_MS,
  OWNER_WINDOW_ERROR,
} from "../app-server-manager-constants";
import type {
  AppServerConversationTurn,
  LocalTurnStartParams,
} from "../app-server-manager-types";
import type { Item, ItemForType } from "../item-schema";
import { normalizeModelParam } from "../utils/normalize-model-param";

const TURN_START_SUMMARY: AppServer.ReasoningSummary = "none";

export type StartTurnRequestParams = OptionalFields<
  Omit<LocalTurnStartParams, "threadId" | "summary">,
  "model" | "effort" | "personality" | "outputSchema" | "collaborationMode"
>;

export async function startTurn(
  manager: AppServerManager,
  conversationId: ConversationId,
  params: StartTurnRequestParams,
): Promise<AppServer.v2.TurnStartResponse> {
  const role = manager.getStreamRole(conversationId);
  const followerStartTurnResponse = await manager.sendThreadFollowerRequest(
    role,
    "thread-follower-start-turn",
    {
      conversationId,
      turnStartParams: params,
    },
  );
  if (followerStartTurnResponse) {
    return followerStartTurnResponse.result;
  }

  if (role?.role !== "owner") {
    throw new Error(OWNER_WINDOW_ERROR);
  }

  if (!manager.isConversationStreaming(conversationId)) {
    logger.error("Conversation is not being streamed.", {
      safe: { conversationId },
      sensitive: {},
    });
    throw new Error(`Conversation ${conversationId} is not being streamed.`);
  }
  const conversationState = manager.getConversation(conversationId);
  if (!conversationState) {
    logger.error("Conversation state not found", {
      safe: { conversationId },
      sensitive: {},
    });
    throw new Error(`Conversation state for ${conversationId} not found`);
  }

  const collaborationModeForRequest =
    params.collaborationMode ?? conversationState.latestCollaborationMode;
  const modelForRequest =
    collaborationModeForRequest != null
      ? null
      : normalizeModelParam(params.model ?? conversationState.latestModel);
  const effortForRequest =
    collaborationModeForRequest != null
      ? null
      : (params.effort ?? conversationState.latestReasoningEffort);
  const latestTurn = last(conversationState.turns);
  const defaultPermissions = buildWorkspaceWritePermissionsConfig([]);

  const nextApprovalPolicy =
    params.approvalPolicy ??
    latestTurn?.params.approvalPolicy ??
    defaultPermissions.approvalPolicy;
  const nextSandboxPolicy =
    params.sandboxPolicy ??
    latestTurn?.params.sandboxPolicy ??
    defaultPermissions.sandboxPolicy;
  const nextApprovalsReviewer =
    params.approvalsReviewer ??
    latestTurn?.params.approvalsReviewer ??
    APPROVALS_REVIEWER_USER;
  const nextCwd = params.cwd ?? conversationState.cwd ?? null;
  const approvalPolicyForRequest = params.approvalPolicy ?? null;
  const sandboxPolicyForRequest = params.sandboxPolicy ?? null;
  const personality = manager.getPersonality();
  const serviceTierForRequest =
    params.serviceTier !== undefined
      ? manager.getEffectiveServiceTier(params.serviceTier)
      : manager.getEffectiveServiceTier(getDefaultServiceTierValue());

  const turnStartParams: LocalTurnStartParams = {
    threadId: conversationId as string,
    input: params.input,
    cwd: nextCwd,
    approvalPolicy: approvalPolicyForRequest,
    approvalsReviewer: nextApprovalsReviewer,
    sandboxPolicy: sandboxPolicyForRequest,
    model: null,
    serviceTier: serviceTierForRequest,
    effort: null,
    summary: TURN_START_SUMMARY,
    personality,
    outputSchema: params.outputSchema ?? null,
    collaborationMode: collaborationModeForRequest ?? null,
    attachments: params.attachments ?? [],
  };

  const paramsForState: LocalTurnStartParams = {
    threadId: conversationId as string,
    ...params,
    cwd: nextCwd,
    approvalPolicy: nextApprovalPolicy,
    approvalsReviewer: nextApprovalsReviewer,
    sandboxPolicy: nextSandboxPolicy,
    model: modelForRequest ?? null,
    serviceTier: serviceTierForRequest,
    effort: effortForRequest ?? null,
    summary: TURN_START_SUMMARY,
    personality,
    outputSchema: params.outputSchema ?? null,
    collaborationMode: collaborationModeForRequest ?? null,
  };

  manager.updateConversationState(conversationId, (draft) => {
    const items = Array<Item>();
    const pendingFromModel = draft.previousTurnModel;
    if (pendingFromModel != null) {
      const syntheticItem: ItemForType<"modelChanged"> = {
        id: uuidv4(),
        type: "modelChanged",
        fromModel: pendingFromModel,
        toModel: draft.latestCollaborationMode.settings.model,
      };
      items.push(syntheticItem);
      draft.previousTurnModel = null;
    }

    const newTurn: AppServerConversationTurn = {
      params: paramsForState,
      turnId: null,
      status: "inProgress",
      turnStartedAtMs: Date.now(),
      finalAssistantStartedAtMs: null,
      error: null,
      diff: null,
      items,
    };
    draft.turns.push(castDraft(newTurn));
    draft.latestModel = modelForRequest ?? draft.latestModel;
    draft.latestReasoningEffort =
      effortForRequest ?? draft.latestReasoningEffort;
    draft.latestCollaborationMode =
      collaborationModeForRequest ?? draft.latestCollaborationMode;
    draft.updatedAt = Date.now();
  });

  try {
    const result = await manager.sendRequest("turn/start", turnStartParams, {
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
    manager.updateConversationState(conversationId, (draft) => {
      const lastTurn = last(draft.turns);
      if (lastTurn) {
        lastTurn.turnId = result.turn.id;
        if (!lastTurn.items) {
          lastTurn.items = [];
        }
        lastTurn.status = result.turn.status;
      }
    });
    return result;
  } catch (error) {
    manager.updateConversationState(conversationId, (draft) => {
      const lastTurn = last(draft.turns);
      if (!lastTurn) {
        return;
      }

      const errorMessage = "Error submitting message";
      if (!lastTurn.items) {
        lastTurn.items = [];
      }
      lastTurn.items.push({
        type: "error",
        id: uuidv4(),
        message: errorMessage,
        willRetry: false,
        errorInfo: null,
        additionalDetails: null,
      });
      lastTurn.status = "failed";
      lastTurn.error = {
        message: errorMessage,
        codexErrorInfo: null,
        additionalDetails: null,
      };
    });
    throw error;
  }
}
