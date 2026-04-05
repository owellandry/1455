import last from "lodash/last";

import type {
  AgentRenderEntry,
  ExplorationItem,
} from "./exploration-accordion";
import { isItemStillRunning } from "./items/is-item-still-running";
import type {
  ExecLocalConversationItem,
  LocalConversationItemOrHook,
} from "./items/local-conversation-item";

export function segmentAgentItemsWithState({
  agentItems,
  isTurnInProgress,
  isAnyNonAgentItemInProgress,
}: {
  agentItems: Array<LocalConversationItemOrHook>;
  isTurnInProgress: boolean;
  isAnyNonAgentItemInProgress: boolean;
}): {
  renderableAgentItems: Array<AgentRenderEntry>;
  isExploring: boolean;
  isAnyNonExploringAgentItemInProgress: boolean;
} {
  const entries: Array<AgentRenderEntry> = [];
  let currentGroup: Array<ExplorationItem> | null = null;
  let isExploring = false;
  let isAnyNonExploringAgentItemInProgress = false;

  const pushGroup = (status: "exploring" | "explored"): void => {
    if (currentGroup && currentGroup.length > 0) {
      entries.push({
        kind: "exploration",
        items: currentGroup,
        status,
      });
    }
    currentGroup = null;
  };

  for (const item of agentItems) {
    // Check for valid exploration item
    if (isExplorationType(item)) {
      // If there is an ongoing exp group, insert and check the next item
      if (currentGroup) {
        currentGroup.push(item);
        continue;
      }

      // If no ongoing exp group, create a new group
      currentGroup = [item];
      continue;
    }

    // If there is an ongoing exploration group, reasoning would be consider as part of that group
    if (item.type === "reasoning") {
      // We appending but do not show the content but only thinking status
      if (currentGroup) {
        currentGroup.push(item);
      }
      // If not in exploration group, we drop the reasoning and let local turn thinking status take over
      // per isAnyNonExploringAgentItemInProgress
      continue;
    }

    // Current cycle did not have a valid exploration item, close group and mark as explored
    if (currentGroup) {
      pushGroup("explored");
    }

    // Push the current item (non exploration item) to the entries
    entries.push({ kind: "item", item });
  }

  if (currentGroup) {
    const hasRunningItemInCurrentGroup = currentGroup.some((item) =>
      isItemStillRunning(item),
    );
    // Keep exploration active if non-agent items aren't running yet or if this group still has running work.
    isExploring =
      isTurnInProgress &&
      (!isAnyNonAgentItemInProgress || hasRunningItemInCurrentGroup);
    pushGroup(isExploring ? "exploring" : "explored");
  } else {
    const lastEntry = last(entries);
    if (lastEntry?.kind === "item") {
      isAnyNonExploringAgentItemInProgress = isItemStillRunning(lastEntry.item);
      if (
        lastEntry.item.type === "reasoning" &&
        lastEntry.item.completed === false
      ) {
        isAnyNonExploringAgentItemInProgress = false;
      }
    }
  }

  return {
    renderableAgentItems: entries,
    isExploring,
    isAnyNonExploringAgentItemInProgress,
  };
}

function isExplorationType(
  item: LocalConversationItemOrHook,
): item is ExecLocalConversationItem {
  if (item.type !== "exec") {
    return false;
  }
  return (
    item.parsedCmd.type === "list_files" ||
    item.parsedCmd.type === "search" ||
    item.parsedCmd.type === "read"
  );
}
