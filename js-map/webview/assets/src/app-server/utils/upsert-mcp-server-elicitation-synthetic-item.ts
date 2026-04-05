import type * as AppServer from "app-server-types";
import { castDraft, type WritableDraft } from "immer";
import type { McpRequestId } from "protocol";

import {
  getMcpServerElicitation,
  type McpServerElicitation,
} from "@/app-server/mcp-server-elicitation";

import type { AppServerConversationState } from "../app-server-manager-types";
import type { ItemForType } from "../item-schema";
import { ensureTurnDefaults } from "./ensure-turn-defaults";
import { findTurnForEvent } from "./find-turn-for-event";
import { upsertItem } from "./upsert-item";

export function upsertMcpServerElicitationSyntheticItem(
  draft: WritableDraft<AppServerConversationState>,
  requestId: McpRequestId,
  params: AppServer.v2.McpServerElicitationRequestParams,
  completed: boolean,
  action: AppServer.v2.McpServerElicitationRequestResponse["action"] | null,
  elicitationOverride?: McpServerElicitation,
): void {
  const turnId = params.turnId;
  if (turnId == null || turnId.length === 0) {
    return;
  }
  const elicitation = elicitationOverride ?? getMcpServerElicitation(params);
  if (elicitation == null) {
    return;
  }
  const targetTurn = findTurnForEvent(draft, params.turnId, {
    synthesizeMissingTurn: false,
  });
  if (!targetTurn) {
    return;
  }
  ensureTurnDefaults(targetTurn);
  const syntheticItem: ItemForType<"mcpServerElicitation"> = {
    id: `mcp-server-elicitation-${requestId}`,
    type: "mcpServerElicitation",
    requestId,
    turnId,
    elicitation,
    completed,
    action,
  };
  upsertItem(targetTurn, castDraft(syntheticItem));
}
