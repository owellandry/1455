import type {
  DndContextProps,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueries } from "@tanstack/react-query";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import {
  createGitCwd,
  GlobalStateKey,
  maybeErrorToString,
  type ConversationId,
  type HostConfig,
  type RemoteProject,
  type RemoteConnection,
} from "protocol";
import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { AppServerConnectionStateBadge } from "@/app-server/app-server-connection-state";
import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Spinner } from "@/components/spinner";
import { Tooltip } from "@/components/tooltip";
import { WorkspaceRootIcon } from "@/components/workspace-root-icon";
import { gitQueryOptions } from "@/git-rpc/git-api";
import { getHostKey } from "@/git-rpc/host-config-utils";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import {
  gitStableMetadataQueryOptions,
  useHasGitRpc,
} from "@/git-rpc/use-git-stable-metadata";
import type { MergedTask } from "@/header/recent-tasks-menu/use-merge-tasks";
import { useGlobalState } from "@/hooks/use-global-state";
import { usePlatform } from "@/hooks/use-platform";
import ArchiveIcon from "@/icons/archive.svg";
import AutoCompleteIcon from "@/icons/auto-complete.svg";
import ChatReplyPlusIcon from "@/icons/chat-reply-plus.svg";
import ChatsIcon from "@/icons/chats.svg";
import CheckMdIcon from "@/icons/check-md.svg";
import ClockIcon from "@/icons/clock.svg";
import CloudIcon from "@/icons/cloud.svg";
import ComposeIcon from "@/icons/compose.svg";
import EditIcon from "@/icons/edit.svg";
import FilterAltIcon from "@/icons/filter-alt.svg";
import FolderOpenIcon from "@/icons/folder-open.svg";
import FolderIcon from "@/icons/folder.svg";
import GlobeIcon from "@/icons/globe.svg";
import LaptopIcon from "@/icons/laptop.svg";
import PlayIcon from "@/icons/play-sm.svg";
import StarIcon from "@/icons/star.svg";
import ThreeDots from "@/icons/three-dots.svg";
import WorktreeIcon from "@/icons/worktree.svg";
import XIcon from "@/icons/x.svg";
import { messageBus } from "@/message-bus";
import {
  getRemoteProjectLabel,
  useSelectedRemoteProject,
} from "@/remote-projects/remote-projects";
import {
  DEFAULT_HOST_ID,
  getHostConfigForHostId,
  useHostConfig,
} from "@/shared-objects/use-host-config";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import type { ConnectionThreadGroup } from "@/sidebar/group-sidebar-items-by-connection";
import { ProjectArchiveThreadsDialog } from "@/sidebar/project-archive-threads-dialog";
import {
  asUnpinnedItems,
  buildSidebarThreadListEntries,
  countSidebarVisibleParentItems,
  filterSidebarItemsForCurrentSubagentCluster,
  getSidebarItemsWithinVisibleParentLimit,
  getSidebarItemsWithClosedSubagentsHidden,
  getSidebarThreadKey,
  getSidebarSubagentParentIds,
  getVisibleSubagentAwareTaskKeys,
  type SidebarThreadItem,
} from "@/sidebar/sidebar-thread-items";
import { SidebarThreadList } from "@/sidebar/sidebar-thread-list";
import { SidebarThreadRow } from "@/sidebar/sidebar-thread-row";
import { SidebarThreadSection } from "@/sidebar/sidebar-thread-section";
import { useProjectThreadArchiver } from "@/sidebar/use-project-thread-archiver";
import type { RepositoryTaskGroups } from "@/sidebar/use-repository-task-groups";
import { WorkspaceRootRename } from "@/sidebar/workspace-root-rename";
import { aThreadSortKey } from "@/thread-sort";
import { ACCORDION_TRANSITION } from "@/utils/animations";
import { getComparableFsPath } from "@/utils/path";
import { useResizeObserver } from "@/utils/use-resize-observer";
import { useFetchFromVSCode, useMutationFromVSCode } from "@/vscode-api";
import type { PendingWorktree } from "@/worktrees-v2/pending-worktree-store";
import { usePendingWorktreeActions } from "@/worktrees-v2/pending-worktree-store";

import { buildCreateStableWorktreeRequest } from "./create-stable-worktree";
import {
  aWorkspaceTaskFilter,
  isTaskRelevant,
  type WorkspaceTaskFilter,
} from "./is-task-relevant";
import { getOpenInFileManagerMessage } from "./open-in-file-manager-message";

const MAX_TASKS_PER_GROUP = 10;

type ProjectHeaderMenuKind = "local" | "remote" | null;
export type SidebarOrganizeMode = "project" | "connection" | "recent";

export function SidebarThreadsSection({
  groups,
  connectionGroups,
  organizeMode,
  unpinnedItemByTaskKey,
  pendingStableWorktrees,
  currentConversationId,
  currentThreadKey,
  currentGroupId,
  onActivateThread,
  shouldAnimateGroups,
  collapsedGroups,
  setCollapsedGroups,
  workspaceRootOptions,
  workspaceRootLabels,
  startNewConversation,
  expandedSubagentParentId,
  onToggleSubagentChildren,
  isBackgroundSubagentsEnabled,
}: {
  groups: Array<RepositoryTaskGroups>;
  connectionGroups: Array<ConnectionThreadGroup>;
  organizeMode: Exclude<SidebarOrganizeMode, "recent">;
  unpinnedItemByTaskKey: Map<string, SidebarThreadItem>;
  pendingStableWorktrees: Array<PendingWorktree>;
  currentConversationId: ConversationId | null;
  currentThreadKey: string | null;
  currentGroupId: string | null;
  onActivateThread: (threadKey: string) => void;
  shouldAnimateGroups: boolean;
  collapsedGroups: Record<string, boolean>;
  setCollapsedGroups: (next: Record<string, boolean>) => void;
  workspaceRootOptions: Array<string> | undefined;
  workspaceRootLabels: Record<string, string>;
  startNewConversation: () => void;
  expandedSubagentParentId: string | null;
  onToggleSubagentChildren: (parentThreadId: string) => void;
  isBackgroundSubagentsEnabled: boolean;
}): ReactElement {
  const localWorkspaceRoots = workspaceRootOptions;
  const groupIds =
    organizeMode === "connection"
      ? connectionGroups.map((group) => group.key)
      : groups.map((group) => group.projectId);
  const { reorderGroup } = useVisibleSidebarGroupOrdering({
    groupIds,
    orderKey:
      organizeMode === "connection"
        ? GlobalStateKey.CONNECTION_GROUP_ORDER
        : GlobalStateKey.PROJECT_ORDER,
  });
  const { dndContextProps, dropIndicatorIndex } = useSidebarGroupReorderDnd({
    groupIds,
    reorderGroup,
  });
  const rootsToCheck = localWorkspaceRoots ?? [];
  const { data: pathsExistResult } = useFetchFromVSCode("paths-exist", {
    params: { paths: rootsToCheck },
    queryConfig: { enabled: rootsToCheck.length > 0 },
  });
  const hasPathsExistResult = pathsExistResult != null;
  const existingWorkspaceRootSet = new Set(
    (pathsExistResult?.existingPaths ?? []).map((path) =>
      getComparableFsPath(path).replace(/\/+$/, ""),
    ),
  );
  const toggleGroup = (groupId: string): void => {
    const nextValue = !collapsedGroups[groupId];
    const next = { ...collapsedGroups };
    if (nextValue) {
      next[groupId] = true;
    } else {
      delete next[groupId];
    }
    setCollapsedGroups(next);
  };
  const renderGroupRow = (group: RepositoryTaskGroups): ReactElement => {
    const hasLocalAvailability =
      group.projectKind === "local" &&
      !!localWorkspaceRoots?.includes(group.path) &&
      hasPathsExistResult &&
      !!existingWorkspaceRootSet.has(
        getComparableFsPath(group.path).replace(/\/+$/, ""),
      );

    const isMissingWorkspaceRoot =
      group.projectKind === "local" && !hasLocalAvailability;

    return (
      <SidebarThreadGroupRow
        key={`${group.projectId}-${group.repositoryData?.ownerRepo?.repoName}`}
        group={group}
        unpinnedItemByTaskKey={unpinnedItemByTaskKey}
        collapsedGroups={collapsedGroups}
        onToggleGroup={toggleGroup}
        allowReorder={organizeMode === "project"}
        localWorkspaceRoots={localWorkspaceRoots}
        workspaceRootLabels={workspaceRootLabels}
        currentConversationId={currentConversationId}
        currentThreadKey={currentThreadKey}
        currentGroupId={currentGroupId}
        onActivateThread={onActivateThread}
        startNewConversation={startNewConversation}
        expandedSubagentParentId={expandedSubagentParentId}
        onToggleSubagentChildren={onToggleSubagentChildren}
        isBackgroundSubagentsEnabled={isBackgroundSubagentsEnabled}
        shouldAnimateGroups={shouldAnimateGroups}
        isMissingWorkspaceRoot={isMissingWorkspaceRoot}
        showHostSuffix={organizeMode === "project"}
      />
    );
  };
  const renderedGroups = buildSidebarGroupRows({
    groups,
    getGroupId: (group) => group.projectId,
    dropIndicatorIndex,
    renderGroupRow,
  });
  const renderedConnectionGroups = buildSidebarGroupRows({
    groups: connectionGroups,
    getGroupId: (group) => group.key,
    dropIndicatorIndex,
    renderGroupRow: (group) => (
      <ConnectionThreadGroupRow
        key={group.key}
        group={group}
        collapsedGroups={collapsedGroups}
        onToggleGroup={toggleGroup}
        allowReorder
        currentConversationId={currentConversationId}
        currentThreadKey={currentThreadKey}
        currentGroupId={currentGroupId}
        onActivateThread={onActivateThread}
        expandedSubagentParentId={expandedSubagentParentId}
        onToggleSubagentChildren={onToggleSubagentChildren}
        isBackgroundSubagentsEnabled={isBackgroundSubagentsEnabled}
        shouldAnimateGroups={shouldAnimateGroups}
      />
    ),
  });
  const pendingRows = pendingStableWorktrees.map((pendingWorktree) => (
    <PendingStableWorkspaceRootRow
      key={`pending-stable-root:${pendingWorktree.id}`}
      pendingWorktree={pendingWorktree}
      isActive={currentThreadKey === `pending:${pendingWorktree.id}`}
      onActivateThread={onActivateThread}
    />
  ));

  return (
    <div>
      {pendingRows.length > 0 ? (
        <div role="list" className="mb-1">
          {pendingRows}
        </div>
      ) : null}
      <DndContext {...dndContextProps}>
        <SortableContext
          items={groupIds}
          strategy={verticalListSortingStrategy}
        >
          <div role="list">
            {organizeMode === "connection"
              ? renderedConnectionGroups
              : renderedGroups}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function PendingStableWorkspaceRootRow({
  pendingWorktree,
  isActive,
  onActivateThread,
}: {
  pendingWorktree: PendingWorktree;
  isActive: boolean;
  onActivateThread: (threadKey: string) => void;
}): ReactElement {
  const navigate = useNavigate();
  const openPendingWorktree = (): void => {
    onActivateThread(`pending:${pendingWorktree.id}`);
    void navigate(`/worktree-init-v2/${pendingWorktree.id}`);
  };
  return (
    <div
      role="listitem"
      className={clsx(
        "text-token-foreground electron:opacity-75 group/folder-row flex items-center justify-between overflow-x-hidden text-sm rounded-lg hover:bg-token-list-hover-background py-0.5 focus-visible:outline focus-visible:outline-offset-2",
        isActive && "bg-token-list-hover-background",
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-1 pr-2 pl-1 text-left"
        onClick={openPendingWorktree}
        aria-label={pendingWorktree.label}
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          <Spinner className="icon-xs" />
        </span>
        <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
          <span className="truncate pr-1">{pendingWorktree.label}</span>
        </span>
      </button>
    </div>
  );
}

function useSidebarGroupReorderDnd({
  groupIds,
  reorderGroup,
}: {
  groupIds: Array<string>;
  reorderGroup: (activeId: string, overId: string) => void;
}): {
  dndContextProps: DndContextProps;
  dropIndicatorIndex: number | null;
} {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );
  const [dragState, setDragState] = useState<{
    activeId: string | null;
    overId: string | null;
  }>({
    activeId: null,
    overId: null,
  });
  const handleDragStart = (event: DragStartEvent): void => {
    setDragState({
      activeId: String(event.active.id),
      overId: null,
    });
  };
  const handleDragOver = (event: DragOverEvent): void => {
    setDragState(
      (
        prev,
      ): {
        activeId: string | null;
        overId: string | null;
      } => ({
        activeId: prev.activeId,
        overId: event.over ? String(event.over.id) : null,
      }),
    );
  };
  const handleDragCancel = (): void => {
    setDragState({
      activeId: null,
      overId: null,
    });
  };
  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over) {
      handleDragCancel();
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) {
      handleDragCancel();
      return;
    }

    reorderGroup(activeId, overId);
    handleDragCancel();
  };

  let dropIndicatorIndex: number | null = null;
  if (dragState.activeId != null && dragState.overId != null) {
    const activeIndex = groupIds.indexOf(dragState.activeId);
    const overIndex = groupIds.indexOf(dragState.overId);
    if (
      activeIndex !== -1 &&
      overIndex !== -1 &&
      dragState.activeId !== dragState.overId
    ) {
      if (activeIndex < overIndex) {
        dropIndicatorIndex = overIndex + 1;
      } else {
        dropIndicatorIndex = overIndex;
      }
    }
  }

  return {
    dndContextProps: {
      sensors,
      collisionDetection: closestCenter,
      modifiers: [restrictToVerticalAxis],
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragCancel: handleDragCancel,
      onDragEnd: handleDragEnd,
    },
    dropIndicatorIndex,
  };
}

function buildSidebarGroupRows<T>({
  groups,
  getGroupId,
  dropIndicatorIndex,
  renderGroupRow,
}: {
  groups: Array<T>;
  getGroupId: (group: T) => string;
  dropIndicatorIndex: number | null;
  renderGroupRow: (group: T) => ReactElement;
}): Array<ReactElement> {
  const renderedGroups: Array<ReactElement> = [];
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const groupId = getGroupId(group);
    if (dropIndicatorIndex === index) {
      renderedGroups.push(<DropIndicator key={`drop-indicator-${groupId}`} />);
    }
    renderedGroups.push(renderGroupRow(group));
  }

  if (dropIndicatorIndex === groups.length) {
    renderedGroups.push(<DropIndicator key="drop-indicator-end" />);
  }

  return renderedGroups;
}

