import type { WritableDraft } from "immer";

import type { AppServerConversationTurn } from "../app-server-manager-types";
import type { Item } from "../item-schema";

export function upsertItem(
  turn: WritableDraft<AppServerConversationTurn>,
  item: WritableDraft<Item>,
): void {
  const index = turn.items.findIndex((candidate) => candidate.id === item.id);
  if (index >= 0) {
    turn.items[index] = item;
  } else {
    turn.items.push(item);
  }
}
