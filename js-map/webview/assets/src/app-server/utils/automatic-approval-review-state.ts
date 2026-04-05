import type { WritableDraft } from "immer";
import type { AppServerNotificationParamsForMethod } from "protocol";

import type { AppServerConversationTurn } from "../app-server-manager-types";
import type { ItemForType } from "../item-schema";
import { upsertItem } from "./upsert-item";

type AutomaticApprovalReviewNotification =
  | AppServerNotificationParamsForMethod<"item/autoApprovalReview/started">
  | AppServerNotificationParamsForMethod<"item/autoApprovalReview/completed">;

export function upsertAutomaticApprovalReviewTurnItem(
  turn: WritableDraft<AppServerConversationTurn>,
  automaticApprovalReviewItem: ItemForType<"automaticApprovalReview">,
): void {
  const matchingIndex = turn.items.findIndex(
    (candidate) =>
      candidate.id === automaticApprovalReviewItem.id &&
      candidate.type === "automaticApprovalReview",
  );
  if (matchingIndex >= 0) {
    turn.items[matchingIndex] = automaticApprovalReviewItem;
    return;
  }

  upsertItem(turn, automaticApprovalReviewItem);
}

export function buildAutomaticApprovalReviewTurnItem(
  params: AutomaticApprovalReviewNotification,
): ItemForType<"automaticApprovalReview"> {
  return {
    type: "automaticApprovalReview",
    id: getAutomaticApprovalReviewItemId(params.targetItemId),
    targetItemId: params.targetItemId,
    ...params.review,
  };
}

function getAutomaticApprovalReviewItemId(targetItemId: string): string {
  return `automatic-approval-review:${targetItemId}`;
}
