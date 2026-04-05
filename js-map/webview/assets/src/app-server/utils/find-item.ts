import type { WritableDraft } from "immer";
import findLast from "lodash/findLast";

import { logger } from "@/utils/logger";

import type { AppServerConversationTurn } from "../app-server-manager-types";
import type { Item, ItemForType } from "../item-schema";
import { isItemOfType } from "./is-item-of-type";

export function findItem<T extends Item["type"]>(
  turn: WritableDraft<AppServerConversationTurn>,
  itemId: string,
  expectedType: T,
): WritableDraft<ItemForType<T>> | null {
  const item = findLast(
    turn.items,
    (candidate): candidate is WritableDraft<ItemForType<T>> =>
      candidate.id === itemId && isItemOfType(candidate, expectedType),
  );

  if (!item) {
    logger.error("Item not found in turn state", {
      safe: { itemId },
      sensitive: {},
    });
    return null;
  }

  if (item.type !== expectedType) {
    logger.error("Item has unexpected type", {
      safe: { itemId, type: item.type, expectedType },
      sensitive: {},
    });
    return null;
  }

  return item;
}
