import type * as AppServer from "app-server-types";
import type { ConversationId } from "protocol";

import type { AppServerManager } from "../app-server-manager";

export async function setModelAndReasoningForNextTurn(
  manager: AppServerManager,
  conversationId: ConversationId,
  model: string,
  reasoningEffort: AppServer.ReasoningEffort | null,
): Promise<void> {
  const role = manager.getStreamRole(conversationId);
  const followerSetModelResponse = await manager.sendThreadFollowerRequest(
    role,
    "thread-follower-set-model-and-reasoning",
    {
      conversationId,
      model,
      reasoningEffort,
    },
  );
  if (followerSetModelResponse) {
    return;
  }

  manager.updateConversationState(conversationId, (draft) => {
    const previousModel = draft.latestCollaborationMode.settings.model;
    draft.latestModel = model;
    draft.latestReasoningEffort = reasoningEffort;
    draft.latestCollaborationMode = {
      ...draft.latestCollaborationMode,
      settings: {
        ...draft.latestCollaborationMode.settings,
        model,
        reasoning_effort: reasoningEffort,
      },
    };

    if (draft.turns.length === 0) {
      return;
    }
    if (model === previousModel) {
      return;
    }

    const pendingFromModel = draft.previousTurnModel;
    if (pendingFromModel == null) {
      draft.previousTurnModel = previousModel;
      return;
    }

    if (model === pendingFromModel) {
      draft.previousTurnModel = null;
    }
  });
}
