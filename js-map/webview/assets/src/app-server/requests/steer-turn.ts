import type * as AppServer from "app-server-types";
import last from "lodash/last";
import type {
  ConversationId,
  FileDescriptor,
  QueuedFollowUpMessage,
} from "protocol";
import { maybeErrorToString } from "protocol";
import { v4 as uuidv4 } from "uuid";

import { buildPendingSteerState } from "@/app-server/pending-steer";
import { logger } from "@/utils/logger";

import type { AppServerManager } from "../app-server-manager";
import {
  DEFAULT_TIMEOUT_MS,
  OWNER_WINDOW_ERROR,
} from "../app-server-manager-constants";

export type SteerTurnRequestParams = {
  input: Array<AppServer.v2.UserInput>;
  attachments?: Array<FileDescriptor>;
  restoreMessage: QueuedFollowUpMessage;
};

const STEER_TURN_INACTIVE_ERROR_NAME = "SteerTurnInactiveError";

export async function steerTurn(
  manager: AppServerManager,
  conversationId: ConversationId,
  params: SteerTurnRequestParams,
): Promise<AppServer.v2.TurnSteerResponse> {
  const role = manager.getStreamRole(conversationId);
  const followerSteerTurnResponse = await manager.sendThreadFollowerRequest(
    role,
    "thread-follower-steer-turn",
    {
      conversationId,
      input: params.input,
      attachments: params.attachments,
      restoreMessage: params.restoreMessage,
    },
  );
  if (followerSteerTurnResponse) {
    return followerSteerTurnResponse.result;
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

  const latestTurn = last(conversationState.turns);
  if (latestTurn?.status !== "inProgress") {
    throw createSteerTurnInactiveError(conversationId);
  }

  const pendingSteer = buildPendingSteerState(
    uuidv4(),
    params.input,
    params.restoreMessage,
    params.attachments,
    latestTurn.turnId ?? null,
    latestTurn.turnStartedAtMs ?? null,
  );
  manager.registerPendingSteer(conversationId, pendingSteer);

  try {
    const activeTurnId = await waitForActiveTurnId(manager, conversationId);
    manager.setPendingSteerTurnId(
      conversationId,
      pendingSteer.id,
      activeTurnId,
    );
    try {
      return await sendSteerRequest(
        manager,
        conversationId,
        params.input,
        activeTurnId,
      );
    } catch (error) {
      const updatedTurnId = getActiveTurnIdFromSteerConflict(error);
      if (updatedTurnId == null) {
        throw error;
      }
      manager.updateConversationState(conversationId, (draft) => {
        const latestTurn = last(draft.turns);
        if (latestTurn?.status !== "inProgress") {
          return;
        }
        latestTurn.turnId = updatedTurnId;
      });
      manager.setPendingSteerTurnId(
        conversationId,
        pendingSteer.id,
        updatedTurnId,
      );
      return await sendSteerRequest(
        manager,
        conversationId,
        params.input,
        updatedTurnId,
      );
    }
  } catch (error) {
    manager.removePendingSteer(conversationId, pendingSteer.id);
    logger.error("Error submitting steering turn for conversation", {
      safe: { conversationId },
      sensitive: { error },
    });
    throw error;
  }
}

function createSteerTurnInactiveError(conversationId: ConversationId): Error {
  const error = new Error(
    `Cannot steer conversation ${conversationId} because its active turn already ended`,
  );
  error.name = STEER_TURN_INACTIVE_ERROR_NAME;
  return error;
}

function createSteerTurnMissingActiveTurnIdError(
  conversationId: ConversationId,
): Error {
  return new Error(
    `Cannot steer conversation ${conversationId} without an active turn id`,
  );
}

export function isSteerTurnInactiveError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === STEER_TURN_INACTIVE_ERROR_NAME) ||
    maybeErrorToString(error).includes(STEER_TURN_INACTIVE_ERROR_NAME)
  );
}

function getActiveTurnId(
  manager: AppServerManager,
  conversationId: ConversationId,
): string | null {
  const conversationState = manager.getConversation(conversationId);
  const latestTurn = last(conversationState?.turns ?? []);
  if (latestTurn?.status !== "inProgress") {
    return null;
  }
  return latestTurn.turnId ?? null;
}

async function sendSteerRequest(
  manager: AppServerManager,
  conversationId: ConversationId,
  input: Array<AppServer.v2.UserInput>,
  expectedTurnId: string,
): Promise<AppServer.v2.TurnSteerResponse> {
  return await manager.sendRequest(
    "turn/steer",
    {
      threadId: conversationId,
      input,
      expectedTurnId,
    },
    {
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
  );
}

function getActiveTurnIdFromSteerConflict(error: unknown): string | null {
  const message = maybeErrorToString(error);
  const match = message.match(
    /expected active turn id `[^`]+` but found `([^`]+)`/,
  );
  return match?.[1] ?? null;
}

async function waitForActiveTurnId(
  manager: AppServerManager,
  conversationId: ConversationId,
): Promise<string> {
  // We can have an active turn before we have a turn id: startTurn() creates a
  // local in-progress placeholder with turnId: null, then turn/started fills in
  // the real id asynchronously. steerTurn() needs expectedTurnId, so wait for
  // that id instead of failing fast in this window.
  const activeTurnId = getActiveTurnId(manager, conversationId);
  if (activeTurnId != null) {
    return activeTurnId;
  }

  return await new Promise<string>((resolve, reject) => {
    const rejectMissingTurn = (): void => {
      reject(createSteerTurnMissingActiveTurnIdError(conversationId));
    };
    const timeout = window.setTimeout(() => {
      unsubscribe();
      rejectMissingTurn();
    }, DEFAULT_TIMEOUT_MS);

    const unsubscribe = manager.addConversationCallback(
      conversationId,
      (conversationState) => {
        const latestTurn = last(conversationState.turns);
        if (latestTurn?.status !== "inProgress") {
          window.clearTimeout(timeout);
          unsubscribe();
          reject(createSteerTurnInactiveError(conversationId));
          return;
        }
        if (latestTurn.turnId == null) {
          return;
        }
        window.clearTimeout(timeout);
        unsubscribe();
        resolve(latestTurn.turnId);
      },
    );

    const resolvedTurnId = getActiveTurnId(manager, conversationId);
    if (resolvedTurnId != null) {
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(resolvedTurnId);
    }
  });
}