function DropIndicator(): ReactElement {
  return (
    <div
      aria-hidden
      className="mx-2 my-1 h-0.5 rounded bg-token-border/80"
      role="presentation"
    />
  );
}

export function SidebarThreadGroupLabelText({
  label,
  suffix,
  labelTooltipContent,
  suffixTooltipContent,
}: {
  label: string;
  suffix?: string;
  labelTooltipContent?: ReactNode;
  suffixTooltipContent?: ReactNode;
}): ReactElement {
  const [isSuffixTruncated, setIsSuffixTruncated] = useState(false);
  const observeSuffixRef = useResizeObserver<HTMLSpanElement>(
    (_entry, element) => {
      setIsSuffixTruncated(element.scrollWidth > element.clientWidth);
    },
  );

  const setSuffixRef = (node: HTMLSpanElement | null): void => {
    observeSuffixRef(node);
    if (node != null) {
      setIsSuffixTruncated(node.scrollWidth > node.clientWidth);
    }
  };

  const labelText = <span className="min-w-0 truncate pr-1">{label}</span>;
  const suffixText =
    suffix != null ? (
      <span
        ref={setSuffixRef}
        className="max-w-[60%] shrink truncate text-token-description-foreground"
      >
        {suffix}
      </span>
    ) : null;

  return (
    <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
      {labelTooltipContent != null ? (
        <Tooltip delayOpen tooltipContent={labelTooltipContent}>
          {labelText}
        </Tooltip>
      ) : (
        labelText
      )}
      {suffixText != null ? (
        <Tooltip
          delayOpen
          tooltipContent={suffixTooltipContent}
          disabled={suffixTooltipContent == null || !isSuffixTruncated}
        >
          {suffixText}
        </Tooltip>
      ) : null}
    </span>
  );
}

export function SidebarThreadGroupBadges({
  isWorktreeGroup = false,
}: {
  isWorktreeGroup?: boolean;
}): ReactElement | null {
  if (!isWorktreeGroup) {
    return null;
  }

  return (
    <>
      {isWorktreeGroup ? (
        <Tooltip
          tooltipContent={
            <FormattedMessage
              id="sidebarElectron.worktreeGroupTooltip"
              defaultMessage="This is a git worktree"
              description="Tooltip shown next to a workspace root that is a git worktree"
            />
          }
        >
          <WorktreeIcon className="icon-xs shrink-0 text-token-description-foreground" />
        </Tooltip>
      ) : null}
    </>
  );
}

