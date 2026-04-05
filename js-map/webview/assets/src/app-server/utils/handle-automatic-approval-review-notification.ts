import type { WritableDraft } from "immer";
import type {
  AppServerNotificationParamsForMethod,
  ConversationId,
} from "protocol";
import { createConversationId } from "protocol";

import type { AppServerConversationState } from "@/app-server/app-server-manager-types";
import { logger } from "@/utils/logger";

import {
  buildAutomaticApprovalReviewTurnItem,
  upsertAutomaticApprovalReviewTurnItem,
} from "./automatic-approval-review-state";
import { findTurnForEvent } from "./find-turn-for-event";

type AutomaticApprovalReviewNotificationParams =
  | AppServerNotificationParamsForMethod<"item/autoApprovalReview/started">
  | AppServerNotificationParamsForMethod<"item/autoApprovalReview/completed">;

export function handleAutomaticApprovalReviewNotification(
  params: AutomaticApprovalReviewNotificationParams,
  conversations: ReadonlyMap<ConversationId, AppServerConversationState>,
  updateConversationState: (
    conversationId: ConversationId,
    recipe: (draft: WritableDraft<AppServerConversationState>) => void,
  ) => void,
): void {
  const automaticApprovalReviewItem =
    buildAutomaticApprovalReviewTurnItem(params);

  const conversationId = createConversationId(params.threadId);
  const conversation = conversations.get(conversationId);
  if (!conversation) {
    logger.error(
      "Received automatic approval review for unknown conversation",
      {
        safe: { conversationId, targetItemId: params.targetItemId },
        sensitive: {},
      },
    );
    return;
  }

  updateConversationState(conversationId, (draft) => {
    const turn = findTurnForEvent(draft, params.turnId);
    if (!turn) {
      return;
    }
    upsertAutomaticApprovalReviewTurnItem(turn, automaticApprovalReviewItem);
    draft.updatedAt = Date.now();
  });
}
