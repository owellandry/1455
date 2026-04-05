import { createMcpRequestId, type McpRequestId } from "protocol";

import type { AppServerConversationState } from "@/app-server/app-server-manager-types";
import type { ConversationRequest } from "@/app-server/conversation-request";
import { getMcpServerElicitation } from "@/app-server/mcp-server-elicitation";

import type {
  ExecLocalConversationItem,
  PatchApplyLocalConversationItem,
  UserInputLocalConversationItem,
} from "./items/local-conversation-item";
import { mapStateToLocalConversationItems } from "./items/map-mcp-conversation-turn";
import { splitItemsIntoRenderGroups } from "./split-items-into-render-groups";

const IMPLEMENT_PLAN_PENDING_REQUEST_PREFIX = "implement-plan:";

export type PendingRequest =
  | {
      type: "approval";
      item: ExecLocalConversationItem | PatchApplyLocalConversationItem;
    }
  | {
      type: "mcpServerElicitation";
      requestId: McpRequestId;
      request: Extract<
        ConversationRequest,
        { method: "mcpServer/elicitation/request" }
      >;
      elicitation: NonNullable<ReturnType<typeof getMcpServerElicitation>>;
    }
  | {
      type: "userInput";
      item: UserInputLocalConversationItem;
    }
  | {
      type: "implementPlan";
      id: string;
      turnId: string;
      planContent: string;
    };

export function implementPlanPendingRequestId(turnId: string): string {
  return `${IMPLEMENT_PLAN_PENDING_REQUEST_PREFIX}${turnId}`;
}

export function isImplementPlanPendingRequest(
  pendingRequest: PendingRequest,
): pendingRequest is Extract<PendingRequest, { type: "implementPlan" }> {
  return pendingRequest.type === "implementPlan";
}

export function getPendingRequestFromConversation(
  localConversation: AppServerConversationState | null,
): PendingRequest | null {
  if (!localConversation) {
    return null;
  }
  const elicitationRequestByTurnId = new Map<
    string,
    Extract<PendingRequest, { type: "mcpServerElicitation" }>
  >();
  let latestTurnlessElicitation: Extract<
    PendingRequest,
    { type: "mcpServerElicitation" }
  > | null = null;
  for (let i = localConversation.requests.length - 1; i >= 0; i -= 1) {
    const request = localConversation.requests[i];
    if (request.method !== "mcpServer/elicitation/request") {
      continue;
    }

    const elicitation = getMcpServerElicitation(request.params);
    if (elicitation == null) {
      continue;
    }

    const pendingRequest: Extract<
      PendingRequest,
      { type: "mcpServerElicitation" }
    > = {
      type: "mcpServerElicitation",
      requestId: createMcpRequestId(request.id),
      request,
      elicitation,
    };
    const turnId = request.params.turnId;
    if (!hasElicitationTurnId(turnId)) {
      latestTurnlessElicitation ??= pendingRequest;
      continue;
    }
    if (!elicitationRequestByTurnId.has(turnId)) {
      elicitationRequestByTurnId.set(turnId, pendingRequest);
    }
  }
  for (let i = localConversation.turns.length - 1; i >= 0; i -= 1) {
    const conversationTurn = localConversation.turns[i];
    const turn = mapStateToLocalConversationItems(
      conversationTurn,
      localConversation.requests,
    );
    const { approvalItem, userInputItem, planImplementationItem } =
      splitItemsIntoRenderGroups(turn.items, turn.status);
    if (userInputItem) {
      return { type: "userInput", item: userInputItem };
    }
    if (approvalItem) {
      return { type: "approval", item: approvalItem };
    }
    if (conversationTurn.turnId != null) {
      const elicitationRequest = elicitationRequestByTurnId.get(
        conversationTurn.turnId,
      );
      if (elicitationRequest != null) {
        return elicitationRequest;
      }
    }
    if (planImplementationItem && !planImplementationItem.isCompleted) {
      return {
        type: "implementPlan",
        id: implementPlanPendingRequestId(planImplementationItem.turnId),
        turnId: planImplementationItem.turnId,
        planContent: planImplementationItem.planContent,
      };
    }
  }
  return latestTurnlessElicitation;
}

export function shouldRenderPendingRequestInComposer(
  pendingRequest: PendingRequest | null,
): boolean {
  if (pendingRequest == null) {
    return false;
  }
  if (pendingRequest.type !== "mcpServerElicitation") {
    return true;
  }
  return !hasElicitationTurnId(pendingRequest.request.params.turnId);
}

export function isConversationAwaitingApproval(
  localConversation: AppServerConversationState | null,
): boolean {
  if (localConversation == null) {
    return false;
  }

  if (localConversation.resumeState === "needs_resume") {
    return (
      localConversation.threadRuntimeStatus?.type === "active" &&
      localConversation.threadRuntimeStatus.activeFlags.includes(
        "waitingOnApproval",
      )
    );
  }

  return localConversation.requests.some(
    (request) =>
      request.method === "item/fileChange/requestApproval" ||
      request.method === "item/commandExecution/requestApproval" ||
      (request.method === "mcpServer/elicitation/request" &&
        getMcpServerElicitation(request.params) != null),
  );
}

export function getApprovalPendingRequestFromConversation(
  localConversation: AppServerConversationState | null,
): Extract<PendingRequest, { type: "approval" }> | null {
  if (!localConversation) {
    return null;
  }
  for (let i = localConversation.turns.length - 1; i >= 0; i -= 1) {
    const turn = mapStateToLocalConversationItems(
      localConversation.turns[i],
      localConversation.requests,
    );
    const { approvalItem } = splitItemsIntoRenderGroups(
      turn.items,
      turn.status,
    );
    if (approvalItem) {
      return { type: "approval", item: approvalItem };
    }
  }

  return null;
}

function hasElicitationTurnId(
  turnId: string | null | undefined,
): turnId is string {
  return turnId != null && turnId.length > 0;
}