function SidebarThreadGroupRow({
  group,
  unpinnedItemByTaskKey,
  collapsedGroups,
  onToggleGroup,
  allowReorder,
  localWorkspaceRoots,
  workspaceRootLabels,
  currentConversationId,
  currentThreadKey,
  currentGroupId,
  onActivateThread,
  startNewConversation,
  expandedSubagentParentId,
  onToggleSubagentChildren,
  isBackgroundSubagentsEnabled,
  shouldAnimateGroups,
  isMissingWorkspaceRoot,
  showHostSuffix,
}: {
  group: RepositoryTaskGroups;
  unpinnedItemByTaskKey: Map<string, SidebarThreadItem>;
  collapsedGroups: Record<string, boolean>;
  onToggleGroup: (groupId: string) => void;
  allowReorder: boolean;
  localWorkspaceRoots: Array<string> | undefined;
  workspaceRootLabels: Record<string, string>;
  currentConversationId: ConversationId | null;
  currentThreadKey: string | null;
  currentGroupId: string | null;
  onActivateThread: (threadKey: string) => void;
  startNewConversation: () => void;
  expandedSubagentParentId: string | null;
  onToggleSubagentChildren: (parentThreadId: string) => void;
  isBackgroundSubagentsEnabled: boolean;
  shouldAnimateGroups: boolean;
  isMissingWorkspaceRoot: boolean;
  showHostSuffix: boolean;
}): ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const { setSelectedRemoteProjectId } = useSelectedRemoteProject();
  const groupPath = group.path;
  const groupProjectId = group.projectId;
  const isCollapsed = !!collapsedGroups[groupProjectId];
  const projectHeaderMenuKind = getProjectHeaderMenuKind({
    group,
    localWorkspaceRoots,
  });
  const rootFolder = group.repositoryData?.rootFolder;
  const isSubfolder = rootFolder && rootFolder !== group.label;
  const isWorktreeGroup = !!group.isCodexWorktree;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: groupProjectId,
    disabled: !allowReorder,
  });
  const newThreadLabel = intl.formatMessage(
    {
      id: "sidebarElectron.newThreadInGroup",
      defaultMessage: "Start new thread in {folder}",
      description: "Button label to start a new thread within a folder",
    },
    { folder: group.label || groupPath },
  );
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const missingWorkspaceMessage = intl.formatMessage({
    id: "sidebarElectron.missingWorkspaceRoot",
    defaultMessage: "This project folder was deleted or moved",
    description: "Tooltip shown when a workspace root path no longer exists",
  });
  const startNewThreadInGroup = (): void => {
    if (isMissingWorkspaceRoot) {
      return;
    }
    if (group.projectKind === "remote") {
      setSelectedRemoteProjectId(group.projectId);
    } else {
      setSelectedRemoteProjectId(null);
      messageBus.dispatchMessage("electron-set-active-workspace-root", {
        root: groupPath,
      });
    }
    startNewConversation();
  };
  const showProjectHome = (): void => {
    if (isMissingWorkspaceRoot) {
      return;
    }
    if (group.projectKind === "remote") {
      setSelectedRemoteProjectId(group.projectId);
    } else {
      setSelectedRemoteProjectId(null);
      messageBus.dispatchMessage("electron-set-active-workspace-root", {
        root: groupPath,
      });
    }
    void navigate("/");
  };
  const handleRowClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }
    onToggleGroup(groupProjectId);
  };
  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ): void => {
    if (event.currentTarget !== event.target) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggleGroup(groupProjectId);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={clsx(
        "group/cwd flex flex-col",
        allowReorder && isDragging && "opacity-60",
      )}
      role="listitem"
      aria-label={group.label || groupPath}
    >
      <div
        {...(allowReorder ? attributes : {})}
        className={clsx(
          "text-token-foreground electron:opacity-75 group/folder-row flex items-center justify-between overflow-x-hidden text-sm rounded-lg hover:bg-token-list-hover-background py-0.5 focus-visible:outline focus-visible:outline-offset-2",
          isMissingWorkspaceRoot &&
            "text-token-description-foreground opacity-70",
        )}
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        onContextMenu={(event) => {
          if (projectHeaderMenuKind == null) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          setIsWorkspaceDropdownOpen(true);
        }}
        aria-label={group.label || groupPath}
        aria-expanded={!isCollapsed}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 pl-1">
          <span className="relative flex h-6 w-6 items-center justify-center">
            <WorkspaceRootIcon
              isCodexWorktree={isWorktreeGroup}
              isRemoteProject={group.projectKind === "remote"}
              isOpen={!isCollapsed}
              className="icon-xs shrink-0 group-hover/folder-row:opacity-0"
            />
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/folder-row:opacity-100">
              <FolderChevron
                isCollapsed={isCollapsed}
                groupPath={groupProjectId}
                toggleGroup={onToggleGroup}
              />
            </span>
          </span>
          <div
            ref={allowReorder ? setActivatorNodeRef : undefined}
            className={clsx(
              "flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap rounded-md pr-0 py-1 text-left text-base",
              isMissingWorkspaceRoot
                ? "text-token-description-foreground"
                : "text-token-foreground",
              allowReorder && "cursor-grab active:cursor-grabbing",
            )}
            {...(allowReorder ? listeners : {})}
          >
            <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
              <SidebarThreadGroupLabelText
                label={group.label}
                suffix={
                  (showHostSuffix ? group.hostDisplayName : undefined) ??
                  (isSubfolder ? rootFolder : undefined)
                }
                labelTooltipContent={
                  <div className="max-w-64 break-all">
                    <div>{groupPath}</div>
                    {isMissingWorkspaceRoot ? (
                      <div className="text-token-description-foreground">
                        {missingWorkspaceMessage}
                      </div>
                    ) : null}
                  </div>
                }
                suffixTooltipContent={
                  (showHostSuffix ? group.hostDisplayName : undefined) ??
                  (isSubfolder ? rootFolder : undefined)
                }
              />
              {group.projectKind === "remote" && group.hostId != null ? (
                <AppServerConnectionStateBadge
                  hostId={group.hostId}
                  compact
                  hiddenStates={["connected", "unauthed"]}
                />
              ) : null}
              <SidebarThreadGroupBadges isWorktreeGroup={isWorktreeGroup} />
            </span>
          </div>
        </div>
        <WorkspaceActions
          groupProjectId={groupProjectId}
          groupPath={groupPath}
          groupLabel={group.label}
          tasks={group.tasks}
          projectHeaderMenuKind={projectHeaderMenuKind}
          canCreateStableWorktree={group.repositoryData != null}
          workspaceRootOptions={localWorkspaceRoots}
          workspaceRootLabels={workspaceRootLabels}
          currentThreadKey={currentThreadKey}
          onStartNewThread={startNewThreadInGroup}
          onShowProjectHome={showProjectHome}
          newThreadLabel={newThreadLabel}
          canStartNewThread={!isMissingWorkspaceRoot}
          newThreadDisabledLabel={missingWorkspaceMessage}
          workspaceDropdownOpen={isWorkspaceDropdownOpen}
          onWorkspaceDropdownOpenChange={setIsWorkspaceDropdownOpen}
        />
      </div>
      {shouldAnimateGroups ? (
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              key={`${groupPath}-tasks`}
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 2 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={ACCORDION_TRANSITION}
              className="overflow-hidden"
            >
              <RepoFolderTaskList
                tasks={group.tasks}
                unpinnedItemByTaskKey={unpinnedItemByTaskKey}
                groupProjectId={groupProjectId}
                groupProjectKind={group.projectKind}
                groupPath={groupPath}
                groupLabel={group.label}
                hideWorktreeIcon={false}
                currentConversationId={currentConversationId}
                currentThreadKey={currentThreadKey}
                currentGroupId={currentGroupId}
                onActivateThread={onActivateThread}
                startNewConversation={startNewThreadInGroup}
                expandedSubagentParentId={expandedSubagentParentId}
                onToggleSubagentChildren={onToggleSubagentChildren}
                isBackgroundSubagentsEnabled={isBackgroundSubagentsEnabled}
              />
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        !isCollapsed && (
          <div className="mt-0.5 overflow-hidden">
            <RepoFolderTaskList
              tasks={group.tasks}
              unpinnedItemByTaskKey={unpinnedItemByTaskKey}
              groupProjectId={groupProjectId}
              groupProjectKind={group.projectKind}
              groupPath={groupPath}
              groupLabel={group.label}
              hideWorktreeIcon={false}
              currentConversationId={currentConversationId}
              currentThreadKey={currentThreadKey}
              currentGroupId={currentGroupId}
              onActivateThread={onActivateThread}
              startNewConversation={startNewThreadInGroup}
              expandedSubagentParentId={expandedSubagentParentId}
              onToggleSubagentChildren={onToggleSubagentChildren}
              isBackgroundSubagentsEnabled={isBackgroundSubagentsEnabled}
            />
          </div>
        )
      )}
    </div>
  );
}

