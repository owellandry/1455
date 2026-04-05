import type * as AppServer from "app-server-types";
import type { FileDescriptor, QueuedFollowUpMessage } from "protocol";

import { buildUserMessageItemFromInput } from "@/local-conversation/items/user-message-item";

export const INTERRUPTED_PENDING_STEER_PAUSED_REASON =
  "Interrupted before the steer was accepted.";

export type PendingSteerCompareKey = {
  rawText: string;
  imageCount: number;
};

export type PendingSteerState = {
  id: string;
  // A late steer can race the prior turn's completion: the next turn may start
  // after core clears active_turn but before app-server forwards the older
  // turn/completed notification. Keep the turn identity so UI cleanup stays
  // scoped to the turn that actually accepted or lost this steer.
  targetTurnId: string | null;
  targetTurnStartedAtMs: number | null;
  text: string;
  commentCount: number;
  imageCount: number;
  compareKey: PendingSteerCompareKey;
  attachments: Array<FileDescriptor>;
  restoreMessage: QueuedFollowUpMessage;
};

export function buildPendingSteerState(
  id: string,
  input: Array<AppServer.v2.UserInput>,
  restoreMessage: QueuedFollowUpMessage,
  attachments: Array<FileDescriptor> = [],
  targetTurnId: string | null = null,
  targetTurnStartedAtMs: number | null = null,
): PendingSteerState {
  const userMessage = buildUserMessageItemFromInput(input);
  return {
    id,
    targetTurnId,
    targetTurnStartedAtMs,
    text: userMessage.item?.message ?? "",
    commentCount: userMessage.item?.commentCount ?? 0,
    imageCount: userMessage.compareKey.imageCount,
    attachments,
    restoreMessage,
    compareKey: {
      rawText: userMessage.compareKey.rawText,
      imageCount: userMessage.compareKey.imageCount,
    },
  };
}

export function pendingSteerMatchesInput(
  pendingSteer: PendingSteerState | undefined,
  input: Array<AppServer.v2.UserInput>,
): boolean {
  if (!pendingSteer) {
    return false;
  }
  const userMessage = buildUserMessageItemFromInput(input);
  return (
    pendingSteer.compareKey.rawText === userMessage.compareKey.rawText &&
    pendingSteer.compareKey.imageCount === userMessage.compareKey.imageCount
  );
}

export function pendingSteerTargetsTurn(
  pendingSteer: PendingSteerState,
  turnId: string | null,
  turnStartedAtMs: number | null,
): boolean {
  if (pendingSteer.targetTurnId != null) {
    return pendingSteer.targetTurnId === turnId;
  }
  return (
    pendingSteer.targetTurnStartedAtMs != null &&
    pendingSteer.targetTurnStartedAtMs === turnStartedAtMs
  );
}

export function findMatchingPendingSteerIndex(
  pendingSteers: Array<PendingSteerState> | undefined,
  input: Array<AppServer.v2.UserInput>,
  turnId: string | null,
  turnStartedAtMs: number | null,
): number {
  // Match by turn as well as content because a newer turn can legitimately
  // start before the older turn's completion notification is delivered.
  if (pendingSteers == null) {
    return -1;
  }
  return pendingSteers.findIndex(
    (pendingSteer) =>
      pendingSteerTargetsTurn(pendingSteer, turnId, turnStartedAtMs) &&
      pendingSteerMatchesInput(pendingSteer, input),
  );
}
