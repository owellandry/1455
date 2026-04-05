import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import type { SidebarThreadItem } from "@/sidebar/sidebar-thread-items";

export type ConnectionThreadGroup = {
  key: string;
  kind: "local" | "remote" | "cloud";
  hostId: string | null;
  hostDisplayName: string | null;
  items: Array<SidebarThreadItem>;
};

export function groupSidebarItemsByConnection({
  items,
  remoteConnections,
}: {
  items: Array<SidebarThreadItem>;
  remoteConnections: Array<{
    hostId: string;
    displayName: string;
  }>;
}): Array<ConnectionThreadGroup> {
  const groups: Array<ConnectionThreadGroup> = [];
  const groupByKey = new Map<string, ConnectionThreadGroup>();
  const hostDisplayNamesByHostId = new Map(
    remoteConnections.map((connection) => [
      connection.hostId,
      connection.displayName,
    ]),
  );

  for (const item of items) {
    const nextGroup = getConnectionGroupForItem(
      item,
      hostDisplayNamesByHostId,
      groupByKey,
    );

    if (nextGroup.items.length === 0) {
      groups.push(nextGroup);
    }

    nextGroup.items.push(item);
  }

  return groups;
}

export function getConnectionGroupKeysInSidebarOrder(
  groups: Array<ConnectionThreadGroup>,
  connectionGroupOrder: Array<string> | undefined,
): Array<string> {
  const knownGroupKeys = new Set(groups.map((group) => group.key));
  const orderedGroupKeys = (connectionGroupOrder ?? []).filter((groupKey) =>
    knownGroupKeys.has(groupKey),
  );
  const seenGroupKeys = new Set(orderedGroupKeys);

  for (const group of groups) {
    if (seenGroupKeys.has(group.key)) {
      continue;
    }

    orderedGroupKeys.push(group.key);
    seenGroupKeys.add(group.key);
  }

  return orderedGroupKeys;
}

export function sortConnectionGroupsBySidebarOrder(
  groups: Array<ConnectionThreadGroup>,
  connectionGroupOrder: Array<string> | undefined,
): Array<ConnectionThreadGroup> {
  const orderedGroupKeys = getConnectionGroupKeysInSidebarOrder(
    groups,
    connectionGroupOrder,
  );
  const orderIndexByGroupKey = new Map(
    orderedGroupKeys.map((groupKey, index) => [groupKey, index]),
  );

  return [...groups].sort((firstGroup, secondGroup) => {
    return (
      (orderIndexByGroupKey.get(firstGroup.key) ?? Number.MAX_SAFE_INTEGER) -
      (orderIndexByGroupKey.get(secondGroup.key) ?? Number.MAX_SAFE_INTEGER)
    );
  });
}

function getConnectionGroupForItem(
  item: SidebarThreadItem,
  hostDisplayNamesByHostId: Map<string, string>,
  groupByKey: Map<string, ConnectionThreadGroup>,
): ConnectionThreadGroup {
  const existingGroup = getExistingConnectionGroup(item, groupByKey);

  if (existingGroup != null) {
    return existingGroup;
  }

  const nextGroup = createConnectionGroup(item, hostDisplayNamesByHostId);
  groupByKey.set(nextGroup.key, nextGroup);
  return nextGroup;
}

function getExistingConnectionGroup(
  item: SidebarThreadItem,
  groupByKey: Map<string, ConnectionThreadGroup>,
): ConnectionThreadGroup | null {
  switch (item.task.kind) {
    case "local": {
      const hostId = item.task.conversation.hostId;
      if (hostId != null && hostId !== DEFAULT_HOST_ID) {
        return groupByKey.get(`host:${hostId}`) ?? null;
      }
      return groupByKey.get("local") ?? null;
    }
    case "remote":
      return groupByKey.get("cloud") ?? null;
    case "pending-worktree": {
      const hostId = item.task.pendingWorktree.hostId;
      if (hostId !== DEFAULT_HOST_ID) {
        return groupByKey.get(`host:${hostId}`) ?? null;
      }
      return groupByKey.get("local") ?? null;
    }
  }
}

function createConnectionGroup(
  item: SidebarThreadItem,
  hostDisplayNamesByHostId: Map<string, string>,
): ConnectionThreadGroup {
  switch (item.task.kind) {
    case "local": {
      const hostId = item.task.conversation.hostId;
      if (hostId != null && hostId !== DEFAULT_HOST_ID) {
        return {
          key: `host:${hostId}`,
          kind: "remote",
          hostId,
          hostDisplayName: hostDisplayNamesByHostId.get(hostId) ?? null,
          items: [],
        };
      }
      return {
        key: "local",
        kind: "local",
        hostId: null,
        hostDisplayName: null,
        items: [],
      };
    }
    case "remote":
      return {
        key: "cloud",
        kind: "cloud",
        hostId: null,
        hostDisplayName: null,
        items: [],
      };
    case "pending-worktree": {
      const hostId = item.task.pendingWorktree.hostId;
      if (hostId !== DEFAULT_HOST_ID) {
        return {
          key: `host:${hostId}`,
          kind: "remote",
          hostId,
          hostDisplayName: hostDisplayNamesByHostId.get(hostId) ?? null,
          items: [],
        };
      }
      return {
        key: "local",
        kind: "local",
        hostId: null,
        hostDisplayName: null,
        items: [],
      };
    }
  }
}