function ConnectionThreadGroupRow({
  group,
  collapsedGroups,
  onToggleGroup,
  allowReorder,
  currentConversationId,
  currentThreadKey,
  currentGroupId,
  onActivateThread,
  expandedSubagentParentId,
  onToggleSubagentChildren,
  isBackgroundSubagentsEnabled,
  shouldAnimateGroups,
}: {
  group: ConnectionThreadGroup;
  collapsedGroups: Record<string, boolean>;
  onToggleGroup: (groupId: string) => void;
  allowReorder: boolean;
  currentConversationId: ConversationId | null;
  currentThreadKey: string | null;
  currentGroupId: string | null;
  onActivateThread: (threadKey: string) => void;
  expandedSubagentParentId: string | null;
  onToggleSubagentChildren: (parentThreadId: string) => void;
  isBackgroundSubagentsEnabled: boolean;
  shouldAnimateGroups: boolean;
}): ReactElement {
  const intl = useIntl();
  const isCollapsed = !!collapsedGroups[group.key];
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.key,
    disabled: !allowReorder,
  });
  const { codexHome, filteredItems, hasFilteredItems } =
    useFilteredConnectionItems({
      items: group.items,
      currentConversationId,
      isBackgroundSubagentsEnabled,
    });
  const label = getConnectionGroupLabel(group, intl);
  const shouldAutoExpand =
    currentGroupId === group.key &&
    shouldAutoExpandSidebarItemList({
      items: filteredItems,
      currentThreadKey,
      maxParentItems: MAX_TASKS_PER_GROUP,
    });
  const threadSection = (
    <SidebarThreadSection
      items={filteredItems}
      ariaLabel={intl.formatMessage(
        {
          id: "sidebarElectron.tasksInConnection",
          defaultMessage: "Threads in {connection}",
          description:
            "List label for threads inside a connection group in the sidebar",
        },
        { connection: label },
      )}
      itemClassName="after:block after:h-px after:content-[''] last:after:hidden"
      emptyState={
        hasFilteredItems ? (
          <FormattedMessage
            id="sidebarElectron.noTasksWithFilter"
            defaultMessage="No threads match filters"
            description="Shown when all tasks are hidden by sidebar filters"
          />
        ) : (
          <FormattedMessage
            id="sidebarElectron.noTasks"
            defaultMessage="No threads"
            description="Shown when a folder group has no threads"
          />
        )
      }
      emptyStateClassName="text-token-description-foreground opacity-50 px-8 py-1 text-base"
      rowOptions={{
        codexHome,
        isGrouped: true,
        showRemoteActionsMenu: true,
        expandedSubagentParentId,
        onToggleSubagentChildren,
      }}
      onActivateThread={onActivateThread}
      currentThreadKey={currentThreadKey}
      maxItems={MAX_TASKS_PER_GROUP}
      showMoreLabel={
        <FormattedMessage
          id="sidebarElectron.showMore"
          defaultMessage="Show more"
          description="Button label for expanding a task list in the sidebar"
        />
      }
      showLessLabel={
        <FormattedMessage
          id="sidebarElectron.showLess"
          defaultMessage="Show less"
          description="Button label for collapsing a task list in the sidebar"
        />
      }
      forceExpanded={shouldAutoExpand}
      className="pb-2"
    />
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={clsx(
        "group/cwd flex flex-col",
        allowReorder && isDragging && "opacity-60",
      )}
      role="listitem"
      aria-label={label}
    >
      <div
        {...(allowReorder ? attributes : {})}
        className="group/folder-row flex items-center justify-between overflow-x-hidden rounded-lg py-0.5 text-sm text-token-foreground hover:bg-token-list-hover-background focus-visible:outline focus-visible:outline-offset-2 electron:opacity-75"
        role="button"
        tabIndex={0}
        onClick={(event) => {
          if (event.defaultPrevented || event.button !== 0) {
            return;
          }
          onToggleGroup(group.key);
        }}
        onKeyDown={(event) => {
          if (event.currentTarget !== event.target) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggleGroup(group.key);
          }
        }}
        aria-label={label}
        aria-expanded={!isCollapsed}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 pl-1">
          <span className="relative flex h-6 w-6 items-center justify-center">
            <ConnectionGroupIcon
              kind={group.kind}
              className="icon-xs shrink-0 group-hover/folder-row:opacity-0"
            />
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/folder-row:opacity-100">
              <FolderChevron
                isCollapsed={isCollapsed}
                groupPath={group.key}
                toggleGroup={onToggleGroup}
              />
            </span>
          </span>
          <div
            ref={allowReorder ? setActivatorNodeRef : undefined}
            className={clsx(
              "flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap rounded-md py-1 pr-0 text-left text-base",
              allowReorder && "cursor-grab active:cursor-grabbing",
            )}
            {...(allowReorder ? listeners : {})}
          >
            <Tooltip
              delayOpen
              tooltipContent={
                group.hostId != null && group.hostDisplayName != null ? (
                  <div className="max-w-64 break-all">{group.hostId}</div>
                ) : null
              }
            >
              <SidebarThreadGroupLabelText label={label} />
            </Tooltip>
          </div>
        </div>
      </div>
      {shouldAnimateGroups ? (
        <AnimatePresence initial={false}>
          {!isCollapsed ? (
            <motion.div
              key={`${group.key}-tasks`}
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 2 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={ACCORDION_TRANSITION}
              className="overflow-hidden"
            >
              {threadSection}
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : !isCollapsed ? (
        <div className="mt-0.5 overflow-hidden">{threadSection}</div>
      ) : null}
    </div>
  );
}

function ConnectionGroupIcon({
  kind,
  className,
}: {
  kind: ConnectionThreadGroup["kind"];
  className?: string;
}): ReactElement {
  switch (kind) {
    case "cloud":
      return <CloudIcon className={className} />;
    case "local":
      return <LaptopIcon className={className} />;
    case "remote":
      return <GlobeIcon className={className} />;
  }
}

function getConnectionGroupLabel(
  group: ConnectionThreadGroup,
  intl: ReturnType<typeof useIntl>,
): string {
  switch (group.kind) {
    case "cloud":
      return intl.formatMessage({
        id: "sidebarElectron.connectionGroup.cloud",
        defaultMessage: "Cloud",
        description:
          "Connection group label for cloud-hosted threads in the sidebar",
      });
    case "local":
      return intl.formatMessage({
        id: "sidebarElectron.connectionGroup.local",
        defaultMessage: "Local",
        description: "Connection group label for local threads in the sidebar",
      });
    case "remote":
      return group.hostDisplayName ?? group.hostId ?? "";
  }
}

/**
 * Maintain a stable, visible-only ordering for sidebar groups so move controls
 * operate on rows that actually render in the sidebar.
 */
function useVisibleSidebarGroupOrdering({
  groupIds,
  orderKey,
}: {
  groupIds: Array<string>;
  orderKey:
    | typeof GlobalStateKey.PROJECT_ORDER
    | typeof GlobalStateKey.CONNECTION_GROUP_ORDER;
}): {
  reorderGroup: (activeId: string, overId: string) => void;
} {
  const { data: groupOrder, setData: setGroupOrder } = useGlobalState(orderKey);
  const visibleGroupIdSet = new Set(groupIds);
  const orderedGroupIds = (groupOrder ?? []).filter((groupId) =>
    visibleGroupIdSet.has(groupId),
  );
  const seenGroupIds = new Set(orderedGroupIds);

  for (const groupId of groupIds) {
    if (seenGroupIds.has(groupId)) {
      continue;
    }

    orderedGroupIds.push(groupId);
    seenGroupIds.add(groupId);
  }

  const reorderGroup = (activeId: string, overId: string): void => {
    const oldIndex = groupIds.indexOf(activeId);
    const newIndex = groupIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const nextVisibleGroupIds = arrayMove(groupIds, oldIndex, newIndex);
    let visibleGroupIndex = 0;
    const nextGroupOrder = orderedGroupIds.map((groupId): string => {
      if (!visibleGroupIdSet.has(groupId)) {
        return groupId;
      }

      const nextGroupId = nextVisibleGroupIds[visibleGroupIndex];
      visibleGroupIndex += 1;
      return nextGroupId ?? groupId;
    });

    void setGroupOrder(nextGroupOrder);
  };

  return { reorderGroup };
}

function RepoFolderTaskList({
  tasks,
  unpinnedItemByTaskKey,
  groupProjectId,
  groupProjectKind,
  groupPath,
  groupLabel,
  hideWorktreeIcon,
  currentConversationId,
  currentThreadKey,
  currentGroupId,
  onActivateThread,
  startNewConversation,
  expandedSubagentParentId,
  onToggleSubagentChildren,
  isBackgroundSubagentsEnabled,
}: {
  tasks: Array<MergedTask>;
  unpinnedItemByTaskKey: Map<string, SidebarThreadItem>;
  groupProjectId: string;
  groupProjectKind: "local" | "remote";
  groupPath: string;
  groupLabel: string;
  hideWorktreeIcon: boolean;
  currentConversationId: ConversationId | null;
  currentThreadKey: string | null;
  currentGroupId: string | null;
  onActivateThread: (threadKey: string) => void;
  startNewConversation: () => void;
  expandedSubagentParentId: string | null;
  onToggleSubagentChildren: (parentThreadId: string) => void;
  isBackgroundSubagentsEnabled: boolean;
}): ReactElement {
  const intl = useIntl();
  const { setSelectedRemoteProjectId } = useSelectedRemoteProject();
  const [isExpandedState, setIsExpandedState] = useState(false);
  const [expandedClosedSubagentParents, setExpandedClosedSubagentParents] =
    useState<Record<string, boolean>>({});
  const { filteredTasks, hasFilteredTasks, codexHome } = useFilteredTasks({
    tasks,
    groupPath,
    currentConversationId,
    isBackgroundSubagentsEnabled,
  });
  const fallbackItems = asUnpinnedItems(filteredTasks, {
    allTasks: tasks,
    isBackgroundSubagentsEnabled,
  });
  const fallbackItemByTaskKey = new Map(
    fallbackItems.map((item) => [item.task.key, item]),
  );
  const allItemsToRender = filteredTasks
    .map(
      (task) =>
        unpinnedItemByTaskKey.get(task.key) ??
        fallbackItemByTaskKey.get(task.key),
    )
    .filter((item): item is SidebarThreadItem => item != null);
  const shouldAutoExpand =
    currentGroupId === groupProjectId &&
    shouldAutoExpandSidebarItemList({
      items: allItemsToRender,
      currentThreadKey,
      maxParentItems: MAX_TASKS_PER_GROUP,
    });
  const isExpanded = isExpandedState || shouldAutoExpand;
  const parentIdsWithChildren = getSidebarSubagentParentIds(allItemsToRender);
  const clusterFilteredItems = filterSidebarItemsForCurrentSubagentCluster({
    items: allItemsToRender,
    currentThreadKey,
    expandedSubagentParentId,
  });
  const subagentItemsState = getSidebarItemsWithClosedSubagentsHidden({
    items: clusterFilteredItems,
    currentThreadKey,
    expandedClosedSubagentParents,
  });
  const visibleParentCount = countSidebarVisibleParentItems(
    subagentItemsState.items,
  );
  const itemsToRender = isExpanded
    ? subagentItemsState.items
    : getSidebarItemsWithinVisibleParentLimit({
        items: subagentItemsState.items,
        maxParentItems: MAX_TASKS_PER_GROUP,
      });
  const listEntries = buildSidebarThreadListEntries({
    items: itemsToRender,
    hiddenClosedChildCountByParentId:
      subagentItemsState.hiddenClosedChildCountByParentId,
    expandedClosedSubagentParents,
  });
  const footerItems: Array<{
    key: string;
    node: ReactNode;
    className?: string;
  }> = [];
  if (visibleParentCount > MAX_TASKS_PER_GROUP && !isExpanded) {
    footerItems.push({
      key: "repo-show-more",
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
          <FormattedMessage
            id="sidebarElectron.showMore"
            defaultMessage="Show more"
            description="Button label for expanding a task list in the sidebar"
          />
        </Button>
      ),
    });
  }
  if (
    isExpandedState &&
    visibleParentCount > MAX_TASKS_PER_GROUP &&
    !shouldAutoExpand
  ) {
    footerItems.push({
      key: "repo-show-less",
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
          <FormattedMessage
            id="sidebarElectron.showLess"
            defaultMessage="Show less"
            description="Button label for collapsing a task list in the sidebar"
          />
        </Button>
      ),
    });
  }
  const emptyState = hasFilteredTasks ? (
    <FormattedMessage
      id="sidebarElectron.noTasksWithFilter"
      defaultMessage="No threads match filters"
      description="Shown when all tasks are hidden by sidebar filters"
    />
  ) : (
    <FormattedMessage
      id="sidebarElectron.noTasks"
      defaultMessage="No threads"
      description="Shown when a folder group has no threads"
    />
  );
  const isCurrentGroup = currentGroupId === groupProjectId;
  const activateGroup = (): void => {
    if (isCurrentGroup) {
      return;
    }

    if (groupProjectKind === "remote") {
      setSelectedRemoteProjectId(groupProjectId);
      return;
    }

    setSelectedRemoteProjectId(null);
    messageBus.dispatchMessage("electron-set-active-workspace-root", {
      root: groupPath,
    });
  };
  return (
    <SidebarThreadList
      items={listEntries}
      getKey={(item) =>
        item.type === "thread"
          ? item.item.task.key
          : `closed-subagents-toggle:${item.parentThreadId}`
      }
      ariaLabel={intl.formatMessage(
        {
          id: "sidebarElectron.tasksInFolder",
          defaultMessage: "Automations in {folder}",
          description: "List label for automations inside a folder",
        },
        { folder: groupLabel || groupPath },
      )}
      className="pb-2"
      itemClassName="after:block after:h-px after:content-[''] last:after:hidden"
      footerItems={footerItems}
      emptyState={emptyState}
      emptyStateClassName="text-token-description-foreground opacity-50 px-8 py-1 text-base"
      renderRow={(item, archiveHandlers) =>
        item.type === "thread" ? (
          <SidebarThreadRow
            item={item.item}
            isActive={
              currentThreadKey != null &&
              getSidebarThreadKey(item.item.task) === currentThreadKey
            }
            codexHome={codexHome}
            hideWorktreeIcon={hideWorktreeIcon}
            onActivateGroup={activateGroup}
            onActivateThread={onActivateThread}
            onStartNewConversation={startNewConversation}
            isGrouped={true}
            showRemoteActionsMenu={true}
            expandedSubagentParentId={expandedSubagentParentId}
            hasSubagentChildren={(threadId: string) =>
              parentIdsWithChildren.has(threadId)
            }
            onToggleSubagentChildren={onToggleSubagentChildren}
            onArchiveStart={archiveHandlers.onArchiveStart}
            onArchiveSuccess={archiveHandlers.onArchiveSuccess}
            onArchiveError={archiveHandlers.onArchiveError}
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
                id="sidebarThreadsSection.showLessClosedSubagents"
                defaultMessage="Show less"
                description="Button label for collapsing closed sub-agent rows beneath a parent thread in the sidebar"
              />
            ) : (
              <FormattedMessage
                id="sidebarThreadsSection.showMoreClosedSubagents"
                defaultMessage="Show more"
                description="Button label for expanding closed sub-agent rows beneath a parent thread in the sidebar"
              />
            )}
          </Button>
        )
      }
    />
  );
}

