import type { WritableDraft } from "immer";

import type { AppServerConversationTurn } from "../app-server-manager-types";

export function isCompletedPlaceholderTurn(
  turn: WritableDraft<AppServerConversationTurn>,
): boolean {
  return (
    turn.turnId == null &&
    turn.status === "completed" &&
    turn.error == null &&
    turn.items.length === 0
  );
}
