import { useQueries, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useScope, useSignal } from "maitai";
import {
  createConversationId,
  GlobalStateKey,
  type ConversationId,
} from "protocol";
import {
  startTransition,
  useOptimistic,
  useRef,
  useState,
  type DragEvent,
  type ReactElement,
} from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useLocation, useMatch, useNavigate } from "react-router";

import {
  useConversationsMeta,
  useDefaultAppServerManager,
} from "@/app-server/app-server-manager-hooks";
import { useRemoteConnectionStates } from "@/app-server/use-remote-connection-states";
import { useAuth } from "@/auth/use-auth";
import { useTasks } from "@/codex-api";
import { AppHeader } from "@/components/app/app-header";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { KeybindingLabel } from "@/components/keybinding-label";
import { NavItem, NavSection } from "@/components/nav/nav-list";
import { SidebarCoachmark } from "@/components/sidebar-coachmark";
import { Spinner } from "@/components/spinner";
import { Tooltip } from "@/components/tooltip";
import { aPendingProjectImportRoot } from "@/external-agent-config/project-import-prompt-atom";
import { gitQueryOptions } from "@/git-rpc/git-api";
import { getHostKey } from "@/git-rpc/host-config-utils";
import {
  gitStableMetadataQueryOptions,
  useHasGitRpc,
} from "@/git-rpc/use-git-stable-metadata";
import {
  useMergedTasks,
  type MergedTask,
} from "@/header/recent-tasks-menu/use-merge-tasks";
import { useBuildFlavor } from "@/hooks/use-build-flavor";
import { useGlobalState } from "@/hooks/use-global-state";
import { useIsAppsEnabled } from "@/hooks/use-is-apps-enabled";
import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import { useIsPluginsEnabled } from "@/hooks/use-is-plugins-enabled";
import { useIsRemoteHost } from "@/hooks/use-is-remote-host";
import { useIsThreadSearchEnabled } from "@/hooks/use-is-thread-search-enabled";
import { useStartNewConversation } from "@/hooks/use-start-new-conversation";
import AppsIcon from "@/icons/apps.svg";
import BranchIcon from "@/icons/branch.svg";
import BugIcon from "@/icons/bug.svg";
import ClockIcon from "@/icons/clock.svg";
import CollapseIcon from "@/icons/collapse.svg";
import ComposeIcon from "@/icons/compose.svg";
import ExpandIcon from "@/icons/expand.svg";
import AddFolderIcon from "@/icons/folder-plus.svg";
import GlobeIcon from "@/icons/globe.svg";
import SearchIcon from "@/icons/search.svg";
import SkillsIcon from "@/icons/skills.svg";
import { isInboxPendingReview } from "@/inbox/inbox-status";
import { useInboxItems } from "@/inbox/use-inbox-items";
import { getMenuShortcutLabel } from "@/keyboard-shortcuts/electron-menu-shortcuts";
import { messageBus, useMessage } from "@/message-bus";
import { productEventLogger$ } from "@/product-event-signal";
import {
  openCreateRemoteProjectModal,
  openLocalProjectPicker,
} from "@/project-setup/open-project-setup-dialog";
import { remoteConnectionsOnboardingHandoff$ } from "@/remote-connections/onboarding/remote-connections-onboarding-signals";
import { useEnabledRemoteConnections } from "@/remote-connections/remote-connection-visibility";
import { AppScope } from "@/scopes/app-scope";
import { setPinnedThreadOrder } from "@/set-pinned-thread";
import { useHostConfig } from "@/shared-objects/use-host-config";
import {
  groupSidebarItemsByConnection,
  sortConnectionGroupsBySidebarOrder,
} from "@/sidebar/group-sidebar-items-by-connection";
import {
  aWorkspaceTaskFilter,
  isTaskRelevant,
  type WorkspaceTaskFilter,
} from "@/sidebar/is-task-relevant";
import { PinnedThreadsSection } from "@/sidebar/pinned-threads-section";
import {
  getSidebarGroupCollapseAction,
  getNextSidebarGroupCollapseState,
} from "@/sidebar/sidebar-group-collapse";
import {
  buildSidebarThreadItems,
  filterOutPinnedSubagentChildThreadIds,
  getSidebarThreadKey,
  getVisibleSubagentAwareTaskKeys,
  type SidebarThreadItem,
} from "@/sidebar/sidebar-thread-items";
import {
  buildSidebarThreadOrder,
  getSidebarThreadKeyFromRouteIds,
  navigateToSidebarThread,
  shouldAutoExpandThreadList,
} from "@/sidebar/sidebar-thread-navigation";
import { skillsAppsNewChipConfig } from "@/sidebar/sidebar-time-bound-chip-config";
import { SidebarTimeBoundChip } from "@/sidebar/sidebar-time-bound-chips";
import { useWorkspaceTaskGroups } from "@/sidebar/use-repository-task-groups";
import { ProfileFooter } from "@/sign-in/profile-footer";
import { useGate } from "@/statsig/statsig";
import { persistedAtom } from "@/utils/persisted-atom";
import { useNavigateToLocalConversation } from "@/utils/use-navigate-to-local-conversation";
import { getQueryKey, useFetchFromVSCode } from "@/vscode-api";