function shouldAutoExpandSidebarItemList({
  items,
  currentThreadKey,
  maxParentItems,
}: {
  items: Array<SidebarThreadItem>;
  currentThreadKey: string | null;
  maxParentItems: number;
}): boolean {
  if (currentThreadKey == null) {
    return false;
  }

  let visibleParentCount = 0;
  for (const item of items) {
    if (getSidebarThreadKey(item.task) === currentThreadKey) {
      return visibleParentCount > maxParentItems;
    }
    if (item.subagentParentThreadId == null) {
      visibleParentCount += 1;
    }
  }

  return false;
}

function WorkspaceActions({
  groupProjectId,
  groupPath,
  groupLabel,
  tasks,
  projectHeaderMenuKind,
  canCreateStableWorktree,
  workspaceRootOptions,
  workspaceRootLabels,
  currentThreadKey,
  onStartNewThread,
  onShowProjectHome,
  newThreadLabel,
  canStartNewThread,
  newThreadDisabledLabel,
  workspaceDropdownOpen,
  onWorkspaceDropdownOpenChange,
}: {
  groupProjectId: string;
  groupPath: string;
  groupLabel: string;
  tasks: Array<MergedTask>;
  projectHeaderMenuKind: ProjectHeaderMenuKind;
  canCreateStableWorktree: boolean;
  workspaceRootOptions: Array<string> | undefined;
  workspaceRootLabels: Record<string, string> | undefined;
  currentThreadKey: string | null;
  onStartNewThread: () => void;
  onShowProjectHome: () => void;
  newThreadLabel: string;
  canStartNewThread: boolean;
  newThreadDisabledLabel: string;
  workspaceDropdownOpen: boolean;
  onWorkspaceDropdownOpenChange: (open: boolean) => void;
}): ReactElement {
  return (
    <div
      className={clsx(
        "flex mr-px gap-0 opacity-0 group-hover/folder-row:flex group-hover/folder-row:opacity-100 group-focus-within/folder-row:opacity-100",
        workspaceDropdownOpen && "opacity-100",
      )}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.stopPropagation();
        }
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      {projectHeaderMenuKind === "local" && (
        <HeaderFolderDropdown
          groupPath={groupPath}
          groupLabel={groupLabel}
          tasks={tasks}
          currentThreadKey={currentThreadKey}
          canCreateStableWorktree={canCreateStableWorktree}
          workspaceRootOptions={workspaceRootOptions}
          workspaceRootLabels={workspaceRootLabels}
          onArchivedCurrentThread={onShowProjectHome}
          open={workspaceDropdownOpen}
          onOpenChange={onWorkspaceDropdownOpenChange}
        />
      )}
      {projectHeaderMenuKind === "remote" && (
        <RemoteProjectHeaderDropdown
          projectId={groupProjectId}
          remotePath={groupPath}
          groupLabel={groupLabel}
          tasks={tasks}
          currentThreadKey={currentThreadKey}
          onArchivedCurrentThread={onShowProjectHome}
          open={workspaceDropdownOpen}
          onOpenChange={onWorkspaceDropdownOpenChange}
        />
      )}
      <div className="pr-0.5">
        <Tooltip
          tooltipContent={
            canStartNewThread ? newThreadLabel : newThreadDisabledLabel
          }
          delayOpen={true}
        >
          <span className="inline-flex">
            <Button
              color="ghostMuted"
              size="icon"
              aria-label={newThreadLabel}
              disabled={!canStartNewThread}
              onClick={(event) => {
                event.stopPropagation();
                onStartNewThread();
              }}
            >
              <ComposeIcon className="icon-xs" />
            </Button>
          </span>
        </Tooltip>
      </div>
    </div>
  );
}

