import type * as AppServer from "app-server-types";

import type { Item, ItemForType } from "../item-schema";

type HookSyntheticItem = ItemForType<"hook">;
type TurnItem = {
  type: Item["type"];
  id?: string;
  run?: AppServer.v2.HookRunSummary;
};

export function mapHookRunToSyntheticItem(
  run: AppServer.v2.HookRunSummary,
  id: string = run.id,
): HookSyntheticItem {
  return {
    type: "hook",
    id,
    run,
  };
}

export function upsertHookRunIntoTurn(
  items: Array<TurnItem>,
  run: AppServer.v2.HookRunSummary,
): void {
  const existingIndex = findExistingHookRunIndex(items, run);
  if (existingIndex >= 0) {
    const existingItem = items[existingIndex];
    if (existingItem?.type !== "hook") {
      return;
    }
    items[existingIndex] = mapHookRunToSyntheticItem(run, existingItem.id);
    return;
  }

  const hookItem = mapHookRunToSyntheticItem(run, createHookItemId(items, run));
  const insertIndex = getHookInsertIndex(items, hookItem);
  items.splice(insertIndex, 0, hookItem);
}

function findExistingHookRunIndex(
  items: Array<TurnItem>,
  run: AppServer.v2.HookRunSummary,
): number {
  const runningHookIndex = findLastMatchingHookIndex(
    items,
    (candidate) =>
      candidate.run.id === run.id && candidate.run.status === "running",
  );
  if (runningHookIndex >= 0) {
    return runningHookIndex;
  }

  if (run.completedAt != null) {
    return findLastMatchingHookIndex(
      items,
      (candidate) =>
        candidate.run.id === run.id &&
        candidate.run.completedAt === run.completedAt,
    );
  }

  return -1;
}

function findLastMatchingHookIndex(
  items: Array<TurnItem>,
  matches: (candidate: HookSyntheticItem) => boolean,
): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const candidate = items[index];
    if (
      candidate?.type === "hook" &&
      candidate.id != null &&
      candidate.run != null
    ) {
      const hookCandidate: HookSyntheticItem = {
        type: "hook",
        id: candidate.id,
        run: candidate.run,
      };
      if (matches(hookCandidate)) {
        return index;
      }
    }
  }

  return -1;
}

function createHookItemId(
  items: Array<TurnItem>,
  run: AppServer.v2.HookRunSummary,
): string {
  const matchingHookCount = items.filter(
    (candidate) => candidate.type === "hook" && candidate.run?.id === run.id,
  ).length;
  if (matchingHookCount === 0) {
    return run.id;
  }

  return `${run.id}:${String(matchingHookCount)}`;
}

function getHookInsertIndex(
  items: Array<TurnItem>,
  hookItem: HookSyntheticItem,
): number {
  switch (hookItem.run.eventName) {
    case "preToolUse":
    case "postToolUse":
      return items.length;
    case "sessionStart":
    case "userPromptSubmit":
      return getLeadingHookInsertIndex(items, hookItem);
    case "stop":
      return items.length;
  }
}

function getLeadingHookInsertIndex(
  items: Array<TurnItem>,
  hookItem: HookSyntheticItem,
): number {
  const firstUserIndex = items.findIndex((item) => item.type === "userMessage");
  const boundary = firstUserIndex >= 0 ? firstUserIndex : items.length;

  for (let index = 0; index < boundary; index += 1) {
    const candidate = items[index];
    if (
      candidate?.type === "hook" &&
      candidate.run != null &&
      candidate.run.eventName === hookItem.run.eventName &&
      candidate.run.displayOrder > hookItem.run.displayOrder
    ) {
      return index;
    }
  }

  return boundary;
}
