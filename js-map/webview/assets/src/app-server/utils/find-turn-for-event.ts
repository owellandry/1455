import { castDraft, type WritableDraft } from "immer";
import findLast from "lodash/findLast";
import last from "lodash/last";

import { logger } from "@/utils/logger";

import type {
  AppServerConversationState,
  AppServerConversationTurn,
} from "../app-server-manager-types";
import { isCompletedPlaceholderTurn } from "./is-completed-placeholder-turn";

export function findTurnForEvent(
  draft: WritableDraft<AppServerConversationState>,
  turnId: string | null,
  options?: {
    synthesizeMissingTurn?: boolean;
    rebindLatestInProgressPlaceholder?: boolean;
  },
): WritableDraft<AppServerConversationTurn> | null {
  if (draft.turns.length === 0) {
    logger.error("No turns for conversation", {
      safe: { conversationId: draft.id },
      sensitive: {},
    });
    return null;
  }
  const latestTurn = last(draft.turns) ?? null;
  if (!turnId || !latestTurn) {
    return latestTurn;
  }
  const matchingTurn =
    findLast(draft.turns, (candidate) => candidate.turnId === turnId) ?? null;
  if (matchingTurn) {
    return matchingTurn;
  }
  if (
    options?.rebindLatestInProgressPlaceholder &&
    latestTurn.turnId == null &&
    latestTurn.status === "inProgress"
  ) {
    latestTurn.turnId = turnId;
    latestTurn.turnStartedAtMs = latestTurn.turnStartedAtMs ?? Date.now();
    return latestTurn;
  }
  if (draft.turns.length === 1 && isCompletedPlaceholderTurn(latestTurn)) {
    logger.warning("Rebinding placeholder latest turn to incoming event", {
      safe: {
        turnId,
        conversationId: draft.id,
      },
      sensitive: {},
    });
    latestTurn.turnId = turnId;
    latestTurn.turnStartedAtMs = latestTurn.turnStartedAtMs ?? Date.now();
    latestTurn.status = "inProgress";
    return latestTurn;
  }
  if (options?.synthesizeMissingTurn) {
    logger.warning("Synthesizing missing turn for incoming event", {
      safe: { turnId, conversationId: draft.id },
      sensitive: {},
    });
    const nextTurn = castDraft<AppServerConversationTurn>({
      ...latestTurn,
      params: {
        ...latestTurn.params,
        input: [],
        personality: null,
        outputSchema: null,
        collaborationMode: null,
        attachments: [],
      },
      turnId,
      turnStartedAtMs: Date.now(),
      finalAssistantStartedAtMs: null,
      status: "inProgress",
      error: null,
      diff: null,
      items: [],
    });
    draft.turns.push(nextTurn);
    return last(draft.turns) ?? null;
  }
  logger.error("Turn not found for event", {
    safe: { turnId, conversationId: draft.id },
    sensitive: {},
  });
  return null;
}