export function WorkspaceFilterDropdown({
  open,
  onOpenChange,
  organizeMode,
  onOrganizeModeChange,
  hasConnectedRemoteHosts,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  organizeMode: SidebarOrganizeMode;
  onOrganizeModeChange: (nextValue: SidebarOrganizeMode) => void;
  hasConnectedRemoteHosts: boolean;
}): ReactElement {
  const intl = useIntl();
  const [isMenuOpen, setIsMenuOpen] = useState(open);
  const isControlled = open !== undefined;
  const menuOpen = isControlled ? open : isMenuOpen;
  const handleOpenChange = (nextOpen: boolean): void => {
    if (!isControlled) {
      setIsMenuOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };
  const [workspaceTaskFilter, setWorkspaceTaskFilter] =
    useAtom(aWorkspaceTaskFilter);
  const [threadSortKey, setThreadSortKey] = useAtom(aThreadSortKey);
  const handleFilterChange = (nextFilter: WorkspaceTaskFilter): void => {
    if (workspaceTaskFilter === nextFilter) {
      return;
    }
    setWorkspaceTaskFilter(nextFilter);
  };
  const handleOrganizeModeChange = (nextValue: SidebarOrganizeMode): void => {
    if (organizeMode === nextValue) {
      return;
    }
    onOrganizeModeChange(nextValue);
  };
  return (
    <BasicDropdown
      open={menuOpen}
      onOpenChange={handleOpenChange}
      side="bottom"
      align="end"
      contentWidth="sidebar"
      triggerButton={
        <Tooltip
          tooltipContent={intl.formatMessage({
            id: "sidebarElectron.showMenu.tooltip",
            defaultMessage: "Filter, sort, and organize threads",
            description:
              "Tooltip for the sidebar thread filter dropdown trigger",
          })}
          delayOpen={true}
        >
          <span className="inline-flex">
            <Button
              className="h-6 w-6 rounded-md !p-1 text-token-foreground opacity-75 hover:opacity-100"
              color="ghostActive"
              size="icon"
              aria-label={intl.formatMessage({
                id: "sidebarElectron.showMenu.trigger",
                defaultMessage: "Filter sidebar threads",
                description:
                  "Button label for opening the sidebar thread filters dropdown",
              })}
              aria-haspopup="menu"
            >
              <FilterAltIcon className="icon-xs" />
            </Button>
          </span>
        </Tooltip>
      }
    >
      <Dropdown.Title>
        <FormattedMessage
          id="sidebarElectron.groupByMenu.title"
          defaultMessage="Organize"
          description="Header for sidebar thread grouping dropdown"
        />
      </Dropdown.Title>
      <Dropdown.Item
        LeftIcon={FolderIcon}
        RightIcon={organizeMode === "project" ? CheckMdIcon : undefined}
        onSelect={() => {
          handleOrganizeModeChange("project");
        }}
      >
        <FormattedMessage
          id="sidebarElectron.groupByMenu.workspace"
          defaultMessage="By project"
          description="Option to group sidebar threads by workspace"
        />
      </Dropdown.Item>
      {hasConnectedRemoteHosts ? (
        <Dropdown.Item
          LeftIcon={GlobeIcon}
          RightIcon={organizeMode === "connection" ? CheckMdIcon : undefined}
          onSelect={() => {
            handleOrganizeModeChange("connection");
          }}
        >
          <FormattedMessage
            id="sidebarElectron.groupByMenu.connection"
            defaultMessage="By connection"
            description="Option to group sidebar projects by connected remote host"
          />
        </Dropdown.Item>
      ) : null}
      <Dropdown.Item
        LeftIcon={ClockIcon}
        RightIcon={organizeMode === "recent" ? CheckMdIcon : undefined}
        onSelect={() => {
          handleOrganizeModeChange("recent");
        }}
      >
        <FormattedMessage
          id="sidebarElectron.groupByMenu.recency"
          defaultMessage="Chronological list"
          description="Option to sort sidebar threads by recency instead of grouping by project"
        />
      </Dropdown.Item>
      <Dropdown.Separator paddingClassName="pt-1 pb-2" />
      <Dropdown.Title>
        <FormattedMessage
          id="sidebarElectron.sortMenu.title"
          defaultMessage="Sort by"
          description="Header for sidebar thread sort dropdown"
        />
      </Dropdown.Title>
      <Dropdown.Item
        LeftIcon={ChatReplyPlusIcon}
        RightIcon={threadSortKey === "created_at" ? CheckMdIcon : undefined}
        onSelect={() => {
          setThreadSortKey("created_at");
        }}
      >
        <FormattedMessage
          id="sidebarElectron.sortMenu.created"
          defaultMessage="Created"
          description="Sort option to show threads by creation date"
        />
      </Dropdown.Item>
      <Dropdown.Item
        LeftIcon={AutoCompleteIcon}
        RightIcon={threadSortKey === "updated_at" ? CheckMdIcon : undefined}
        onSelect={() => {
          setThreadSortKey("updated_at");
        }}
      >
        <FormattedMessage
          id="sidebarElectron.sortMenu.updated"
          defaultMessage="Updated"
          description="Sort option to show threads by last updated time"
        />
      </Dropdown.Item>
      <Dropdown.Separator paddingClassName="pt-1 pb-3" />
      <Dropdown.Title>
        <FormattedMessage
          id="sidebarElectron.showMenu.title"
          defaultMessage="Show"
          description="Header for sidebar thread visibility dropdown"
        />
      </Dropdown.Title>
      <Dropdown.Item
        LeftIcon={ChatsIcon}
        RightIcon={workspaceTaskFilter === "all" ? CheckMdIcon : undefined}
        onSelect={() => {
          handleFilterChange("all");
        }}
      >
        <FormattedMessage
          id="sidebarElectron.showMenu.all"
          defaultMessage="All threads"
          description="Menu item to show threads from all branches"
        />
      </Dropdown.Item>
      <Dropdown.Item
        LeftIcon={StarIcon}
        RightIcon={workspaceTaskFilter === "relevant" ? CheckMdIcon : undefined}
        onSelect={() => {
          handleFilterChange("relevant");
        }}
        tooltipText={intl.formatMessage({
          id: "sidebarElectron.showMenu.relevantHint",
          defaultMessage:
            "Only show recent threads for the current branch, worktrees, or other threads that need your attention",
          description:
            "Tooltip text for the relevant-only sidebar filter option",
        })}
      >
        <FormattedMessage
          id="sidebarElectron.showMenu.relevant"
          defaultMessage="Relevant"
          description="Menu item to prioritize relevant threads in the sidebar"
        />
      </Dropdown.Item>
    </BasicDropdown>
  );
}

function suggestNumberedWorkspaceLabel({
  base,
  workspaceRootOptions,
  workspaceRootLabels,
}: {
  base: string;
  workspaceRootOptions: Array<string> | undefined;
  workspaceRootLabels: Record<string, string> | undefined;
}): string {
  const trimmedBase = base.trim();
  if (!trimmedBase) {
    return "Workspace_2";
  }

  const usedLabels = new Set<string>();
  for (const root of workspaceRootOptions ?? []) {
    const explicitLabel = workspaceRootLabels?.[root]?.trim();
    if (explicitLabel) {
      usedLabels.add(explicitLabel);
      continue;
    }
    const fallbackName = root
      .split(/[/\\]+/)
      .filter(Boolean)
      .at(-1)
      ?.trim();
    if (fallbackName) {
      usedLabels.add(fallbackName);
    }
  }

  for (let index = 2; index <= 9999; index += 1) {
    const candidate = `${trimmedBase}_${index}`;
    if (!usedLabels.has(candidate)) {
      return candidate;
    }
  }

  return `${trimmedBase}_2`;
}

function getProjectHeaderMenuKind({
  group,
  localWorkspaceRoots,
}: {
  group: RepositoryTaskGroups;
  localWorkspaceRoots: Array<string> | undefined;
}): ProjectHeaderMenuKind {
  if (group.projectKind === "remote") {
    return "remote";
  }

  // Only saved local workspace roots get the local project menu. Other local
  // groups can still render in the sidebar, but they do not have workspace-root
  // actions behind them.
  if (localWorkspaceRoots?.includes(group.path)) {
    return "local";
  }

  return null;
}

/**
 * Temporary remote-only rename flow while local project headers are still backed
 * by workspace-root state. Once local projects move to typed project records,
 * local and remote header menus should collapse into one project-oriented path.
 */
function RemoteProjectRename({
  project,
  onSave,
  onCancel,
}: {
  project: RemoteProject;
  onSave: () => void;
  onCancel: () => void;
}): ReactElement {
  const { remoteProjects, setRemoteProjects } = useSelectedRemoteProject();
  const fallbackLabel = getRemoteProjectLabel(project.remotePath);
  const [value, setValue] = useState(project.label);

  const handleSave = (): void => {
    const trimmedLabel = value.trim();
    const nextLabel = trimmedLabel || fallbackLabel;

    void setRemoteProjects(
      remoteProjects.map((remoteProject) => {
        if (remoteProject.id !== project.id) {
          return remoteProject;
        }

        return {
          ...remoteProject,
          label: nextLabel,
        };
      }),
    );
    onSave();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSave();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-1 pt-1 pb-1">
      <Dropdown.Title className="text-token-muted-foreground text-xs">
        <FormattedMessage
          id="sidebarElectron.renameRemoteProjectLabel"
          defaultMessage="Display name"
          description="Header shown when setting a display name for a remote project"
        />
      </Dropdown.Title>
      <Dropdown.Section className="px-[var(--padding-row-x)]">
        <Dropdown.Input
          value={value}
          placeholder={fallbackLabel}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </Dropdown.Section>
    </div>
  );
}

function HeaderFolderDropdown({
  groupPath,
  groupLabel,
  tasks,
  currentThreadKey,
  canCreateStableWorktree,
  workspaceRootOptions = [],
  workspaceRootLabels = {},
  onArchivedCurrentThread,
  open,
  onOpenChange,
}: {
  groupPath: string;
  groupLabel: string;
  tasks: Array<MergedTask>;
  currentThreadKey: string | null;
  canCreateStableWorktree: boolean;
  workspaceRootOptions: Array<string> | undefined;
  workspaceRootLabels?: Record<string, string> | undefined;
  onArchivedCurrentThread?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const { platform } = usePlatform();
  const { data: projectOrder, setData: setProjectOrder } = useGlobalState(
    GlobalStateKey.PROJECT_ORDER,
  );
  const openFile = useMutationFromVSCode("open-file");
  const { createPendingWorktree } = usePendingWorktreeActions();
  const [isRenaming, setIsRenaming] = useState(false);
  const [
    isCreateStableWorktreeDialogOpen,
    setIsCreateStableWorktreeDialogOpen,
  ] = useState(false);
  const [stableWorktreeLabel, setStableWorktreeLabel] = useState("");
  const [createStableWorktreeError, setCreateStableWorktreeError] = useState<
    string | null
  >(null);

  const effectiveLabel =
    workspaceRootLabels?.[groupPath]?.trim() || groupLabel || groupPath;
  const currentSavedLabel = workspaceRootLabels?.[groupPath]?.trim() ?? "";
  const trimmedStableWorktreeLabel = stableWorktreeLabel.trim();
  const {
    archiveableCount,
    isArchiving,
    isConfirmOpen,
    setIsConfirmOpen,
    handleArchiveConfirm,
  } = useProjectThreadArchiver({
    projectLabel: effectiveLabel,
    tasks,
    currentThreadKey,
    onArchivedCurrentThread,
    onOpenChange,
  });

  const handleOpenChange = (nextOpen: boolean): void => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setIsRenaming(false);
    }
  };

  const handleStartRename = (
    event: Event | React.MouseEvent | React.KeyboardEvent,
  ): void => {
    event.preventDefault();
    onOpenChange(true);
    setIsRenaming(true);
  };

  const openCreateStableWorktreeDialog = (
    event: Event | React.MouseEvent | React.KeyboardEvent,
  ): void => {
    event.preventDefault();
    setCreateStableWorktreeError(null);
    setStableWorktreeLabel(
      suggestNumberedWorkspaceLabel({
        base: effectiveLabel,
        workspaceRootOptions,
        workspaceRootLabels,
      }),
    );
    setIsCreateStableWorktreeDialogOpen(true);
  };

  const closeCreateStableWorktreeDialog = (): void => {
    setIsCreateStableWorktreeDialogOpen(false);
    setCreateStableWorktreeError(null);
    setStableWorktreeLabel("");
  };

  const handleOpenFolder = (): void => {
    const gitCwd = createGitCwd(groupPath);
    openFile.mutate({
      path: groupPath,
      cwd: gitCwd,
      target: "fileManager",
    });
    onOpenChange(false);
  };

  const handleCreateStableWorktree = (): void => {
    if (!trimmedStableWorktreeLabel) {
      return;
    }
    setCreateStableWorktreeError(null);
    try {
      const pendingWorktreeId = createPendingWorktree(
        buildCreateStableWorktreeRequest({
          hostId: DEFAULT_HOST_ID,
          groupPath,
          label: trimmedStableWorktreeLabel,
          prompt: intl.formatMessage({
            id: "sidebarElectron.createStableWorktree.dialog.subtitle",
            defaultMessage:
              "Create a new git worktree from HEAD, add it as a project, and keep it until you remove it.",
            description: "Dialog subtitle for creating a stable worktree",
          }),
        }),
      );
      void navigate(`/worktree-init-v2/${pendingWorktreeId}`);
      setIsCreateStableWorktreeDialogOpen(false);
      setStableWorktreeLabel("");
      onOpenChange(false);
    } catch (error) {
      setCreateStableWorktreeError(
        intl.formatMessage(
          {
            id: "sidebarElectron.createStableWorktree.error",
            defaultMessage: "Failed to create permanent worktree: {message}",
            description:
              "Error message shown when creating a stable worktree fails",
          },
          { message: maybeErrorToString(error) },
        ),
      );
    }
  };

  return (
    <>
      <BasicDropdown
        open={open}
        onOpenChange={handleOpenChange}
        side="bottom"
        align="end"
        contentWidth="xs"
        triggerButton={
          <div className="pr-0.5">
            <Button
              color="ghostMuted"
              size="icon"
              aria-label={intl.formatMessage(
                {
                  id: "sidebarElectron.workspaceOptions",
                  defaultMessage: "Project actions for {folder}",
                  description:
                    "Button label for the workspace root actions dropdown",
                },
                { folder: effectiveLabel },
              )}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <ThreeDots className="icon-xs" />
            </Button>
          </div>
        }
      >
        {isRenaming ? (
          <WorkspaceRootRename
            root={groupPath}
            savedLabel={currentSavedLabel}
            fallbackLabel={effectiveLabel}
            onSave={() => {
              setIsRenaming(false);
              onOpenChange(false);
            }}
            onCancel={() => {
              setIsRenaming(false);
              onOpenChange(false);
            }}
          />
        ) : (
          <>
            <Dropdown.Item
              LeftIcon={FolderOpenIcon}
              onSelect={handleOpenFolder}
            >
              <OpenWorkspaceRootMenuLabel platform={platform} />
            </Dropdown.Item>
            {canCreateStableWorktree ? (
              <Dropdown.Item
                LeftIcon={WorktreeIcon}
                onSelect={openCreateStableWorktreeDialog}
              >
                <FormattedMessage
                  id="sidebarElectron.createStableWorktree"
                  defaultMessage="Create permanent worktree"
                  description="Menu item to create a non-codex-managed worktree for this git workspace root"
                />
              </Dropdown.Item>
            ) : null}
            <Dropdown.Item LeftIcon={EditIcon} onSelect={handleStartRename}>
              <FormattedMessage
                id="sidebarElectron.editWorkspaceRootOptionName"
                defaultMessage="Edit name"
                description="Menu item to edit the name of a workspace root option for an empty folder group in the electron sidebar"
              />
            </Dropdown.Item>
            <Dropdown.Item
              LeftIcon={ArchiveIcon}
              disabled={archiveableCount === 0 || isArchiving}
              onSelect={() => {
                onOpenChange(false);
                setIsConfirmOpen(true);
              }}
            >
              <FormattedMessage
                id="sidebarElectron.archiveProjectThreads"
                defaultMessage="Archive threads"
                description="Menu item to archive all archiveable threads in a project"
              />
            </Dropdown.Item>
            <Dropdown.Item
              LeftIcon={XIcon}
              onSelect={() => {
                const roots =
                  workspaceRootOptions?.filter((r) => r !== groupPath) ?? [];
                void setProjectOrder(
                  (projectOrder ?? []).filter(
                    (projectId) => projectId !== groupPath,
                  ),
                );
                messageBus.dispatchMessage(
                  "electron-update-workspace-root-options",
                  {
                    roots,
                  },
                );
              }}
            >
              <FormattedMessage
                id="sidebarElectron.removeWorkspaceRootOption"
                defaultMessage="Remove"
                description="Menu item to remove a workspace root option in the electron sidebar"
              />
            </Dropdown.Item>
          </>
        )}
      </BasicDropdown>
      <ProjectArchiveThreadsDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleArchiveConfirm}
        count={archiveableCount}
        projectLabel={effectiveLabel}
        isArchiving={isArchiving}
      />
      <Dialog
        open={isCreateStableWorktreeDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeCreateStableWorktreeDialog();
          } else {
            setIsCreateStableWorktreeDialogOpen(true);
          }
        }}
        size="compact"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleCreateStableWorktree();
          }}
          className="flex flex-col gap-0"
        >
          <DialogBody>
            <DialogSection>
              <DialogHeader
                title={
                  <FormattedMessage
                    id="sidebarElectron.createStableWorktree.dialog.title"
                    defaultMessage="Create worktree and save as a project"
                    description="Dialog title for creating a stable worktree from a workspace root"
                  />
                }
                subtitle={
                  <FormattedMessage
                    id="sidebarElectron.createStableWorktree.dialog.subtitle"
                    defaultMessage="Create a new git worktree from HEAD, add it as a project, and keep it until you remove it."
                    description="Dialog subtitle for creating a stable worktree"
                  />
                }
              />
            </DialogSection>
            <DialogSection className="gap-2">
              <input
                className="rounded-xl border border-token-border px-3 py-2 text-base text-token-input-foreground shadow-sm outline-none"
                value={stableWorktreeLabel}
                onChange={(event) => {
                  setStableWorktreeLabel(event.target.value);
                }}
                placeholder={intl.formatMessage({
                  id: "sidebarElectron.createStableWorktree.dialog.placeholder",
                  defaultMessage: "Project name",
                  description:
                    "Placeholder for stable worktree label input in the create dialog",
                })}
                aria-label={intl.formatMessage({
                  id: "sidebarElectron.createStableWorktree.dialog.ariaLabel",
                  defaultMessage: "Project name",
                  description:
                    "Aria label for stable worktree label input in the create dialog",
                })}
                autoFocus
              />
              {createStableWorktreeError ? (
                <p className="text-sm text-token-error-foreground">
                  {createStableWorktreeError}
                </p>
              ) : null}
            </DialogSection>
            <DialogSection>
              <DialogFooter>
                <Button
                  color="outline"
                  type="button"
                  onClick={() => {
                    closeCreateStableWorktreeDialog();
                  }}
                >
                  <FormattedMessage
                    id="sidebarElectron.createStableWorktree.dialog.cancel"
                    defaultMessage="Cancel"
                    description="Cancel button for stable worktree creation dialog"
                  />
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  disabled={trimmedStableWorktreeLabel.length === 0}
                >
                  <FormattedMessage
                    id="sidebarElectron.createStableWorktree.dialog.create"
                    defaultMessage="Create"
                    description="Create button for stable worktree creation dialog"
                  />
                </Button>
              </DialogFooter>
            </DialogSection>
          </DialogBody>
        </form>
      </Dialog>
    </>
  );
}