import { aIsCommandMenuOpen } from "../commands/command-menu-state";
import { useWindowsMenuBarEnabled } from "../components/app/use-windows-menu-bar-enabled";
import { SidebarThreadSection } from "./sidebar-thread-section";
import {
  type SidebarOrganizeMode,
  SidebarThreadsSection,
  WorkspaceFilterDropdown,
} from "./sidebar-threads-section";
export { WorkspaceFilterDropdown } from "./sidebar-threads-section";
const MAX_RECENT_TASKS = 10;
const aHasDismissedSkillsAppsTooltip = persistedAtom<boolean>(
  "has-dismissed-skills-apps-tooltip",
  false,
);
const aCollapsedGroups = persistedAtom<Record<string, boolean>>(
  "sidebar-collapsed-groups",
  {},
);
const aSidebarOrganizeMode = persistedAtom<SidebarOrganizeMode>(
  "sidebar-organize-mode-v1",
  "project",
);
export function SidebarElectron(): ReactElement {
  const isWindowsMenuBarEnabled = useWindowsMenuBarEnabled();
  const isCommandMenuOpen = useAtomValue(aIsCommandMenuOpen);
  const startNewConversation = useStartNewConversation();
  const handleStartNewConversation = (): void => startNewConversation();
  const setPendingProjectImportRoot = useSetAtom(aPendingProjectImportRoot);
  const navigate = useNavigate();
  const location = useLocation();
  const scope = useScope(AppScope);
  const { isDragActive, dropHandlers } = useWorkspaceRootDropHandlers({
    onDropRoot: handleAddWorkspaceRoot,
  });
  const localMatch = useMatch("/local/:conversationId");
  const remoteMatch = useMatch("/remote/:conversationId");
  const pendingMatch = useMatch("/worktree-init-v2/:pendingId");
  const currentThreadKey = getSidebarThreadKeyFromRouteIds({
    localId: localMatch?.params.conversationId ?? null,
    remoteId: remoteMatch?.params.conversationId ?? null,
    pendingId: pendingMatch?.params.pendingId ?? null,
  });
  const [effectiveCurrentThreadKey, setOptimisticThreadKey] = useOptimistic(
    currentThreadKey,
    (_, optimisticThreadKey: string): string => optimisticThreadKey,
  );
  const handleActivateThread = (threadKey: string): void => {
    if (threadKey === effectiveCurrentThreadKey) {
      return;
    }

    startTransition(() => {
      setOptimisticThreadKey(threadKey);
    });
  };
  const effectiveCurrentConversationId = getLocalConversationIdFromThreadKey(
    effectiveCurrentThreadKey,
  );
  const { data: conversations } = useConversationsMeta();
  const intl = useIntl();
  const { authMethod } = useAuth();
  const appsFeatureEnabled = useIsAppsEnabled();
  const isThreadSearchEnabled = useIsThreadSearchEnabled();
  const pluginsFeatureEnabled = useIsPluginsEnabled();
  const apiKeyPluginsTooltipEnabled = useGate(
    __statsigName("codex-plugin-tooltip-for-api-key"),
  );
  const isUsingApiKeyAuth = authMethod === "apikey";
  const showApiKeyPluginsFallbackNavItem =
    apiKeyPluginsTooltipEnabled && isUsingApiKeyAuth;
  const shouldShowPluginsNavItem = pluginsFeatureEnabled && !isUsingApiKeyAuth;
  const [hasDismissedSkillsAppsTooltip, setHasDismissedSkillsAppsTooltip] =
    useAtom(aHasDismissedSkillsAppsTooltip);
  const shouldShowSkillsAppsTooltip =
    appsFeatureEnabled &&
    !hasDismissedSkillsAppsTooltip &&
    location.pathname === "/";
  const dismissSkillsAppsTooltip = (): void => {
    if (!shouldShowSkillsAppsTooltip) {
      return;
    }
    setHasDismissedSkillsAppsTooltip(true);
  };
  const addGenericWorkspaceMessage = intl.formatMessage({
    id: "sidebarElectron.addGenericWorkspaceRoot",
    defaultMessage: "Add new project",
    description: "Toolbar button label for adding a new workspace root option",
  });
  const openCommandMenu = (): void => {
    messageBus.dispatchHostMessage({ type: "command-menu" });
  };
  const isExternalAgentImportEnabled = useGate(
    __statsigName("codex-app-external-agent-import-enabled"),
  );
  useMessage(
    "workspace-root-option-added",
    (message): void => {
      if (!isExternalAgentImportEnabled) {
        return;
      }
      setPendingProjectImportRoot(message.root);
    },
    [isExternalAgentImportEnabled, setPendingProjectImportRoot],
  );
  const tasksQuery = useTasks({
    taskFilter: "current",
    limit: 20,
  });
  const navigateToLocalConversation = useNavigateToLocalConversation();
  const queryClient = useQueryClient();
  const [workspaceTaskFilter] = useAtom(aWorkspaceTaskFilter);
  const remoteConnectionsOnboardingHandoff = useSignal(
    remoteConnectionsOnboardingHandoff$,
  );
  const buildFlavor = useBuildFlavor();
  const isRemoteHost = useIsRemoteHost();
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const remoteConnectionsEnabled = useGate(
    __statsigName("codex-app-enable-remote-connections"),
  );
  const { remoteConnections } = useEnabledRemoteConnections();
  const connectionStatesByHostId = useRemoteConnectionStates(remoteConnections);
  const hasConnectedRemoteHosts =
    remoteConnectionsEnabled &&
    remoteConnections.some((connection) => {
      return connectionStatesByHostId[connection.hostId] === "connected";
    });
  const canAddRemoteProject = hasConnectedRemoteHosts && !isRemoteHost;
  const shouldShowAddRemoteProjectCoachmark =
    remoteConnectionsOnboardingHandoff === "show-add-remote-project-nudge" &&
    location.pathname === "/" &&
    canAddRemoteProject;

  const dismissAddRemoteProjectCoachmark = (): void => {
    scope.set(remoteConnectionsOnboardingHandoff$, "hidden");
  };

  const handleOpenAddProjectDropdownLocal = (): void => {
    dismissAddRemoteProjectCoachmark();
    openLocalProjectPicker();
  };

  const handleOpenAddProjectDropdownRemote = (): void => {
    dismissAddRemoteProjectCoachmark();
    openCreateRemoteProjectModal({ setActive: true });
  };

  const mergedTasks = useMergedTasks(
    tasksQuery.data,
    conversations ?? [],
    null,
  );
  const { data: pinnedThreadsResponse } = useFetchFromVSCode(
    "list-pinned-threads",
    { placeholderData: { threadIds: [] } },
  );
  const pinnedThreadIds = filterOutPinnedSubagentChildThreadIds({
    mergedTasks,
    pinnedThreadIds: pinnedThreadsResponse?.threadIds ?? [],
  });
  const { items: inboxItems } = useInboxItems();
  const automationThreadIds = new Set(
    inboxItems.flatMap((item) => {
      if (item.automationId == null || item.threadId == null) {
        return [];
      }
      return [item.threadId];
    }),
  );
  const automationDisplayNames = new Map(
    inboxItems.flatMap((item) => {
      if (item.automationId == null || item.threadId == null) {
        return [];
      }
      return [[item.threadId, item.automationName ?? ""]];
    }),
  );
  const { pinnedItems, unpinnedItems } = buildSidebarThreadItems({
    mergedTasks,
    pinnedThreadIds,
    currentConversationId: effectiveCurrentConversationId,
    isBackgroundSubagentsEnabled,
    automationThreadIds,
    automationDisplayNames,
  });
  const unpinnedItemByTaskKey = new Map(
    unpinnedItems.map((item) => [item.task.key, item]),
  );
  const mergedUnpinnedTasks = unpinnedItems.map((item) => item.task);
  const pendingStableWorktrees = mergedUnpinnedTasks.flatMap((task) => {
    if (
      task.kind === "pending-worktree" &&
      task.pendingWorktree.launchMode === "create-stable-worktree"
    ) {
      return [task.pendingWorktree];
    }
    return [];
  });
  const mergedTasksForGroups = mergedUnpinnedTasks.filter(
    (task) =>
      !(
        task.kind === "pending-worktree" &&
        task.pendingWorktree.launchMode === "create-stable-worktree"
      ),
  );
  const [sidebarOrganizeMode, setSidebarOrganizeMode] =
    useAtom(aSidebarOrganizeMode);
  const { data: connectionGroupOrder } = useGlobalState(
    GlobalStateKey.CONNECTION_GROUP_ORDER,
  );
  const effectiveSidebarOrganizeMode =
    sidebarOrganizeMode === "connection" && !hasConnectedRemoteHosts
      ? "project"
      : sidebarOrganizeMode;
  const showRecent = effectiveSidebarOrganizeMode === "recent";
  const {
    groups,
    isWorkspaceRootOptionsLoading,
    workspaceRootOptions,
    workspaceRootLabels,
  } = useWorkspaceTaskGroups(mergedTasksForGroups, { enabled: !showRecent });
  const connectionItems = unpinnedItems.filter((item) => {
    return !(
      item.task.kind === "pending-worktree" &&
      item.task.pendingWorktree.launchMode === "create-stable-worktree"
    );
  });
  const connectionGroups =
    effectiveSidebarOrganizeMode === "connection"
      ? sortConnectionGroupsBySidebarOrder(
          groupSidebarItemsByConnection({
            items: connectionItems,
            remoteConnections,
          }),
          connectionGroupOrder,
        )
      : [];
  const displayedGroupCount =
    effectiveSidebarOrganizeMode === "connection"
      ? connectionGroups.length
      : groups.length;
  const [collapsedGroups, setCollapsedGroups] = useAtom(aCollapsedGroups);
  const [previouslyExpandedGroupIds, setPreviouslyExpandedGroupIds] = useState<
    Array<string>
  >([]);
  const [expandedSubagentParentId, setExpandedSubagentParentId] = useState<
    string | null
  >(null);
  const toggleSubagentChildren = (parentThreadId: string): void => {
    setExpandedSubagentParentId((previous) =>
      previous === parentThreadId ? null : parentThreadId,
    );
  };
  const unreadInboxCount = inboxItems.filter(
    (item): boolean => isInboxPendingReview(item.status) && item.readAt == null,
  ).length;

  const shouldAnimateGroups = !isWorkspaceRootOptionsLoading;
  const hasPinnedItems = pinnedItems.length > 0;
  const showEmptyThreads =
    !showRecent &&
    displayedGroupCount === 0 &&
    pendingStableWorktrees.length === 0 &&
    !hasPinnedItems;
  const inboxRouteEnabled = useGate(__statsigName("codex-app-inbox"));
  const pullRequestsRouteEnabled = useGate(
    __statsigName("codex-app-github-pr-board"),
  );
  const hasGitRpc = useHasGitRpc();
  const recentItems = useRecentTasksForFilter({
    items: unpinnedItems,
    itemsForVisibilityLookup: [...pinnedItems, ...unpinnedItems],
    showRecent,
    hasGitRpc,
    workspaceTaskFilter,
    currentConversationId: effectiveCurrentConversationId,
    isBackgroundSubagentsEnabled,
  });
  const recentRenderableItems = recentItems.filter(
    (item) => item.task.kind !== "pending-worktree",
  );
  let currentGroupId: string | null = null;
  if (effectiveCurrentThreadKey != null) {
    if (effectiveSidebarOrganizeMode === "connection") {
      for (const group of connectionGroups) {
        if (
          group.items.some(
            (item) =>
              getSidebarThreadKey(item.task) === effectiveCurrentThreadKey,
          )
        ) {
          currentGroupId = group.key;
          break;
        }
      }
    } else {
      for (const group of groups) {
        if (
          group.tasks.some(
            (task) => getSidebarThreadKey(task) === effectiveCurrentThreadKey,
          )
        ) {
          currentGroupId = group.projectId;
          break;
        }
      }
    }
  }
  const forceExpandRecent =
    showRecent &&
    shouldAutoExpandThreadList({
      items: recentRenderableItems,
      currentThreadKey: effectiveCurrentThreadKey,
      maxItems: MAX_RECENT_TASKS,
      getTask: (item) => item.task,
    });
  const visibleGroupIds =
    effectiveSidebarOrganizeMode === "connection"
      ? connectionGroups.map((group) => group.key)
      : groups.map((group) => group.projectId);
  const collapseGroupsAction = getSidebarGroupCollapseAction({
    organizeMode: effectiveSidebarOrganizeMode,
    visibleGroupIds,
    collapsedGroups,
    previouslyExpandedGroupIds,
  });
  const collapseGroupsLabel =
    collapseGroupsAction === "collapse-all"
      ? intl.formatMessage({
          id: "sidebarElectron.collapseAllGroups",
          defaultMessage: "Collapse all",
          description:
            "Button label for collapsing all thread groups in the sidebar",
        })
      : collapseGroupsAction === "reopen-previous"
        ? intl.formatMessage({
            id: "sidebarElectron.reopenPreviousGroups",
            defaultMessage: "Reopen previous",
            description:
              "Button label for restoring the previously expanded thread groups in the sidebar",
          })
        : "";
  const toggleCollapsedGroups = (): void => {
    if (collapseGroupsAction == null) {
      return;
    }

    const next = getNextSidebarGroupCollapseState({
      action: collapseGroupsAction,
      collapsedGroups,
      visibleGroupIds,
      previouslyExpandedGroupIds,
    });

    setCollapsedGroups(next.collapsedGroups);
    setPreviouslyExpandedGroupIds(next.previouslyExpandedGroupIds);
  };
  const setManuallyCollapsedGroups = (next: Record<string, boolean>): void => {
    setPreviouslyExpandedGroupIds([]);
    setCollapsedGroups(next);
  };
  const orderedItems = showRecent
    ? buildSidebarThreadOrder({
        pinnedItems,
        showRecent,
        recentItems: recentRenderableItems,
        groups,
        isBackgroundSubagentsEnabled,
      })
    : [
        ...pinnedItems,
        ...(effectiveSidebarOrganizeMode === "connection"
          ? connectionGroups.flatMap((group) => group.items)
          : buildSidebarThreadOrder({
              pinnedItems: [],
              showRecent: false,
              recentItems: [],
              groups,
              isBackgroundSubagentsEnabled,
            })),
      ];
  const shortcutSidebarItems = orderedItems.slice(0, 9);
  const indexByKey = new Map<string, number>();
  for (let index = 0; index < orderedItems.length; index += 1) {
    const key = getSidebarThreadKey(orderedItems[index].task);
    if (key != null) {
      indexByKey.set(key, index);
    }
  }

  useMessage(
    "pinned-threads-updated",
    (): void => {
      void queryClient.invalidateQueries({
        queryKey: getQueryKey("list-pinned-threads"),
      });
    },
    [queryClient],
  );
  const navigateSidebarThread = (direction: "previous" | "next"): void => {
    if (orderedItems.length === 0) {
      return;
    }

    const currentIndex =
      effectiveCurrentThreadKey == null
        ? -1
        : (indexByKey.get(effectiveCurrentThreadKey) ?? -1);
    const targetIndex =
      direction === "next" ? currentIndex + 1 : currentIndex - 1;
    const boundedIndex =
      currentIndex === -1
        ? direction === "next"
          ? 0
          : orderedItems.length - 1
        : targetIndex;
    const nextItem = orderedItems[boundedIndex];
    if (!nextItem) {
      return;
    }
    navigateToSidebarThread(nextItem, navigateToLocalConversation, navigate);
  };

  useMessage(
    "previous-thread",
    (): void => {
      navigateSidebarThread("previous");
    },
    [],
  );
  useMessage(
    "next-thread",
    (): void => {
      navigateSidebarThread("next");
    },
    [],
  );
  useMessage(
    "go-to-thread-index",
    ({ index }): void => {
      if (isCommandMenuOpen) {
        return;
      }
      const item = shortcutSidebarItems[index];
      if (!item) {
        return;
      }
      navigateToSidebarThread(item, navigateToLocalConversation, navigate);
    },
    [
      isCommandMenuOpen,
      navigate,
      navigateToLocalConversation,
      shortcutSidebarItems,
    ],
  );

  if (isWorkspaceRootOptionsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="icon-sm" />
      </div>
    );
  }

  const handlePinnedOrderChange = (
    nextPinnedThreadIds: Array<string>,
  ): void => {
    const nextVisiblePinnedThreadIds = filterOutPinnedSubagentChildThreadIds({
      mergedTasks,
      pinnedThreadIds: nextPinnedThreadIds,
    });
    const isSameLength =
      pinnedThreadIds.length === nextVisiblePinnedThreadIds.length;
    const isSameOrder = pinnedThreadIds.every(
      (threadId, index) => threadId === nextVisiblePinnedThreadIds[index],
    );
    if (isSameLength && isSameOrder) {
      return;
    }
    queryClient.setQueryData(getQueryKey("list-pinned-threads"), {
      threadIds: nextVisiblePinnedThreadIds,
    });
    void setPinnedThreadOrder(nextVisiblePinnedThreadIds);
  };

  return (
    <>
      <AppHeader hideDivider />
      <div
        className={clsx(
          "select-none box-border flex h-full flex-col gap-2 pb-2",
          isWindowsMenuBarEnabled && "pt-2",
          isDragActive && "ring-1 ring-token-border bg-token-bg-secondary/40",
        )}
        {...dropHandlers}
      >
        {showEmptyThreads ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              {canAddRemoteProject ? (
                <AddProjectDropdown
                  remoteProjectsEnabled={canAddRemoteProject}
                  showRemoteProjectCoachmark={
                    shouldShowAddRemoteProjectCoachmark
                  }
                  onDismissRemoteProjectCoachmark={
                    dismissAddRemoteProjectCoachmark
                  }
                  triggerButton={
                    <Button
                      className={clsx(
                        "relative isolate overflow-visible",
                        shouldShowAddRemoteProjectCoachmark &&
                          "animate-pulse bg-token-charts-blue/18 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.65),0_0_26px_rgba(59,130,246,0.38)] hover:bg-token-charts-blue/22 before:pointer-events-none before:absolute before:inset-[-6px] before:rounded-full before:border before:border-token-charts-blue/55 before:opacity-0 before:content-[''] before:animate-ping after:pointer-events-none after:absolute after:inset-[-12px] after:rounded-full after:border after:border-token-charts-blue/30 after:opacity-0 after:content-[''] after:animate-ping after:[animation-delay:700ms]",
                      )}
                      color="ghost"
                      size="default"
                    >
                      <AddFolderIcon className="icon-xs" />
                      {addGenericWorkspaceMessage}
                    </Button>
                  }
                  onSelectLocal={() => {
                    scope.get(productEventLogger$).log({
                      eventName: "codex_app_nav_clicked",
                      metadata: { item: "add_workspace" },
                    });
                    handleOpenAddProjectDropdownLocal();
                  }}
                  onSelectRemote={() => {
                    scope.get(productEventLogger$).log({
                      eventName: "codex_app_nav_clicked",
                      metadata: { item: "add_workspace" },
                    });
                    handleOpenAddProjectDropdownRemote();
                  }}
                />
              ) : (
                <Button
                  color="ghost"
                  size="default"
                  onClick={() => {
                    scope.get(productEventLogger$).log({
                      eventName: "codex_app_nav_clicked",
                      metadata: { item: "add_workspace" },
                    });
                    handleOpenAddProjectDropdownLocal();
                  }}
                >
                  <AddFolderIcon className="icon-xs" />
                  {addGenericWorkspaceMessage}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <nav
            className="vertical-scroll-fade-mask vertical-scroll-fade-mask flex flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto"
            role="navigation"
            aria-label={intl.formatMessage({
              id: "sidebarElectron.taskNavigation",
              defaultMessage: "Automation folders",
              description: "Navigation landmark label for grouped automations",
            })}
          >
            <div className="px-row-x">
              {__CODEX_APP_TITLE__ != null ? (
                <div className="mb-2 truncate px-2 text-sm font-medium text-token-description-foreground">
                  {__CODEX_APP_TITLE__}
                </div>
              ) : null}
              <NavSection>
                <NavItem
                  icon={ComposeIcon}
                  onClick={() => {
                    scope.get(productEventLogger$).log({
                      eventName: "codex_app_nav_clicked",
                      metadata: { item: "new_thread" },
                    });
                    handleStartNewConversation();
                  }}
                  label={
                    <FormattedMessage
                      id="sidebarElectron.newThread"
                      defaultMessage="New thread"
                      description="Starts a new thread from the sidebar"
                    />
                  }
                />
                {isThreadSearchEnabled ? (
                  <SidebarSearchNavItem onOpen={openCommandMenu} />
                ) : null}
                <SidebarCoachmark
                  align="center"
                  badge={
                    <FormattedMessage
                      id="sidebarElectron.skillsAppsTooltip.newBadge"
                      defaultMessage="NEW"
                      description="Badge shown in the Apps discovery tooltip anchored to the sidebar Skills & Apps nav item"
                    />
                  }
                  description={
                    pluginsFeatureEnabled ? (
                      <FormattedMessage
                        id="sidebarElectron.skillsAppsTooltip.pluginsBody"
                        defaultMessage="Use Plugins to connect Codex to Slack, GitHub, Notion, and more."
                        description="Body copy shown in the Apps discovery tooltip anchored to the sidebar Skills & Apps nav item when plugins are enabled"
                      />
                    ) : (
                      <FormattedMessage
                        id="sidebarElectron.skillsAppsTooltip.body"
                        defaultMessage="Use Apps to connect Codex to Slack, GitHub, Notion, and more."
                        description="Body copy shown in the Apps discovery tooltip anchored to the sidebar Skills & Apps nav item when only Apps are enabled"
                      />
                    )
                  }
                  disabled={!shouldShowSkillsAppsTooltip}
                  dismissLabel={intl.formatMessage({
                    id: "sidebarElectron.skillsAppsTooltip.dismiss",
                    defaultMessage: "Dismiss",
                    description:
                      "Accessible label for dismissing the Apps discovery tooltip anchored to the sidebar Skills & Apps nav item",
                  })}
                  onDismiss={dismissSkillsAppsTooltip}
                  open={shouldShowSkillsAppsTooltip}
                  side="right"
                  sideOffset={20}
                  title={
                    <FormattedMessage
                      id="sidebarElectron.skillsAppsTooltip.title"
                      defaultMessage="Try Plugins and Skills"
                      description="Title shown in the Apps discovery tooltip anchored to the sidebar Skills & Apps nav item"
                    />
                  }
                >
                  <NavItem
                    icon={
                      showApiKeyPluginsFallbackNavItem ? SkillsIcon : AppsIcon
                    }
                    onClick={() => {
                      scope.get(productEventLogger$).log({
                        eventName: "codex_app_nav_clicked",
                        metadata: { item: "skills" },
                      });
                      dismissSkillsAppsTooltip();
                      void navigate("/skills");
                      return;
                    }}
                    isActive={location.pathname.startsWith("/skills")}
                    label={
                      shouldShowPluginsNavItem ? (
                        <span className="inline-flex items-center gap-1">
                          <FormattedMessage
                            id="sidebarElectron.skillsAppsRouteNavLink"
                            defaultMessage="Plugins"
                            description="Nav link that opens the skills and apps page"
                          />
                          <SidebarTimeBoundChip
                            chipConfig={skillsAppsNewChipConfig}
                          />
                        </span>
                      ) : (
                        <FormattedMessage
                          id="sidebarElectron.skillsRouteNavLink"
                          defaultMessage="Skills"
                          description="Nav link that opens the skills page"
                        />
                      )
                    }
                  />
                </SidebarCoachmark>
                {showApiKeyPluginsFallbackNavItem ? (
                  <Tooltip
                    tooltipContent={
                      <FormattedMessage
                        id="sidebarElectron.pluginsDisabledTooltip"
                        defaultMessage="Please sign in with ChatGPT to use plugins"
                        description="Tooltip shown when API-key users hover the disabled Plugins nav item in the sidebar"
                      />
                    }
                    side="right"
                    sideOffset={20}
                  >
                    <div>
                      <NavItem
                        icon={AppsIcon}
                        onClick={() => {}}
                        disabled
                        label={
                          <FormattedMessage
                            id="sidebarElectron.pluginsRouteNavLink"
                            defaultMessage="Plugins"
                            description="Disabled nav link shown to API-key users under Skills in the sidebar"
                          />
                        }
                      />
                    </div>
                  </Tooltip>
                ) : null}
                {pullRequestsRouteEnabled ? (
                  <NavItem
                    icon={BranchIcon}
                    onClick={() => {
                      scope.get(productEventLogger$).log({
                        eventName: "codex_app_nav_clicked",
                        metadata: { item: "pull_requests" },
                      });
                      void navigate("/pull-requests");
                    }}
                    isActive={location.pathname.startsWith("/pull-requests")}
                    label={
                      <FormattedMessage
                        id="sidebarElectron.pullRequestsRouteNavLink"
                        defaultMessage="Pull requests"
                        description="Nav link that opens the pull requests route"
                      />
                    }
                  />
                ) : null}
                {!isRemoteHost && inboxRouteEnabled ? (
                  <NavItem
                    icon={ClockIcon}
                    onClick={() => {
                      scope.get(productEventLogger$).log({
                        eventName: "codex_app_nav_clicked",
                        metadata: { item: "automations" },
                      });
                      void navigate("/inbox");
                      return;
                    }}
                    isActive={location.pathname.startsWith("/inbox")}
                    badge={unreadInboxCount > 0 ? unreadInboxCount : undefined}
                    label={
                      <FormattedMessage
                        id="sidebarElectron.inboxRouteNavLink"
                        defaultMessage="Automations"
                        description="Nav link that opens the inbox (automations) route"
                      />
                    }
                  />
                ) : null}
                {buildFlavor === "dev" || buildFlavor === "agent" ? (
                  <NavItem
                    icon={BugIcon}
                    onClick={() => {
                      messageBus.dispatchMessage("open-debug-window", {});
                    }}
                    label={
                      <FormattedMessage
                        id="sidebarElectron.debugNavLink"
                        defaultMessage="Debug"
                        description="Nav link that opens the debug window"
                      />
                    }
                  />
                ) : null}
              </NavSection>
            </div>

            {hasPinnedItems ? (
              <div className="px-row-x">
                <NavSection>
                  <FormattedMessage
                    id="sidebarElectron.pinnedThreads"
                    defaultMessage="Pinned threads"
                    description="List label for pinned threads in the sidebar"
                  >
                    {(chunks) => (
                      <PinnedThreadsSection
                        items={pinnedItems}
                        pinnedThreadIds={pinnedThreadIds}
                        currentThreadKey={effectiveCurrentThreadKey}
                        onActivateThread={handleActivateThread}
                        ariaLabel={chunks
                          .map((chunk) =>
                            typeof chunk === "string" ? chunk : "",
                          )
                          .join("")}
                        onPinnedOrderChange={handlePinnedOrderChange}
                        expandedSubagentParentId={expandedSubagentParentId}
                        onToggleSubagentChildren={toggleSubagentChildren}
                      />
                    )}
                  </FormattedMessage>
                </NavSection>
              </div>
            ) : null}

            <div className="group/nav-section px-row-x">
              <NavSection
                title={
                  <div className="flex items-center justify-between gap-2">
                    <FormattedMessage
                      id="sidebarElectron.recentNavLink"
                      defaultMessage="Threads"
                      description="Section label above recent threads list in the sidebar"
                    />
                    <div className="flex items-center gap-1">
                      {collapseGroupsAction != null ? (
                        <Tooltip tooltipContent={collapseGroupsLabel}>
                          <Button
                            className="h-6 w-6 rounded-md !p-1 text-token-foreground opacity-75 hover:opacity-100"
                            color="ghostActive"
                            size="icon"
                            aria-label={collapseGroupsLabel}
                            onClick={toggleCollapsedGroups}
                          >
                            {collapseGroupsAction === "collapse-all" ? (
                              <CollapseIcon className="icon-xs" />
                            ) : (
                              <ExpandIcon className="icon-xs" />
                            )}
                          </Button>
                        </Tooltip>
                      ) : null}
                      <WorkspaceFilterDropdown
                        organizeMode={effectiveSidebarOrganizeMode}
                        hasConnectedRemoteHosts={hasConnectedRemoteHosts}
                        onOrganizeModeChange={(nextValue) => {
                          scope.get(productEventLogger$).log({
                            eventName: "codex_app_nav_clicked",
                            metadata: { item: "toggle_recent" },
                          });
                          setSidebarOrganizeMode(nextValue);
                        }}
                      />
                      {canAddRemoteProject ? (
                        <AddProjectDropdown
                          remoteProjectsEnabled={canAddRemoteProject}
                          showRemoteProjectCoachmark={
                            shouldShowAddRemoteProjectCoachmark
                          }
                          onDismissRemoteProjectCoachmark={
                            dismissAddRemoteProjectCoachmark
                          }
                          triggerButton={
                            <Tooltip
                              tooltipContent={addGenericWorkspaceMessage}
                              shortcut={getMenuShortcutLabel("openFolder")}
                            >
                              <Button
                                className={clsx(
                                  "relative isolate h-6 w-6 overflow-visible rounded-md !p-1 text-token-foreground opacity-75 hover:opacity-100",
                                  shouldShowAddRemoteProjectCoachmark &&
                                    "animate-pulse bg-token-charts-blue/18 !text-white opacity-100 shadow-[0_0_0_1px_rgba(59,130,246,0.65),0_0_26px_rgba(59,130,246,0.38)] hover:bg-token-charts-blue/22 before:pointer-events-none before:absolute before:inset-[-5px] before:rounded-full before:border before:border-token-charts-blue/55 before:opacity-0 before:content-[''] before:animate-ping after:pointer-events-none after:absolute after:inset-[-11px] after:rounded-full after:border after:border-token-charts-blue/30 after:opacity-0 after:content-[''] after:animate-ping after:[animation-delay:700ms]",
                                )}
                                color="ghostActive"
                                size="icon"
                                aria-label={addGenericWorkspaceMessage}
                              >
                                <AddFolderIcon className="icon-xs" />
                              </Button>
                            </Tooltip>
                          }
                          onSelectLocal={() => {
                            scope.get(productEventLogger$).log({
                              eventName: "codex_app_nav_clicked",
                              metadata: { item: "add_workspace" },
                            });
                            handleOpenAddProjectDropdownLocal();
                          }}
                          onSelectRemote={() => {
                            scope.get(productEventLogger$).log({
                              eventName: "codex_app_nav_clicked",
                              metadata: { item: "add_workspace" },
                            });
                            handleOpenAddProjectDropdownRemote();
                          }}
                        />
                      ) : (
                        <Tooltip
                          tooltipContent={addGenericWorkspaceMessage}
                          shortcut={getMenuShortcutLabel("openFolder")}
                        >
                          <Button
                            className="h-6 w-6 rounded-md !p-1 text-token-foreground opacity-75 hover:opacity-100"
                            color="ghostActive"
                            size="icon"
                            aria-label={addGenericWorkspaceMessage}
                            onClick={() => {
                              scope.get(productEventLogger$).log({
                                eventName: "codex_app_nav_clicked",
                                metadata: { item: "add_workspace" },
                              });
                              handleOpenAddProjectDropdownLocal();
                            }}
                          >
                            <AddFolderIcon className="icon-xs" />
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                }
              >
                {showRecent ? (
                  <FormattedMessage
                    id="sidebarElectron.recentThreads"
                    defaultMessage="Recent threads"
                    description="List label for threads in recent section"
                  >
                    {(chunks) => (
                      <SidebarThreadSection
                        items={recentRenderableItems}
                        ariaLabel={chunks
                          .map((chunk) =>
                            typeof chunk === "string" ? chunk : "",
                          )
                          .join("")}
                        currentThreadKey={effectiveCurrentThreadKey}
                        onActivateThread={handleActivateThread}
                        className="pb-2"
                        itemClassName="after:block after:h-1 after:content-[''] last:after:hidden"
                        isLoading={
                          tasksQuery.isLoading && mergedTasks.length === 0
                        }
                        emptyState={
                          <FormattedMessage
                            id="sidebarElectron.noRecentThreads"
                            defaultMessage="No recent threads"
                            description="Empty state for recent section when there are no threads"
                          />
                        }
                        emptyStateClassName="text-token-input-placeholder-foreground p-2 text-base text-center"
                        maxItems={MAX_RECENT_TASKS}
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
                        forceExpanded={forceExpandRecent}
                        rowOptions={{
                          expandedSubagentParentId,
                          onToggleSubagentChildren: toggleSubagentChildren,
                        }}
                      />
                    )}
                  </FormattedMessage>
                ) : (
                  <SidebarThreadsSection
                    groups={groups}
                    connectionGroups={connectionGroups}
                    organizeMode={
                      effectiveSidebarOrganizeMode === "connection"
                        ? "connection"
                        : "project"
                    }
                    unpinnedItemByTaskKey={unpinnedItemByTaskKey}
                    pendingStableWorktrees={pendingStableWorktrees}
                    collapsedGroups={collapsedGroups}
                    setCollapsedGroups={setManuallyCollapsedGroups}
                    workspaceRootOptions={workspaceRootOptions}
                    workspaceRootLabels={workspaceRootLabels}
                    currentConversationId={effectiveCurrentConversationId}
                    currentThreadKey={effectiveCurrentThreadKey}
                    currentGroupId={currentGroupId}
                    shouldAnimateGroups={shouldAnimateGroups}
                    startNewConversation={handleStartNewConversation}
                    onActivateThread={handleActivateThread}
                    expandedSubagentParentId={expandedSubagentParentId}
                    onToggleSubagentChildren={toggleSubagentChildren}
                    isBackgroundSubagentsEnabled={isBackgroundSubagentsEnabled}
                  />
                )}
              </NavSection>
            </div>
          </nav>
        )}
        <div className="mt-auto px-row-x">
          <ProfileFooter />
        </div>
      </div>
    </>
  );
}

function SidebarSearchNavItem({
  onOpen,
}: {
  onOpen: () => void;
}): ReactElement {
  const shortcutLabel = getMenuShortcutLabel("openCommandMenuAlt");

  return (
    <NavItem
      icon={SearchIcon}
      onClick={onOpen}
      label={
        <FormattedMessage
          id="sidebarElectron.search"
          defaultMessage="Search"
          description="Sidebar navigation item that opens the command palette"
        />
      }
      className="group"
      trailing={
        shortcutLabel ? (
          <span
            aria-hidden="true"
            className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <KeybindingLabel keysLabel={shortcutLabel} />
          </span>
        ) : null
      }
    />
  );
}

function useWorkspaceRootDropHandlers({
  onDropRoot,
}: {
  onDropRoot: (root: string) => void;
}): {
  isDragActive: boolean;
  dropHandlers: {
    onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
    onDragOver: (event: DragEvent<HTMLDivElement>) => void;
    onDragLeave: () => void;
    onDrop: (event: DragEvent<HTMLDivElement>) => void;
  };
} {
  const [isDragActive, setIsDragActive] = useState(false);
  const dragDepthRef = useRef(0);

  const handleDragEnter = (event: DragEvent<HTMLDivElement>): void => {
    if (!hasFileDrag(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    dragDepthRef.current += 1;
    if (!isDragActive) {
      setIsDragActive(true);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    if (!hasFileDrag(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!isDragActive) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (): void => {
    if (!isDragActive) {
      return;
    }
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    if (hasFileDrag(event.dataTransfer)) {
      event.preventDefault();
    }
    const droppedRoot = getDroppedWorkspaceRoot(event.dataTransfer);
    dragDepthRef.current = 0;
    setIsDragActive(false);
    if (droppedRoot == null) {
      return;
    }
    onDropRoot(droppedRoot);
  };

  return {
    isDragActive,
    dropHandlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}

function hasFileDrag(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false;
  }
  const { types } = dataTransfer;
  for (let index = 0; index < types.length; index += 1) {
    if (types[index] === "Files") {
      return true;
    }
  }
  return false;
}

function getDroppedWorkspaceRoot(
  dataTransfer: DataTransfer | null,
): string | null {
  if (!dataTransfer) {
    return null;
  }
  const { files } = dataTransfer;
  if (files.length === 0) {
    return null;
  }
  const getPathForFile = window.electronBridge?.getPathForFile;
  for (let index = 0; index < files.length; index += 1) {
    const file = files.item(index);
    if (!file) {
      continue;
    }
    let filePath = getPathForFile ? getPathForFile(file) : null;
    if (filePath == null) {
      const fallbackPath = (file as File & { path?: string }).path;
      if (typeof fallbackPath === "string" && fallbackPath.length > 0) {
        filePath = fallbackPath;
      }
    }
    if (filePath != null) {
      return filePath;
    }
  }
  return null;
}

function getUniqueLocalTaskCwds(
  items: Array<SidebarThreadItem>,
): Array<string> {
  const uniqueCwds: Array<string> = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (item.task.kind !== "local") {
      continue;
    }
    const cwd = item.task.conversation.cwd;
    if (!cwd || seen.has(cwd)) {
      continue;
    }
    seen.add(cwd);
    uniqueCwds.push(cwd);
  }
  return uniqueCwds;
}

function useRecentTasksForFilter({
  items,
  itemsForVisibilityLookup,
  showRecent,
  hasGitRpc,
  workspaceTaskFilter,
  currentConversationId,
  isBackgroundSubagentsEnabled,
}: {
  items: Array<SidebarThreadItem>;
  itemsForVisibilityLookup: Array<SidebarThreadItem>;
  showRecent: boolean;
  hasGitRpc: boolean;
  workspaceTaskFilter: WorkspaceTaskFilter;
  currentConversationId: ConversationId | null;
  isBackgroundSubagentsEnabled: boolean;
}): Array<SidebarThreadItem> {
  const appServerManager = useDefaultAppServerManager();
  const hostConfig = useHostConfig(appServerManager.getHostId());
  const hostKey = getHostKey(hostConfig);
  const shouldFetchBranches = showRecent && workspaceTaskFilter === "relevant";
  const recentTaskCwds = getUniqueLocalTaskCwds(
    shouldFetchBranches ? items : [],
  );
  const metadataQueryOptions: Array<
    ReturnType<typeof gitStableMetadataQueryOptions>
  > = [];
  for (const cwd of recentTaskCwds) {
    metadataQueryOptions.push(
      gitStableMetadataQueryOptions(cwd, hasGitRpc, hostKey, hostConfig),
    );
  }
  const metadataQueries = useQueries({ queries: metadataQueryOptions });
  const branchQueryOptions = metadataQueries.map((metadataQuery) => {
    const metadata = metadataQuery.data ?? null;
    const params = metadata ? { root: metadata.root } : null;
    return gitQueryOptions<"current-branch", string | null>(
      "current-branch",
      metadata,
      params,
      hasGitRpc,
      hostKey,
      hostConfig,
      {
        select: (data): string | null => data.branch,
      },
    );
  });
  const branchQueries = useQueries({ queries: branchQueryOptions });
  const currentBranchByCwd = new Map<string, string | null>();
  for (let index = 0; index < recentTaskCwds.length; index += 1) {
    currentBranchByCwd.set(
      recentTaskCwds[index],
      branchQueries[index]?.data ?? null,
    );
  }
  const { data: codexHome } = useFetchFromVSCode("codex-home", {
    select: (data): string | undefined => data?.codexHome,
    queryConfig: { enabled: shouldFetchBranches },
  });

  if (!showRecent) {
    return items;
  }
  if (workspaceTaskFilter === "all") {
    return items;
  }
  return filterRecentTasks({
    items,
    itemsForVisibilityLookup,
    currentBranchByCwd,
    codexHome,
    currentConversationId,
    isBackgroundSubagentsEnabled,
  });
}

function filterRecentTasks({
  items,
  itemsForVisibilityLookup,
  currentBranchByCwd,
  codexHome,
  currentConversationId,
  isBackgroundSubagentsEnabled,
}: {
  items: Array<SidebarThreadItem>;
  itemsForVisibilityLookup: Array<SidebarThreadItem>;
  currentBranchByCwd: Map<string, string | null>;
  codexHome: string | undefined;
  currentConversationId: ConversationId | null;
  isBackgroundSubagentsEnabled: boolean;
}): Array<SidebarThreadItem> {
  const getBranch = (task: MergedTask): string | null => {
    if (task.kind !== "local") {
      return null;
    }
    if (task.conversation.cwd == null) {
      return null;
    }
    return currentBranchByCwd.get(task.conversation.cwd) ?? null;
  };
  const visibleItemKeys = new Set<string>();
  const tasksForVisibilityLookup = itemsForVisibilityLookup.map(
    (item) => item.task,
  );
  const recentVisibleKeys = getVisibleSubagentAwareTaskKeys({
    tasks: tasksForVisibilityLookup,
    currentConversationId,
    isBaseVisible: (task) =>
      isTaskRelevant(task, currentConversationId, getBranch(task), codexHome),
    isBackgroundSubagentsEnabled,
  });
  for (const item of items) {
    if (recentVisibleKeys.has(item.task.key)) {
      visibleItemKeys.add(item.task.key);
    }
  }

  return items.filter((item) => visibleItemKeys.has(item.task.key));
}

function AddProjectDropdown({
  remoteProjectsEnabled,
  showRemoteProjectCoachmark,
  onDismissRemoteProjectCoachmark,
  triggerButton,
  onSelectLocal,
  onSelectRemote,
}: {
  remoteProjectsEnabled: boolean;
  showRemoteProjectCoachmark: boolean;
  onDismissRemoteProjectCoachmark: () => void;
  triggerButton: ReactElement;
  onSelectLocal: () => void;
  onSelectRemote: () => void;
}): ReactElement {
  const intl = useIntl();
  const dropdown = (
    <BasicDropdown
      triggerButton={triggerButton}
      contentWidth="menu"
      onOpenChange={(isOpen) => {
        if (!isOpen && showRemoteProjectCoachmark) {
          onDismissRemoteProjectCoachmark();
        }
      }}
      open={showRemoteProjectCoachmark ? true : undefined}
    >
      <Dropdown.Item LeftIcon={AddFolderIcon} onSelect={onSelectLocal}>
        <FormattedMessage
          id="sidebarElectron.addLocalProject"
          defaultMessage="Local project"
          description="Dropdown item for adding a local project from the sidebar"
        />
      </Dropdown.Item>
      {remoteProjectsEnabled ? (
        <Dropdown.Item
          LeftIcon={GlobeIcon}
          onSelect={onSelectRemote}
          className={
            showRemoteProjectCoachmark
              ? "bg-token-list-hover-background"
              : undefined
          }
        >
          <FormattedMessage
            id="sidebarElectron.addRemoteProject"
            defaultMessage="Remote project"
            description="Dropdown item for adding a remote project from the sidebar"
          />
        </Dropdown.Item>
      ) : null}
    </BasicDropdown>
  );

  if (!showRemoteProjectCoachmark) {
    return dropdown;
  }

  return (
    <SidebarCoachmark
      badge={
        <FormattedMessage
          id="sidebarElectron.addRemoteProjectCoachmark.badge"
          defaultMessage="Remote"
          description="Badge shown in the add remote project coachmark anchored to the sidebar add project button"
        />
      }
      description={
        <FormattedMessage
          id="sidebarElectron.addRemoteProjectCoachmark.body"
          defaultMessage="Pick Remote project here to choose the repo on your connected machine."
          description="Body copy shown in the add remote project coachmark anchored to the sidebar add project button"
        />
      }
      dismissLabel={intl.formatMessage({
        id: "sidebarElectron.addRemoteProjectCoachmark.dismiss",
        defaultMessage: "Dismiss",
        description:
          "Accessible label for dismissing the add remote project coachmark anchored to the sidebar add project button",
      })}
      onDismiss={onDismissRemoteProjectCoachmark}
      open
      side="right"
      sideOffset={16}
      title={
        <FormattedMessage
          id="sidebarElectron.addRemoteProjectCoachmark.title"
          defaultMessage="Add your remote project from this menu"
          description="Title shown in the add remote project coachmark anchored to the sidebar add project button"
        />
      }
    >
      {dropdown}
    </SidebarCoachmark>
  );
}

function handleAddWorkspaceRoot(root?: string): void {
  if (root == null) {
    openLocalProjectPicker();
    return;
  }
  messageBus.dispatchMessage("electron-add-new-workspace-root-option", {
    root,
  });
}

function getLocalConversationIdFromThreadKey(
  threadKey: string | null,
): ConversationId | null {
  if (threadKey == null || !threadKey.startsWith("local:")) {
    return null;
  }
  return createConversationId(threadKey.slice("local:".length));
}
