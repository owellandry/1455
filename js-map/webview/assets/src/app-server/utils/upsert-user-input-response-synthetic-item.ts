import type * as AppServer from "app-server-types";
import { castDraft, type WritableDraft } from "immer";
import type { McpRequestId } from "protocol";

import type { AppServerConversationState } from "../app-server-manager-types";
import type { ItemForType } from "../item-schema";
import { createUserInputResponseSyntheticItemId } from "./create-user-input-response-synthetic-item-id";
import { ensureTurnDefaults } from "./ensure-turn-defaults";
import { findTurnForEvent } from "./find-turn-for-event";
import { upsertItem } from "./upsert-item";

export function upsertUserInputResponseSyntheticItem(
  draft: WritableDraft<AppServerConversationState>,
  requestId: McpRequestId,
  params: AppServer.v2.ToolRequestUserInputParams,
  answers: Record<string, Array<string>>,
  completed: boolean,
): void {
  const targetTurn = findTurnForEvent(draft, params.turnId);
  if (!targetTurn) {
    return;
  }
  ensureTurnDefaults(targetTurn);
  const syntheticItem: ItemForType<"userInputResponse"> = {
    id: createUserInputResponseSyntheticItemId(requestId),
    type: "userInputResponse",
    requestId,
    turnId: params.turnId,
    questions: params.questions.map((question) => ({
      id: question.id,
      header: question.header,
      question: question.question,
    })),
    answers,
    completed,
  };
  upsertItem(targetTurn, castDraft(syntheticItem));
}