function RemoteProjectHeaderDropdown({
  projectId,
  remotePath,
  groupLabel,
  tasks,
  currentThreadKey,
  onArchivedCurrentThread,
  open,
  onOpenChange,
}: {
  projectId: string;
  remotePath: string;
  groupLabel: string;
  tasks: Array<MergedTask>;
  currentThreadKey: string | null;
  onArchivedCurrentThread?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): ReactElement {
  const intl = useIntl();
  const { data: projectOrder, setData: setProjectOrder } = useGlobalState(
    GlobalStateKey.PROJECT_ORDER,
  );
  const {
    remoteProjects,
    selectedRemoteProjectId,
    setSelectedRemoteProjectId,
    setRemoteProjects,
  } = useSelectedRemoteProject();
  const [isRenaming, setIsRenaming] = useState(false);
  const project =
    remoteProjects.find((remoteProject) => remoteProject.id === projectId) ??
    null;
  const effectiveLabel =
    project?.label || groupLabel || getRemoteProjectLabel(remotePath);
  const {
    archiveableCount,
    isArchiving,
    isConfirmOpen,
    setIsConfirmOpen,
    handleArchiveConfirm,
  } = useProjectThreadArchiver({
    projectLabel: effectiveLabel,
    tasks,
    currentThreadKey,
    onArchivedCurrentThread,
    onOpenChange,
  });

  const handleOpenChange = (nextOpen: boolean): void => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setIsRenaming(false);
    }
  };

  const handleStartRename = (
    event: Event | React.MouseEvent | React.KeyboardEvent,
  ): void => {
    event.preventDefault();
    onOpenChange(true);
    setIsRenaming(true);
  };

  const handleRemoveRemoteProject = async (): Promise<void> => {
    await setRemoteProjects(
      remoteProjects.filter((remoteProject) => remoteProject.id !== projectId),
    );
    await setProjectOrder(
      projectOrder?.filter((orderedProjectId) => {
        return orderedProjectId !== projectId;
      }),
    );
    if (selectedRemoteProjectId === projectId) {
      setSelectedRemoteProjectId(null);
    }
  };

  return (
    <>
      <BasicDropdown
        open={open}
        onOpenChange={handleOpenChange}
        side="bottom"
        align="end"
        contentWidth="xs"
        triggerButton={
          <div className="pr-0.5">
            <Button
              color="ghostMuted"
              size="icon"
              aria-label={intl.formatMessage(
                {
                  id: "sidebarElectron.remoteProjectOptions",
                  defaultMessage: "Project actions for {folder}",
                  description:
                    "Button label for the remote project actions dropdown",
                },
                { folder: effectiveLabel },
              )}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <ThreeDots className="icon-xs" />
            </Button>
          </div>
        }
      >
        {project == null ? null : isRenaming ? (
          <RemoteProjectRename
            project={project}
            onSave={() => {
              setIsRenaming(false);
              onOpenChange(false);
            }}
            onCancel={() => {
              setIsRenaming(false);
              onOpenChange(false);
            }}
          />
        ) : (
          <>
            <Dropdown.Item LeftIcon={EditIcon} onSelect={handleStartRename}>
              <FormattedMessage
                id="sidebarElectron.editRemoteProjectName"
                defaultMessage="Edit name"
                description="Menu item to edit the name of a remote project in the electron sidebar"
              />
            </Dropdown.Item>
            <Dropdown.Item
              LeftIcon={ArchiveIcon}
              disabled={archiveableCount === 0 || isArchiving}
              onSelect={() => {
                onOpenChange(false);
                setIsConfirmOpen(true);
              }}
            >
              <FormattedMessage
                id="sidebarElectron.archiveRemoteProjectThreads"
                defaultMessage="Archive threads"
                description="Menu item to archive all archiveable threads in a remote project"
              />
            </Dropdown.Item>
            <Dropdown.Item
              LeftIcon={XIcon}
              onSelect={() => {
                void handleRemoveRemoteProject();
              }}
            >
              <FormattedMessage
                id="sidebarElectron.removeRemoteProject"
                defaultMessage="Remove"
                description="Menu item to remove a remote project in the electron sidebar"
              />
            </Dropdown.Item>
          </>
        )}
      </BasicDropdown>
      <ProjectArchiveThreadsDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleArchiveConfirm}
        count={archiveableCount}
        projectLabel={effectiveLabel}
        isArchiving={isArchiving}
      />
    </>
  );
}

