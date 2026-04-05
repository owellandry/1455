export type SidebarGroupCollapseAction = "collapse-all" | "reopen-previous";

export function getSidebarGroupCollapseAction({
  organizeMode,
  visibleGroupIds,
  collapsedGroups,
  previouslyExpandedGroupIds,
}: {
  organizeMode: "project" | "connection" | "recent";
  visibleGroupIds: Array<string>;
  collapsedGroups: Record<string, boolean>;
  previouslyExpandedGroupIds: Array<string>;
}): SidebarGroupCollapseAction | null {
  const expandedVisibleGroupIds = visibleGroupIds.filter(
    (groupId) => !collapsedGroups[groupId],
  );

  if (organizeMode === "recent") {
    return null;
  }

  if (expandedVisibleGroupIds.length > 1) {
    return "collapse-all";
  }

  const visibleGroupIdSet = new Set(visibleGroupIds);
  const previouslyExpandedVisibleGroupIds = previouslyExpandedGroupIds.filter(
    (groupId) => visibleGroupIdSet.has(groupId),
  );

  if (
    expandedVisibleGroupIds.length === 0 &&
    previouslyExpandedVisibleGroupIds.length > 0
  ) {
    return "reopen-previous";
  }

  return null;
}

export function getNextSidebarGroupCollapseState({
  action,
  collapsedGroups,
  visibleGroupIds,
  previouslyExpandedGroupIds,
}: {
  action: SidebarGroupCollapseAction;
  collapsedGroups: Record<string, boolean>;
  visibleGroupIds: Array<string>;
  previouslyExpandedGroupIds: Array<string>;
}): {
  collapsedGroups: Record<string, boolean>;
  previouslyExpandedGroupIds: Array<string>;
} {
  switch (action) {
    case "collapse-all": {
      const nextCollapsedGroups = { ...collapsedGroups };
      for (const groupId of visibleGroupIds) {
        nextCollapsedGroups[groupId] = true;
      }

      return {
        collapsedGroups: nextCollapsedGroups,
        previouslyExpandedGroupIds: visibleGroupIds.filter(
          (groupId) => !collapsedGroups[groupId],
        ),
      };
    }

    case "reopen-previous": {
      const nextCollapsedGroups = { ...collapsedGroups };
      const visibleGroupIdSet = new Set(visibleGroupIds);
      for (const groupId of previouslyExpandedGroupIds) {
        if (!visibleGroupIdSet.has(groupId)) {
          continue;
        }

        delete nextCollapsedGroups[groupId];
      }

      return {
        collapsedGroups: nextCollapsedGroups,
        previouslyExpandedGroupIds: [],
      };
    }
  }
}
