import type { AppServerConversationState } from "@/app-server/app-server-manager-types";
import { getPendingRequestFromConversation } from "@/local-conversation/pending-request";

export type HeartbeatAutomationEligibilityReason =
  | "missing_conversation"
  | "missing_turn"
  | "resuming"
  | "turn_in_progress"
  | "waiting_on_approval"
  | "waiting_on_user_input"
  | "pending_request";

export type HeartbeatAutomationEligibility =
  | {
      isEligible: true;
      reason: null;
    }
  | {
      isEligible: false;
      reason: HeartbeatAutomationEligibilityReason;
    };

export function getHeartbeatAutomationEligibility(
  conversation: AppServerConversationState | null,
): HeartbeatAutomationEligibility {
  if (conversation == null) {
    return {
      isEligible: false,
      reason: "missing_conversation",
    };
  }

  if (conversation.resumeState !== "resumed") {
    return {
      isEligible: false,
      reason: "resuming",
    };
  }

  const pendingRequest = getPendingRequestFromConversation(conversation);
  if (pendingRequest?.type === "userInput") {
    return {
      isEligible: false,
      reason: "waiting_on_user_input",
    };
  }
  if (
    pendingRequest?.type === "approval" ||
    pendingRequest?.type === "mcpServerElicitation"
  ) {
    return {
      isEligible: false,
      reason: "waiting_on_approval",
    };
  }
  if (pendingRequest != null) {
    return {
      isEligible: false,
      reason: "pending_request",
    };
  }

  const latestTurn = conversation.turns.at(-1) ?? null;
  if (latestTurn == null) {
    return {
      isEligible: false,
      reason: "missing_turn",
    };
  }
  if (latestTurn.status === "inProgress") {
    return {
      isEligible: false,
      reason: "turn_in_progress",
    };
  }

  return {
    isEligible: true,
    reason: null,
  };
}
