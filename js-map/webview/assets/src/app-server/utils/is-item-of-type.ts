import type { WritableDraft } from "immer";

import type { Item, ItemForType } from "../item-schema";

export function isItemOfType<T extends Item["type"]>(
  candidate: WritableDraft<Item>,
  expectedType: T,
): candidate is WritableDraft<ItemForType<T>> {
  return candidate.type === expectedType;
}
