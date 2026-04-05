import type * as AppServer from "app-server-types";
import { castDraft, type WritableDraft } from "immer";
import last from "lodash/last";
import {
  buildWorkspaceWritePermissionsConfig,
  type ConversationId,
} from "protocol";
import { v4 as uuidv4 } from "uuid";

import { implementPlanPendingRequestId } from "@/local-conversation/pending-request";

import type { AppServerManager } from "./app-server-manager";
import type { AppServerConversationTurn } from "./app-server-manager-types";
import { PLAN_IMPLEMENTATION_REQUEST_METHOD } from "./conversation-request";
import type { ItemForType } from "./item-schema";
import { ensureTurnDefaults } from "./utils/ensure-turn-defaults";

type SyntheticConversationItem =
  | ItemForType<"forkedFromConversation">
  | ItemForType<"remoteTaskCreated">
  | ItemForType<"personalityChanged">;

function createSyntheticTurn(
  conversationId: ConversationId,
  item: SyntheticConversationItem,
): WritableDraft<AppServerConversationTurn> {
  const defaultPermissions = buildWorkspaceWritePermissionsConfig([]);
  return castDraft<AppServerConversationTurn>({
    params: {
      threadId: conversationId as string,
      input: [],
      cwd: null,
      approvalPolicy: defaultPermissions.approvalPolicy,
      sandboxPolicy: defaultPermissions.sandboxPolicy,
      model: null,
      effort: "minimal",
      summary: "none",
      personality: null,
      outputSchema: null,
      collaborationMode: null,
    },
    turnId: null,
    turnStartedAtMs: null,
    finalAssistantStartedAtMs: null,
    status: "completed",
    error: null,
    diff: null,
    items: [item],
  });
}

function appendSyntheticItemToLatestTurn(
  manager: AppServerManager,
  conversationId: ConversationId,
  item: SyntheticConversationItem,
): void {
  manager.updateConversationState(conversationId, (draft) => {
    const turn = last(draft.turns);
    if (turn) {
      ensureTurnDefaults(turn);
      turn.items.push(item);
      return;
    }
    draft.turns.push(createSyntheticTurn(conversationId, item));
  });
}

export function addForkedFromConversationSyntheticItem(
  manager: AppServerManager,
  conversationId: ConversationId,
  sourceConversationId: ConversationId,
  sourceConversationTitle: string | null,
): void {
  appendSyntheticItemToLatestTurn(manager, conversationId, {
    id: uuidv4(),
    type: "forkedFromConversation",
    sourceConversationId: sourceConversationId as string,
    sourceConversationTitle,
  });
}

export function addCloudTaskSyntheticItem(
  manager: AppServerManager,
  conversationId: ConversationId,
  taskId: string,
): void {
  appendSyntheticItemToLatestTurn(manager, conversationId, {
    id: uuidv4(),
    type: "remoteTaskCreated",
    taskId,
  });
}

export function addPersonalityChangeSyntheticItem(
  manager: AppServerManager,
  conversationId: ConversationId,
  personality: AppServer.Personality,
): void {
  appendSyntheticItemToLatestTurn(manager, conversationId, {
    id: uuidv4(),
    type: "personalityChanged",
    personality,
  });
}

export function setPlanImplementationSyntheticItem(
  manager: AppServerManager,
  conversationId: ConversationId,
  turnId: string,
  planContent: string,
): void {
  const syntheticItem: ItemForType<"planImplementation"> = {
    id: implementPlanPendingRequestId(turnId),
    type: "planImplementation",
    turnId,
    planContent,
    isCompleted: false,
  };

  manager.updateConversationState(conversationId, (draft) => {
    const targetTurn = draft.turns.find(
      (candidate) => candidate.turnId === turnId,
    );
    if (!targetTurn) {
      return;
    }
    ensureTurnDefaults(targetTurn);
    targetTurn.items = targetTurn.items.filter(
      (item) => item.type !== "planImplementation",
    );
    targetTurn.items.push(syntheticItem);
  });
}

export function setPlanImplementationRequest(
  manager: AppServerManager,
  conversationId: ConversationId,
  turnId: string,
  planContent: string,
): void {
  manager.updateConversationState(conversationId, (draft) => {
    draft.requests = draft.requests.filter((existing) => {
      if (existing.method !== PLAN_IMPLEMENTATION_REQUEST_METHOD) {
        return true;
      }
      return existing.params.turnId !== turnId;
    });
    draft.requests.push({
      method: PLAN_IMPLEMENTATION_REQUEST_METHOD,
      id: implementPlanPendingRequestId(turnId),
      params: {
        threadId: conversationId,
        turnId,
        planContent,
      },
    });
    draft.hasUnreadTurn = true;
  });
}

export function removePlanImplementationRequest(
  manager: AppServerManager,
  conversationId: ConversationId,
  turnId: string,
): void {
  manager.updateConversationState(conversationId, (draft) => {
    for (const turn of draft.turns) {
      if (turn.turnId !== turnId) {
        continue;
      }
      for (const item of turn.items) {
        if (item.type === "planImplementation") {
          item.isCompleted = true;
        }
      }
    }
    draft.requests = draft.requests.filter((request) => {
      if (request.method !== PLAN_IMPLEMENTATION_REQUEST_METHOD) {
        return true;
      }
      return request.params.turnId !== turnId;
    });
  });
}
