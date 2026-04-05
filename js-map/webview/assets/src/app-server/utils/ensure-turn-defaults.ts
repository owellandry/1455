import type * as AppServer from "app-server-types";
import type { WritableDraft } from "immer";

import type { AppServerConversationTurn } from "../app-server-manager-types";

export function ensureTurnDefaults(
  turn: WritableDraft<AppServerConversationTurn>,
  status?: AppServer.v2.Turn["status"],
): WritableDraft<AppServerConversationTurn> {
  if (status) {
    turn.status = status;
  }
  if (!turn.items) {
    turn.items = [];
  }
  return turn;
}
