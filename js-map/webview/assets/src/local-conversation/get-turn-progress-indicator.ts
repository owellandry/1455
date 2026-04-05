import { isItemStillRunning } from "./items/is-item-still-running";
import type {
  AssistantMessageLocalConversationItem,
  ProposedPlanLocalConversationItem,
} from "./items/local-conversation-item";

export type TurnProgressIndicator =
  | { type: "none" }
  | { type: "exploring" }
  | { type: "planning" }
  | { type: "thinking"; isVisible: boolean };

export function getTurnProgressIndicator({
  isTurnInProgress,
  assistantItem,
  proposedPlanItem,
  isExploring,
  isAnyNonExploringAgentItemInProgress,
  hasWorkedForItem,
  hasBlockingRequest,
}: {
  isTurnInProgress: boolean;
  assistantItem: AssistantMessageLocalConversationItem | null;
  proposedPlanItem: ProposedPlanLocalConversationItem | null;
  isExploring: boolean;
  isAnyNonExploringAgentItemInProgress: boolean;
  hasWorkedForItem: boolean;
  hasBlockingRequest: boolean;
}): TurnProgressIndicator {
  if (!isTurnInProgress) {
    return { type: "none" };
  }

  if (isExploring) {
    return { type: "exploring" };
  }

  if (isItemStillRunning(proposedPlanItem)) {
    return { type: "planning" };
  }

  if (hasWorkedForItem) {
    return { type: "none" };
  }

  if (hasBlockingRequest) {
    return { type: "none" };
  }

  if (isItemStillRunning(assistantItem)) {
    return { type: "thinking", isVisible: true };
  }

  if (isAnyNonExploringAgentItemInProgress) {
    return { type: "none" };
  }

  return {
    type: "thinking",
    isVisible: true,
  };
}
