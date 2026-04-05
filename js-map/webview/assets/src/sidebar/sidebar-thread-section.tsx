import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import { SidebarListItem } from "@/sidebar/sidebar-list-item";
import {
  buildSidebarThreadListEntries,
  countSidebarVisibleParentItems,
  filterSidebarItemsForCurrentSubagentCluster,
  getSidebarItemsWithinVisibleParentLimit,
  getSidebarItemsWithClosedSubagentsHidden,
  getSidebarThreadKey,
  getSidebarSubagentParentIds,
  type SidebarThreadItem,
} from "@/sidebar/sidebar-thread-items";
import { SidebarThreadList } from "@/sidebar/sidebar-thread-list";
import {
  SidebarThreadRow,
  type SidebarThreadRowOptions,
} from "@/sidebar/sidebar-thread-row";

export function SidebarThreadSection({
  items,
  ariaLabel,
  itemClassName,
  itemWrapper,
  footerItems,
  emptyState,
  emptyStateClassName,
  isLoading = false,
  rowOptions,
  onActivateThread,
  currentThreadKey,
  maxItems,
  showMoreLabel,
  showLessLabel,
  forceExpanded = false,
  className,
}: {
  items: Array<SidebarThreadItem>;
  ariaLabel: string;
  itemClassName: string;
  itemWrapper?: React.ComponentType<{
    item: SidebarThreadItem;
    className?: string;
    children: ReactNode;
  }>;
  footerItems?: Array<{
    key: string;
    node: ReactNode;
    className?: string;
  }>;
  emptyState?: ReactNode;
  emptyStateClassName?: string;
  isLoading?: boolean;
  rowOptions?: SidebarThreadRowOptions;
  onActivateThread?: (threadKey: string) => void;
  currentThreadKey: string | null;
  maxItems?: number;
  showMoreLabel?: ReactNode;
  showLessLabel?: ReactNode;
  forceExpanded?: boolean;
  className?: string;
}): ReactElement {
  const [isExpandedState, setIsExpandedState] = useState(false);
  const [expandedClosedSubagentParents, setExpandedClosedSubagentParents] =
    useState<Record<string, boolean>>({});
  const expandedSubagentParentId = rowOptions?.expandedSubagentParentId ?? null;
  const parentIdsWithChildren = getSidebarSubagentParentIds(items);
  const subagentBatchFilteredItems =
    filterSidebarItemsForCurrentSubagentCluster({
      items,
      currentThreadKey,
      expandedSubagentParentId,
    });
  const isExpanded = isExpandedState || forceExpanded;
  const hasExpandToggle = maxItems != null;
  const maxVisibleItems = maxItems ?? 0;
  const subagentItemsState = getSidebarItemsWithClosedSubagentsHidden({
    items: subagentBatchFilteredItems,
    currentThreadKey,
    expandedClosedSubagentParents,
  });
  const visibleParentCount = countSidebarVisibleParentItems(
    subagentItemsState.items,
  );
  const itemsToRender =
    hasExpandToggle && !isExpanded
      ? getSidebarItemsWithinVisibleParentLimit({
          items: subagentItemsState.items,
          maxParentItems: maxVisibleItems,
        })
      : subagentItemsState.items;
  const listEntries = buildSidebarThreadListEntries({
    items: itemsToRender,
    hiddenClosedChildCountByParentId:
      subagentItemsState.hiddenClosedChildCountByParentId,
    expandedClosedSubagentParents,
  });
  const resolvedFooterItems = [...(footerItems ?? [])];
  if (hasExpandToggle && visibleParentCount > maxVisibleItems && !isExpanded) {
    resolvedFooterItems.push({
      key: "show-more",
      className: "px-8 py-1",
      node: (
        <Button
          className="-ml-2 text-token-description-foreground hover:text-token-foreground"
          color="ghostMuted"
          size="default"
          onClick={() => {
            setIsExpandedState(true);
          }}
        >
          {showMoreLabel}
        </Button>
      ),
    });
  }
  if (
    hasExpandToggle &&
    visibleParentCount > maxVisibleItems &&
    isExpandedState &&
    !forceExpanded
  ) {
    resolvedFooterItems.push({
      key: "show-less",
      className: "px-8 py-1",
      node: (
        <Button
          className="-ml-2 text-token-description-foreground hover:text-token-foreground"
          color="ghostMuted"
          size="default"
          onClick={() => {
            setIsExpandedState(false);
          }}
        >
          {showLessLabel}
        </Button>
      ),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner />
      </div>
    );
  }
  if (subagentBatchFilteredItems.length === 0 && emptyState) {
    return <div className={emptyStateClassName}>{emptyState}</div>;
  }

  return (
    <div className={clsx("flex flex-col", className)}>
      <SidebarThreadList
        items={listEntries}
        getKey={(item) =>
          item.type === "thread"
            ? item.item.task.key
            : `closed-subagents-toggle:${item.parentThreadId}`
        }
        ariaLabel={ariaLabel}
        itemClassName={itemClassName}
        itemWrapper={
          itemWrapper == null
            ? undefined
            : ({ item, className, children }) => {
                const ThreadItemWrapper = itemWrapper;
                return item.type === "thread" ? (
                  <ThreadItemWrapper item={item.item} className={className}>
                    {children}
                  </ThreadItemWrapper>
                ) : (
                  <SidebarListItem className={className}>
                    {children}
                  </SidebarListItem>
                );
              }
        }
        footerItems={resolvedFooterItems}
        renderRow={(item, archiveHandlers) =>
          item.type === "thread" ? (
            <SidebarThreadRow
              item={item.item}
              isActive={
                currentThreadKey != null &&
                getSidebarThreadKey(item.item.task) === currentThreadKey
              }
              onArchiveStart={archiveHandlers.onArchiveStart}
              onArchiveSuccess={archiveHandlers.onArchiveSuccess}
              onArchiveError={archiveHandlers.onArchiveError}
              onActivateThread={onActivateThread}
              hasSubagentChildren={(threadId: string) =>
                parentIdsWithChildren.has(threadId)
              }
              {...rowOptions}
            />
          ) : (
            <Button
              className="ml-11 text-token-description-foreground hover:text-token-foreground"
              color="ghostMuted"
              size="default"
              onClick={() => {
                setExpandedClosedSubagentParents((prev) => ({
                  ...prev,
                  [item.parentThreadId]: !item.isExpanded,
                }));
              }}
            >
              {item.isExpanded ? (
                <FormattedMessage
                  id="sidebarThreadSection.showLessClosedSubagents"
                  defaultMessage="Show less"
                  description="Button label for collapsing closed sub-agent rows beneath a parent thread in the sidebar"
                />
              ) : (
                <FormattedMessage
                  id="sidebarThreadSection.showMoreClosedSubagents"
                  defaultMessage="Show more"
                  description="Button label for expanding closed sub-agent rows beneath a parent thread in the sidebar"
                />
              )}
            </Button>
          )
        }
      />
    </div>
  );
}
