import type { DndContextProps, DragEndEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";

import { SidebarListItem } from "@/sidebar/sidebar-list-item";
import {
  getSidebarSubagentParentIds,
  getSidebarThreadKey,
  type SidebarThreadItem,
} from "@/sidebar/sidebar-thread-items";
import { SidebarThreadSection } from "@/sidebar/sidebar-thread-section";

export function PinnedThreadsSection({
  items,
  pinnedThreadIds,
  currentThreadKey,
  onActivateThread,
  ariaLabel,
  onPinnedOrderChange,
  expandedSubagentParentId,
  onToggleSubagentChildren,
}: {
  items: Array<SidebarThreadItem>;
  pinnedThreadIds: Array<string>;
  currentThreadKey: string | null;
  onActivateThread: (threadKey: string) => void;
  ariaLabel: string;
  onPinnedOrderChange: (nextPinnedThreadIds: Array<string>) => void;
  expandedSubagentParentId: string | null;
  onToggleSubagentChildren: (parentThreadId: string) => void;
}): ReactElement {
  const sortablePinnedThreadIds = getSortablePinnedThreadIds(items);
  const { dndContextProps } = usePinnedThreadReorderDnd({
    pinnedThreadIds,
    sortablePinnedThreadIds,
    onPinnedOrderChange,
  });
  const allPinnedParentIdsWithChildren = getSidebarSubagentParentIds(items);
  const pinnedParentThreadIds = new Set<string>();
  for (const item of items) {
    if (!item.isPinned || item.task.kind !== "local") {
      continue;
    }
    pinnedParentThreadIds.add(item.task.conversation.id);
  }
  const visibleItems = items.filter((item) => {
    if (item.subagentParentThreadId == null) {
      return true;
    }
    if (!pinnedParentThreadIds.has(item.subagentParentThreadId)) {
      return false;
    }
    if (expandedSubagentParentId === item.subagentParentThreadId) {
      return true;
    }
    const itemThreadKey = getSidebarThreadKey(item.task);
    return itemThreadKey != null && itemThreadKey === currentThreadKey;
  });

  return (
    <DndContext {...dndContextProps}>
      <SortableContext
        items={sortablePinnedThreadIds}
        strategy={verticalListSortingStrategy}
      >
        <SidebarThreadSection
          items={visibleItems}
          ariaLabel={ariaLabel}
          currentThreadKey={currentThreadKey}
          onActivateThread={onActivateThread}
          itemClassName="after:block after:h-px after:content-[''] last:after:hidden"
          itemWrapper={PinnedThreadListItem}
          rowOptions={{
            expandedSubagentParentId,
            hasSubagentChildren: (threadId: string) =>
              allPinnedParentIdsWithChildren.has(threadId),
            onToggleSubagentChildren,
          }}
        />
      </SortableContext>
    </DndContext>
  );
}

function PinnedThreadListItem({
  item,
  className,
  children,
}: {
  item: SidebarThreadItem;
  className?: string;
  children: ReactNode;
}): ReactElement {
  const threadId = getPinnedThreadId(item);
  if (threadId == null) {
    return (
      <SidebarListItem className={className} disableLayout>
        {children}
      </SidebarListItem>
    );
  }
  return (
    <PinnedThreadSortableListItem className={className} threadId={threadId}>
      {children}
    </PinnedThreadSortableListItem>
  );
}

function PinnedThreadSortableListItem({
  threadId,
  className,
  children,
}: {
  threadId: string;
  className?: string;
  children: ReactNode;
}): ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: threadId,
  });

  return (
    <SidebarListItem
      className={clsx(className, isDragging && "opacity-60")}
      disableLayout
      nodeRef={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div
        className="cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        {children}
      </div>
    </SidebarListItem>
  );
}

function getPinnedThreadId(item: SidebarThreadItem): string | null {
  if (!item.isPinned) {
    return null;
  }
  if (item.task.kind === "local") {
    return item.task.conversation.id;
  }
  if (item.task.kind === "remote") {
    return item.task.task.id;
  }
  return null;
}

function getSortablePinnedThreadIds(
  items: Array<SidebarThreadItem>,
): Array<string> {
  const threadIds: Array<string> = [];
  for (const item of items) {
    const threadId = getPinnedThreadId(item);
    if (threadId == null) {
      continue;
    }
    threadIds.push(threadId);
  }
  return threadIds;
}

function usePinnedThreadReorderDnd({
  pinnedThreadIds,
  sortablePinnedThreadIds,
  onPinnedOrderChange,
}: {
  pinnedThreadIds: Array<string>;
  sortablePinnedThreadIds: Array<string>;
  onPinnedOrderChange: (nextPinnedThreadIds: Array<string>) => void;
}): {
  dndContextProps: DndContextProps;
} {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over) {
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) {
      return;
    }
    const oldIndex = sortablePinnedThreadIds.indexOf(activeId);
    const newIndex = sortablePinnedThreadIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    const nextVisiblePinnedThreadIds = arrayMove(
      sortablePinnedThreadIds,
      oldIndex,
      newIndex,
    );
    const nextPinnedThreadIds = mergePinnedThreadOrder({
      pinnedThreadIds,
      visiblePinnedThreadIds: sortablePinnedThreadIds,
      nextVisiblePinnedThreadIds,
    });
    onPinnedOrderChange(nextPinnedThreadIds);
  };

  return {
    dndContextProps: {
      sensors,
      collisionDetection: closestCenter,
      onDragEnd: handleDragEnd,
    },
  };
}

function mergePinnedThreadOrder({
  pinnedThreadIds,
  visiblePinnedThreadIds,
  nextVisiblePinnedThreadIds,
}: {
  pinnedThreadIds: Array<string>;
  visiblePinnedThreadIds: Array<string>;
  nextVisiblePinnedThreadIds: Array<string>;
}): Array<string> {
  const visibleSet = new Set(visiblePinnedThreadIds);
  let visibleIndex = 0;
  const nextPinnedThreadIds: Array<string> = [];
  for (const threadId of pinnedThreadIds) {
    if (!visibleSet.has(threadId)) {
      nextPinnedThreadIds.push(threadId);
      continue;
    }
    const nextVisibleId = nextVisiblePinnedThreadIds[visibleIndex] ?? threadId;
    visibleIndex += 1;
    nextPinnedThreadIds.push(nextVisibleId);
  }
  return nextPinnedThreadIds;
}