function OpenWorkspaceRootMenuLabel({
  platform,
}: {
  platform: "linux" | "macOS" | "windows";
}): ReactElement {
  return <FormattedMessage {...getOpenInFileManagerMessage(platform)} />;
}

function FolderChevron({
  isCollapsed,
  groupPath,
  toggleGroup,
}: {
  isCollapsed: boolean;
  groupPath: string;
  toggleGroup: (groupPath: string) => void;
}): ReactElement {
  const intl = useIntl();
  const chevronRotation = isCollapsed ? 0 : 90;

  return (
    <button
      type="button"
      aria-expanded={!isCollapsed}
      aria-label={
        isCollapsed
          ? intl.formatMessage({
              id: "sidebarElectron.expandFolder",
              defaultMessage: "Expand folder",
              description: "Expand folder button label",
            })
          : intl.formatMessage({
              id: "sidebarElectron.collapseFolder",
              defaultMessage: "Collapse folder",
              description: "Collapse folder button label",
            })
      }
      onClick={(event) => {
        event.stopPropagation();
        toggleGroup(groupPath);
      }}
      className="text-token-muted-foreground flex items-center justify-center p-1 hover:text-token-foreground"
    >
      <motion.div
        style={{ rotate: chevronRotation }}
        initial={false}
        animate={{ rotate: chevronRotation }}
        transition={ACCORDION_TRANSITION}
        className="flex items-center"
      >
        <PlayIcon className="icon-xxs" />
      </motion.div>
    </button>
  );
}

function useFilteredConnectionItems({
  items,
  currentConversationId,
  isBackgroundSubagentsEnabled,
}: {
  items: Array<SidebarThreadItem>;
  currentConversationId: ConversationId | null;
  isBackgroundSubagentsEnabled: boolean;
}): {
  filteredItems: Array<SidebarThreadItem>;
  hasFilteredItems: boolean;
  codexHome: string | undefined;
} {
  const [workspaceTaskFilter] = useAtom(aWorkspaceTaskFilter);
  const [remoteConnections] = useSharedObject("remote_connections");
  const hasGitRpc = useHasGitRpc();
  const shouldFetchBranches = workspaceTaskFilter === "relevant";
  const branchTargets = getConnectionBranchTargets(
    shouldFetchBranches ? items : [],
  );
  const metadataQueryOptions = branchTargets.map(({ cwd, hostId }) => {
    const hostConfig = getConnectionBranchHostConfig(hostId, remoteConnections);
    return gitStableMetadataQueryOptions(
      cwd,
      hasGitRpc && hostConfig != null,
      hostConfig == null ? hostId : getHostKey(hostConfig),
      hostConfig ?? getHostConfigForHostId(DEFAULT_HOST_ID, remoteConnections),
    );
  });
  const metadataQueries = useQueries({ queries: metadataQueryOptions });
  const branchQueryOptions = metadataQueries.map((metadataQuery, index) => {
    const target = branchTargets[index];
    const hostConfig = getConnectionBranchHostConfig(
      target.hostId,
      remoteConnections,
    );
    return gitQueryOptions<"current-branch", string | null>(
      "current-branch",
      metadataQuery.data ?? null,
      metadataQuery.data != null ? { root: metadataQuery.data.root } : null,
      hasGitRpc && hostConfig != null,
      hostConfig == null ? target.hostId : getHostKey(hostConfig),
      hostConfig ?? getHostConfigForHostId(DEFAULT_HOST_ID, remoteConnections),
      {
        select: (data): string | null => data.branch,
      },
    );
  });
  const branchQueries = useQueries({ queries: branchQueryOptions });
  const currentBranchByTarget = new Map<string, string | null>();
  for (let index = 0; index < branchTargets.length; index += 1) {
    const target = branchTargets[index];
    currentBranchByTarget.set(
      getConnectionBranchTargetKey(target.hostId, target.cwd),
      branchQueries[index]?.data ?? null,
    );
  }
  const { data: codexHome } = useFetchFromVSCode("codex-home", {
    select: (data): string | undefined => data?.codexHome,
  });

  if (workspaceTaskFilter === "all") {
    return {
      filteredItems: items,
      hasFilteredItems: false,
      codexHome,
    };
  }

  const visibleTaskKeys = getVisibleSubagentAwareTaskKeys({
    tasks: items.map((item) => item.task),
    currentConversationId,
    isBaseVisible: (task) =>
      isTaskRelevant(
        task,
        currentConversationId,
        getConnectionTaskBranch(task, currentBranchByTarget),
        codexHome,
      ),
    isBackgroundSubagentsEnabled,
  });
  const filteredItems = items.filter((item) =>
    visibleTaskKeys.has(item.task.key),
  );

  return {
    filteredItems,
    hasFilteredItems: filteredItems.length < items.length,
    codexHome,
  };
}

function getConnectionBranchTargets(
  items: Array<SidebarThreadItem>,
): Array<{ hostId: string; cwd: string }> {
  const targets: Array<{ hostId: string; cwd: string }> = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (item.task.kind !== "local" || item.task.conversation.cwd == null) {
      continue;
    }
    const hostId = item.task.conversation.hostId ?? DEFAULT_HOST_ID;
    const key = getConnectionBranchTargetKey(
      hostId,
      item.task.conversation.cwd,
    );
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    targets.push({
      hostId,
      cwd: item.task.conversation.cwd,
    });
  }

  return targets;
}

function getConnectionBranchTargetKey(hostId: string, cwd: string): string {
  return `${hostId}\t${cwd}`;
}

function getConnectionTaskBranch(
  task: MergedTask,
  currentBranchByTarget: Map<string, string | null>,
): string | null {
  if (task.kind !== "local" || task.conversation.cwd == null) {
    return null;
  }
  return (
    currentBranchByTarget.get(
      getConnectionBranchTargetKey(
        task.conversation.hostId ?? DEFAULT_HOST_ID,
        task.conversation.cwd,
      ),
    ) ?? null
  );
}

function getConnectionBranchHostConfig(
  hostId: string,
  remoteConnections: Array<RemoteConnection> | null | undefined,
): HostConfig | null {
  if (
    hostId !== DEFAULT_HOST_ID &&
    !remoteConnections?.some((connection) => connection.hostId === hostId)
  ) {
    return null;
  }
  return getHostConfigForHostId(hostId, remoteConnections);
}

function useFilteredTasks({
  tasks,
  groupPath,
  currentConversationId,
  isBackgroundSubagentsEnabled,
}: {
  tasks: Array<MergedTask>;
  groupPath: string;
  currentConversationId: ConversationId | null;
  isBackgroundSubagentsEnabled: boolean;
}): {
  filteredTasks: Array<MergedTask>;
  hasFilteredTasks: boolean;
  codexHome: string | undefined;
} {
  const [workspaceTaskFilter] = useAtom(aWorkspaceTaskFilter);
  const shouldFetchBranch = workspaceTaskFilter === "relevant";
  const appServerManager = useDefaultAppServerManager();
  const hostConfig = useHostConfig(appServerManager.getHostId());
  const { data: branchName } = useGitCurrentBranch(groupPath, hostConfig, {
    enabled: shouldFetchBranch,
  });
  const { data: codexHome } = useFetchFromVSCode("codex-home", {
    select: (data): string | undefined => data?.codexHome,
  });
  const isRelevant = (task: MergedTask): boolean =>
    isTaskRelevant(task, currentConversationId, branchName ?? null, codexHome);

  const filteredTasks =
    workspaceTaskFilter === "all"
      ? tasks
      : filterGroupedTasksWithSubagentOverrides({
          tasks,
          currentConversationId,
          isRelevant,
          isBackgroundSubagentsEnabled,
        });

  return {
    filteredTasks,
    hasFilteredTasks: tasks.length > filteredTasks.length,
    codexHome,
  };
}

function filterGroupedTasksWithSubagentOverrides({
  tasks,
  currentConversationId,
  isRelevant,
  isBackgroundSubagentsEnabled,
}: {
  tasks: Array<MergedTask>;
  currentConversationId: ConversationId | null;
  isRelevant: (task: MergedTask) => boolean;
  isBackgroundSubagentsEnabled: boolean;
}): Array<MergedTask> {
  const visibleTaskKeys = getVisibleSubagentAwareTaskKeys({
    tasks,
    currentConversationId,
    isBaseVisible: isRelevant,
    isBackgroundSubagentsEnabled,
  });

  return tasks.filter((task) => visibleTaskKeys.has(task.key));
}
