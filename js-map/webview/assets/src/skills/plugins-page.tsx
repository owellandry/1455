import { useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import startCase from "lodash/startCase";
import { useScope } from "maitai";
import type { ReactElement, RefObject } from "react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { IntlShape } from "react-intl";
import { FormattedMessage, useIntl } from "react-intl";
import { useLocation, useNavigate } from "react-router";

import { useUpdateAppEnabled } from "@/apps/apps-availability";
import { useAppConnectFlow } from "@/apps/use-app-connect-flow";
import { Button } from "@/components/button";
import { CardTile } from "@/components/card-tile";
import { Dialog, DialogTitle } from "@/components/dialog";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { toast$ } from "@/components/toaster/toast-signal";
import { Toggle } from "@/components/toggle";
import { Tooltip } from "@/components/tooltip";
import {
  getAppMentionPath,
  getPluginMentionPath,
} from "@/composer/mention-item";
import { escapePromptLinkPath } from "@/composer/prosemirror/prompt-link-path";
import { useStartNewConversation } from "@/hooks/use-start-new-conversation";
import { useWindowType } from "@/hooks/use-window-type";
import CheckIcon from "@/icons/check-md.svg";
import ChevronDownIcon from "@/icons/chevron.svg";
import McpIcon from "@/icons/mcp.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import { getPluginDisplayName } from "@/plugins/get-plugin-display-name";
import { PluginDetailPage } from "@/plugins/plugin-detail-page";
import { getPluginDetailPath } from "@/plugins/plugin-detail-route-utils";
import { PluginInstallModal } from "@/plugins/plugin-install-modal";
import { PluginsCardsGrid } from "@/plugins/plugins-cards-grid";
import { type InstalledPlugin, usePlugins } from "@/plugins/use-plugins";
import { productEventLogger$ } from "@/product-event-signal";
import {
  useAppsListWithResolvedConnectorLogos,
  useAppTools,
} from "@/queries/apps-queries";
import {
  MCP_SERVERS_QUERY_KEY,
  useMcpServers,
  useUpdateMcpServerEnabled,
} from "@/queries/config-queries";
import { AppScope } from "@/scopes/app-scope";
import { ControlGroup } from "@/settings/control-group";
import { AppConnectModal } from "@/settings/settings-content/app-connect-modal";
import {
  formatSkillScopeLabel,
  getSkillScopeLabel,
} from "@/skills/format-skill-scope";
import { useFetchFromVSCode } from "@/vscode-api";

import {
  useUninstallPlugin,
  useUpdatePluginEnabled,
} from "../plugins/plugins-availability";
import {
  hasCuratedMarketplace,
  type PluginMarketplaceFilterOption,
  selectFilteredPlugins,
  selectPluginMarketplaceFilterOptions,
  selectPluginSections,
} from "../plugins/plugins-page-selectors";
import { usePluginInstallFlow } from "../plugins/use-plugin-install-flow";
import { AppToolsDialog } from "./app-tools-dialog";
import {
  AppsCardsGrid,
  AppsLoadErrorBanner,
  AppsTabStatus,
} from "./apps-tab-content";
import {
  aHasOpenedPluginCreatorPrefill,
  aHasOpenedSkillCreatorPrefill,
  getCreatorPrefillPrompt,
} from "./creator-prefill";
import { PageSearchInput } from "./page-search-input";
import { PluginsPageHeader } from "./plugins-page-header";
import {
  partitionAppsByAccessibility,
  selectFilteredDirectoryApps,
  selectFilteredInstalledSkills,
  selectFilteredRecommendedSkills,
  selectOrderedWhitelistedRecommendedSkills,
} from "./plugins-page-selectors";
import {
  getPluginsPageTabConfig,
  getPluginsPageRouteState,
  type BrowsePluginsPageTab,
  type PluginsPageTab,
} from "./plugins-page-utils";
import { PluginsTabContent } from "./plugins-tab-content";
import {
  InstalledSkillsGrid,
  type InstalledSkillGroup,
  SkillsTabContent,
} from "./skills-tab-content";
import {
  useInstallRecommendedSkill,
  useInstalledSkillsData,
  useRecommendedSkillsData,
  useSkillsPagePaths,
} from "./use-skills-page-data";

import styles from "./skills-page-grid.module.css";

type PluginsPageMode =
  | {
      kind: "browse";
      tab: BrowsePluginsPageTab;
    }
  | {
      kind: "manage";
      tab: PluginsPageTab;
    };

type PluginsPageAppLists = {
  installedApps: ReturnType<
    typeof partitionAppsByAccessibility
  >["installedApps"];
};

type FilterOption = {
  label: string;
  value: string;
};

const CURATED_MARKETPLACE_POLL_INTERVAL_MS = 2_000;
const CURATED_MARKETPLACE_POLL_TIMEOUT_MS = 15_000;

export function PluginsPage(): ReactElement {
  const intl = useIntl();
  const location = useLocation();
  const navigate = useNavigate();
  const windowType = useWindowType();
  const routeState = getPluginsPageRouteState(location.state);
  const startNewConversation = useStartNewConversation();
  const scope = useScope(AppScope);
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [pageMode, setPageMode] = useState<PluginsPageMode>(() => {
    if (routeState.initialMode === "manage") {
      return createManagePluginsPageMode(routeState.initialTab);
    }

    return createBrowsePluginsPageMode(
      getBrowsePluginsPageTab(routeState.initialTab),
    );
  });
  const [oauthCallbackAppId, setOauthCallbackAppId] = useState<string | null>(
    () => routeState.connectAppId ?? null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [manageSearchQuery, setManageSearchQuery] = useState("");
  const [isRefreshingPage, setIsRefreshingPage] = useState(false);
  const [needsSkillsRefresh, setNeedsSkillsRefresh] = useState(false);
  const [curatedMarketplacePollStatus, setCuratedMarketplacePollStatus] =
    useState<"idle" | "loading">("idle");
  const [
    curatedMarketplacePollRestartKey,
    setCuratedMarketplacePollRestartKey,
  ] = useState(0);
  const [selectedPluginDetail, setSelectedPluginDetail] =
    useState<InstalledPlugin | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedMarketplacePathState, setSelectedMarketplacePath] = useState<
    string | null
  >(null);
  const { data: codexHomeData } = useFetchFromVSCode("codex-home");
  const [selectedCategoryIdState, setSelectedCategoryId] = useState<
    string | null
  >(null);
  const hasOpenedPluginCreatorPrefill = useAtomValue(
    aHasOpenedPluginCreatorPrefill,
  );
  const setHasOpenedPluginCreatorPrefill = useSetAtom(
    aHasOpenedPluginCreatorPrefill,
  );
  const hasOpenedSkillCreatorPrefill = useAtomValue(
    aHasOpenedSkillCreatorPrefill,
  );
  const setHasOpenedSkillCreatorPrefill = useSetAtom(
    aHasOpenedSkillCreatorPrefill,
  );
  const {
    forceReloadSkills,
    installedSkillMatchKeys,
    isFetching: isFetchingSkills,
    isLoading: isLoadingSkills,
    markSkillsUpdated,
    skills,
    workspaceRoots,
  } = useInstalledSkillsData();
  const {
    canInstallRecommendedSkills,
    defaultRecommendedRepoRoot,
    skillCreatorPath,
  } = useSkillsPagePaths();
  const pluginCreatorPath =
    codexHomeData == null
      ? null
      : `${codexHomeData.codexHome}/skills/.system/plugin-creator/SKILL.md`;
  const {
    errorMessage: recommendedSkillsErrorMessage,
    isLoading: isLoadingRecommendedSkills,
    refresh: refreshRecommendedSkills,
    repoRoot: recommendedRepoRoot,
    skills: recommendedSkills,
  } = useRecommendedSkillsData(defaultRecommendedRepoRoot);
  const { installRecommendedSkill, installingSkillId } =
    useInstallRecommendedSkill({
      forceReloadSkills,
      onInstalled: (): void => {
        setNeedsSkillsRefresh(true);
      },
    });
  const {
    errorMessage: pluginsErrorMessage,
    featuredPluginIds,
    plugins,
    isLoading: isPluginsLoading,
    isFetching: isPluginsFetching,
    forceReload: forceReloadPlugins,
    refetch: refetchPlugins,
  } = usePlugins(workspaceRoots);
  const { data: mcpServersConfig } = useMcpServers(null);
  const {
    data: directoryApps,
    hardRefetchAppsList,
    isHardRefetchingAppsList,
    isLoading: isLoadingAppsList,
    loadError: appsLoadError,
  } = useAppsListWithResolvedConnectorLogos();
  const resolvedDirectoryApps = directoryApps ?? [];
  const appsErrorMessage = appsLoadError?.message ?? null;
  const {
    closePluginInstall,
    connectRequiredApp,
    installPlugin,
    isInstalling: isInstallingPlugin,
    openPluginInstall,
    session: pluginInstallSession,
  } = usePluginInstallFlow({
    apps: resolvedDirectoryApps,
    forceReloadPlugins,
    hardRefetchAppsList,
  });
  const { pendingPluginId, setPluginEnabled } = useUpdatePluginEnabled();
  const { pendingUninstallPluginId, uninstallPlugin } = useUninstallPlugin();
  const {
    clearConnectingApp,
    connectingApp,
    handleAppConnectOAuthStarted,
    handleConnectApp,
    handleOpenAppUrl,
    isAppConnectPending,
  } = useAppConnectFlow();
  const { setAppEnabled, updatingAppId } = useUpdateAppEnabled();
  const selectedAppForTools =
    selectedAppId == null
      ? null
      : (resolvedDirectoryApps.find((app) => {
          return app.id === selectedAppId;
        }) ?? null);
  const selectedAppToolsQuery = useAppTools(selectedAppId);
  const updateMcpServerEnabled = useUpdateMcpServerEnabled();
  const oauthCallbackApp =
    oauthCallbackAppId == null
      ? null
      : (resolvedDirectoryApps.find((app) => {
          return app.id === oauthCallbackAppId;
        }) ?? null);
  const isCompletingOauthConnection =
    oauthCallbackAppId != null && isAppConnectPending(oauthCallbackAppId);
  const modalApp = connectingApp ?? oauthCallbackApp;
  const currentTab = pageMode.tab;
  const currentBrowseTab = pageMode.kind === "browse" ? pageMode.tab : null;
  const isManagePage = pageMode.kind === "manage";
  const isShowingInlinePluginDetail =
    windowType === "extension" && selectedPluginDetail != null;
  const hasLoadedCuratedMarketplace = hasCuratedMarketplace(plugins);
  const tabConfig = getPluginsPageTabConfig(intl, currentTab);
  const skillsTabConfig = getPluginsPageTabConfig(intl, "skills");
  const searchQueryNormalized = searchQuery.trim().toLowerCase();
  const manageSearchQueryNormalized = manageSearchQuery.trim().toLowerCase();
  const hasSearchQuery = searchQueryNormalized.length > 0;
  const filteredInstalledSkills = selectFilteredInstalledSkills({
    skills,
    query: searchQueryNormalized,
  });
  const filteredRecommendedSkills = selectFilteredRecommendedSkills({
    skills: recommendedSkills,
    query: searchQueryNormalized,
  });
  const orderedFilteredWhitelistedRecommendedSkills =
    selectOrderedWhitelistedRecommendedSkills(filteredRecommendedSkills);
  const visibleRecommendedSkills = hasSearchQuery
    ? filteredRecommendedSkills
    : orderedFilteredWhitelistedRecommendedSkills;
  const marketplaceFilterOptions =
    selectPluginMarketplaceFilterOptions(plugins);
  const defaultMarketplacePath = marketplaceFilterOptions[0]?.value ?? null;
  const selectedMarketplacePath = marketplaceFilterOptions.some((option) => {
    return option.value === selectedMarketplacePathState;
  })
    ? selectedMarketplacePathState
    : defaultMarketplacePath;
  const selectedPluginMarketplacePath =
    currentBrowseTab === "plugins" ? selectedMarketplacePath : null;
  const filteredPlugins = selectFilteredPlugins({
    plugins,
    marketplacePath: selectedPluginMarketplacePath,
    query: searchQueryNormalized,
  });
  const unsearchedFilteredPlugins = selectFilteredPlugins({
    plugins,
    marketplacePath: selectedPluginMarketplacePath,
    query: "",
  });
  const allPluginSections = selectPluginSections(
    unsearchedFilteredPlugins,
    featuredPluginIds,
  );
  const pluginCategoryFilterOptions = selectSectionFilterOptions(
    allPluginSections.map(({ section }) => section),
  );
  const scopeFilterRepoLabel = formatSkillScopeLabel({
    scope: "repo",
    intl,
  });
  const installedSkillGroups = buildInstalledSkillGroups({
    intl,
    roots: workspaceRoots,
    scopeFilterRepoLabel,
    skillEntries: filteredInstalledSkills,
  });
  const skillSectionFilterOptions = selectSectionFilterOptions([
    skillsTabConfig.sections[1],
    ...installedSkillGroups,
  ]);
  const categoryFilterOptions =
    currentBrowseTab === "skills"
      ? skillSectionFilterOptions
      : pluginCategoryFilterOptions;
  const selectedCategoryId = categoryFilterOptions.some((option) => {
    return option.value === selectedCategoryIdState;
  })
    ? selectedCategoryIdState
    : null;
  const selectedPluginCategoryId =
    currentBrowseTab === "skills" ? null : selectedCategoryId;
  const pluginSections = selectPluginSections(
    filteredPlugins,
    featuredPluginIds,
  );
  const visiblePluginSections =
    selectedPluginCategoryId == null
      ? pluginSections
      : pluginSections.filter(({ section }) => {
          return section.id === selectedPluginCategoryId;
        });
  const installedPlugins = plugins.filter((plugin) => {
    return plugin.plugin.installed;
  });
  const filteredManageInstalledPlugins = selectFilteredPlugins({
    plugins: installedPlugins,
    marketplacePath: null,
    query: manageSearchQueryNormalized,
  });
  const filteredManageInstalledSkills = selectFilteredInstalledSkills({
    skills,
    query: manageSearchQueryNormalized,
  });
  const appLists = getPluginsPageAppLists({
    apps: resolvedDirectoryApps,
  });
  const filteredManageInstalledApps = selectFilteredDirectoryApps({
    apps: appLists.installedApps,
    query: manageSearchQueryNormalized,
  });
  const filteredManageInstalledMcpServers =
    getFilteredManageInstalledMcpServers({
      mcpServers: mcpServersConfig?.servers ?? {},
      query: manageSearchQueryNormalized,
    });
  const updatingMcpServerKey = updateMcpServerEnabled.isPending
    ? (updateMcpServerEnabled.variables?.key ?? null)
    : null;
  const visibleInstalledSkillGroups =
    currentBrowseTab === "skills" && selectedCategoryId != null
      ? installedSkillGroups.filter((group) => {
          return group.id === selectedCategoryId;
        })
      : installedSkillGroups;
  const pageViewModel = getPluginsPageViewModel({
    currentTab,
    tabSections: tabConfig.sections,
    pluginSections: visiblePluginSections,
  });
  const hasVisibleInstalledSkills =
    isLoadingSkills ||
    visibleInstalledSkillGroups.length > 0 ||
    filteredInstalledSkills.length > 0;
  const hasVisibleRecommendedSkills =
    isLoadingRecommendedSkills ||
    recommendedSkillsErrorMessage != null ||
    visibleRecommendedSkills.length > 0;
  const pollCuratedMarketplaceEvent = useEffectEvent(async () => {
    const nextPlugins = await refetchPlugins();
    return hasCuratedMarketplace(nextPlugins);
  });
  const visibleInstalledSkillsSection =
    currentBrowseTab === "skills" &&
    hasVisibleInstalledSkills &&
    (selectedCategoryId == null || visibleInstalledSkillGroups.length > 0)
      ? (pageViewModel.visibleSections[0] ?? null)
      : null;
  const visibleRecommendedSkillsSection =
    currentBrowseTab === "skills" &&
    hasVisibleRecommendedSkills &&
    (selectedCategoryId == null ||
      selectedCategoryId === tabConfig.sections.at(-1)?.id)
      ? (pageViewModel.visibleSections.at(-1) ?? null)
      : null;
  const handleRetryAppsList = async (): Promise<void> => {
    try {
      await hardRefetchAppsList();
    } catch {
      // The query exposes the latest apps load error for the inline retry UI.
    }
  };
  const shouldPollCuratedMarketplace =
    currentTab === "plugins" &&
    pluginsErrorMessage == null &&
    !isPluginsLoading &&
    !hasLoadedCuratedMarketplace;
  const isPluginsTabLoading =
    isPluginsLoading || curatedMarketplacePollStatus === "loading";
  const isRefreshDisabled =
    isRefreshingPage ||
    isHardRefetchingAppsList ||
    isLoadingSkills ||
    isFetchingSkills ||
    isPluginsLoading ||
    isPluginsFetching;

  const handleCreatePlugin = (): void => {
    if (pluginCreatorPath == null) {
      return;
    }

    scope.get(productEventLogger$).log({
      eventName: "codex_skill_new_clicked",
    });
    const prompt = getCreatorPrefillPrompt({
      creatorPath: pluginCreatorPath,
      isFirstOpen: !hasOpenedPluginCreatorPrefill,
      kind: "plugin",
    });
    if (!hasOpenedPluginCreatorPrefill) {
      setHasOpenedPluginCreatorPrefill(true);
    }
    startNewConversation(
      {
        prefillPrompt: prompt,
      },
      { startInSidebar: true },
    );
  };
  useEffect(() => {
    if (!shouldPollCuratedMarketplace) {
      setCuratedMarketplacePollStatus("idle");
      return;
    }

    let didDispose = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const deadline = Date.now() + CURATED_MARKETPLACE_POLL_TIMEOUT_MS;

    setCuratedMarketplacePollStatus("loading");

    const poll = async (): Promise<void> => {
      const curatedMarketplaceLoaded =
        await pollCuratedMarketplaceEvent().catch(() => false);

      if (didDispose) {
        return;
      }
      if (curatedMarketplaceLoaded || Date.now() >= deadline) {
        setCuratedMarketplacePollStatus("idle");
        return;
      }

      timeoutId = setTimeout(() => {
        void poll();
      }, CURATED_MARKETPLACE_POLL_INTERVAL_MS);
    };

    void poll();

    return (): void => {
      didDispose = true;
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }
    };
  }, [curatedMarketplacePollRestartKey, shouldPollCuratedMarketplace]);
  const handleCreateSkill = (): void => {
    if (skillCreatorPath == null) {
      return;
    }

    scope.get(productEventLogger$).log({
      eventName: "codex_skill_new_clicked",
    });
    const prompt = getCreatorPrefillPrompt({
      creatorPath: skillCreatorPath,
      isFirstOpen: !hasOpenedSkillCreatorPrefill,
      kind: "skill",
    });
    if (!hasOpenedSkillCreatorPrefill) {
      setHasOpenedSkillCreatorPrefill(true);
    }
    startNewConversation(
      {
        prefillPrompt: prompt,
      },
      { startInSidebar: true },
    );
  };
  const handleTryPluginInChat = (plugin: InstalledPlugin): void => {
    const prompt = `[@${getPluginDisplayName(plugin)}](${escapePromptLinkPath(
      getPluginMentionPath(plugin.plugin.id),
    )}) `;
    const prefillCwd =
      workspaceRoots[0] != null && workspaceRoots[0] !== "/"
        ? workspaceRoots[0]
        : undefined;
    startNewConversation(
      {
        prefillPrompt: prompt,
        prefillCwd,
      },
      { startInSidebar: true },
    );
  };
  const handleRefreshPage = async (): Promise<void> => {
    setIsRefreshingPage(true);
    try {
      await Promise.all([
        forceReloadSkills(),
        forceReloadPlugins(),
        refreshRecommendedSkills(),
        hardRefetchAppsList(),
      ]);
      setNeedsSkillsRefresh(false);
    } catch {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "skills.page.refreshFailed",
          defaultMessage: "Failed to refresh skills and apps",
          description:
            "Toast message shown when refreshing the Skills & Apps page data fails",
        }),
      );
    } finally {
      if (currentTab === "plugins" && !hasLoadedCuratedMarketplace) {
        setCuratedMarketplacePollRestartKey((currentValue) => {
          return currentValue + 1;
        });
      }
      setIsRefreshingPage(false);
    }
  };
  const handleBrowseTabSelect = (nextTab: BrowsePluginsPageTab): void => {
    setPageMode(createBrowsePluginsPageMode(nextTab));
  };
  const handleManageTabSelect = (nextTab: PluginsPageTab): void => {
    setPageMode(createManagePluginsPageMode(nextTab));
  };
  const handleEnterManageMode = (): void => {
    setPageMode(createManagePluginsPageMode(currentTab));
  };
  const handleExitManageMode = (): void => {
    setPageMode(
      createBrowsePluginsPageMode(getBrowsePluginsPageTab(currentTab)),
    );
  };
  const handleOpenPluginDetails = (plugin: InstalledPlugin): void => {
    if (windowType === "extension") {
      setSelectedPluginDetail(plugin);
      return;
    }

    void navigate(
      getPluginDetailPath(plugin, {
        source: isManagePage ? "manage" : undefined,
      }),
    );
  };
  const focusSearchInputEvent = useEffectEvent(() => {
    searchInputRef.current?.focus();
  });
  const handleToggleMcpServerEnabled = async (
    serverKey: string,
    nextEnabled: boolean,
  ): Promise<void> => {
    await updateMcpServerEnabled.mutateAsync({
      key: serverKey,
      enabled: nextEnabled,
    });
    await queryClient.invalidateQueries({
      queryKey: MCP_SERVERS_QUERY_KEY,
    });
  };

  useEffect(() => {
    if (windowType !== "electron") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }
      if (event.key.toLowerCase() !== "f") {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      focusSearchInputEvent();
    };

    window.addEventListener("keydown", onKeyDown);
    return (): void => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isManagePage, windowType]);

  return (
    <div className="flex h-full min-h-0 flex-col text-base">
      {isShowingInlinePluginDetail ? (
        <PluginDetailPage
          marketplacePath={selectedPluginDetail.marketplacePath}
          pluginName={selectedPluginDetail.plugin.name}
          onBack={() => {
            setSelectedPluginDetail(null);
          }}
        />
      ) : (
        <>
          {isManagePage ? (
            <PluginsPageHeader
              mode="manage"
              canCreatePlugin={pluginCreatorPath != null}
              canCreateSkill={skillCreatorPath != null}
              isRefreshDisabled={isRefreshDisabled}
              onCreatePlugin={handleCreatePlugin}
              onCreateSkill={handleCreateSkill}
              onExitManageMode={handleExitManageMode}
              onRefreshPage={() => {
                void handleRefreshPage();
              }}
            />
          ) : (
            <PluginsPageHeader
              mode="browse"
              canCreatePlugin={pluginCreatorPath != null}
              canCreateSkill={skillCreatorPath != null}
              currentBrowseTab={currentBrowseTab ?? "plugins"}
              isRefreshDisabled={isRefreshDisabled}
              isRefreshingPage={isRefreshingPage}
              isManageButtonVisible
              needsSkillsRefresh={needsSkillsRefresh}
              onBrowseTabSelect={handleBrowseTabSelect}
              onCreatePlugin={handleCreatePlugin}
              onCreateSkill={handleCreateSkill}
              onManage={handleEnterManageMode}
              onRefreshPage={() => {
                void handleRefreshPage();
              }}
            />
          )}
          <div
            className={clsx(
              "flex-1 overflow-hidden",
              isManagePage && "p-panel",
            )}
          >
            <div
              className={clsx(
                "flex h-full w-full flex-1 flex-col",
                windowType !== "extension" && styles.container,
                isManagePage ? "gap-0" : "gap-8",
              )}
            >
              {isManagePage ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="mx-auto flex w-full max-w-[var(--thread-content-max-width)] flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <ManageModeTabs
                        appsCount={appLists.installedApps.length}
                        currentTab={currentTab}
                        mcpsCount={
                          Object.keys(mcpServersConfig?.servers ?? {}).length
                        }
                        pluginsCount={installedPlugins.length}
                        onSelectTab={handleManageTabSelect}
                        skillsCount={skills.length}
                      />
                      <div className="flex min-w-0 items-center">
                        <div className="hidden min-w-0 md:block md:w-56">
                          <PageSearchInput
                            id="plugins-page-manage-search"
                            inputRef={searchInputRef}
                            label={tabConfig.searchLabel}
                            onSearchQueryChange={setManageSearchQuery}
                            placeholder={tabConfig.searchPlaceholder}
                            searchQuery={manageSearchQuery}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative mt-8 min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] lg:h-full">
                    <div className="mx-auto flex w-full max-w-[var(--thread-content-max-width)] flex-col">
                      {currentTab === "plugins" ? (
                        <PluginsCardsGrid
                          errorMessage={pluginsErrorMessage}
                          isLoading={isPluginsTabLoading}
                          installedStateAction="toggle"
                          isSingleColumn
                          useCompactEmptyState
                          onOpenPluginDetails={handleOpenPluginDetails}
                          plugins={filteredManageInstalledPlugins}
                          onInstallPlugin={async (plugin): Promise<void> => {
                            openPluginInstall(plugin);
                          }}
                          onUninstallInstalledPlugin={uninstallPlugin}
                          onToggleInstalledPluginEnabled={setPluginEnabled}
                          pendingPluginId={pendingPluginId}
                          pendingUninstallPluginId={pendingUninstallPluginId}
                          emptyStateTitle={
                            <FormattedMessage
                              id="skills.appsPage.empty.plugins"
                              defaultMessage="No plugins found"
                              description="Empty state title when there are no plugins on the Plugins tab"
                            />
                          }
                        />
                      ) : currentTab === "skills" ? (
                        <InstalledSkillsGrid
                          installedStateAction="toggle"
                          isLoading={isLoadingSkills}
                          isSingleColumn
                          roots={workspaceRoots}
                          skillEntries={filteredManageInstalledSkills}
                          useCompactEmptyState
                          onSkillsUpdated={markSkillsUpdated}
                        />
                      ) : currentTab === "mcps" ? (
                        <ManageMcpServersList
                          mcpServers={filteredManageInstalledMcpServers}
                          onOpenSettings={() => {
                            void navigate("/settings/mcp-settings");
                          }}
                          onToggleEnabled={(serverKey, nextEnabled) => {
                            void handleToggleMcpServerEnabled(
                              serverKey,
                              nextEnabled,
                            );
                          }}
                          updatingServerKey={updatingMcpServerKey}
                        />
                      ) : directoryApps == null ? (
                        <AppsTabStatus
                          errorMessage={appsErrorMessage}
                          isLoading={isLoadingAppsList}
                          isRetrying={isHardRefetchingAppsList}
                          onRetry={handleRetryAppsList}
                        />
                      ) : (
                        <div className="flex flex-col gap-6">
                          {appsErrorMessage != null ? (
                            <AppsLoadErrorBanner
                              errorMessage={appsErrorMessage}
                              isRetrying={isHardRefetchingAppsList}
                              onRetry={handleRetryAppsList}
                            />
                          ) : null}
                          <AppsCardsGrid
                            apps={filteredManageInstalledApps}
                            emptyStateTitle={
                              <FormattedMessage
                                id="skills.appsPage.empty.installedApps"
                                defaultMessage="No installed apps"
                                description="Empty state title when there are no installed apps on the Skills & Apps page"
                              />
                            }
                            installedStateAction="toggle"
                            isSingleColumn
                            useCompactEmptyState
                            isAppConnectPending={isAppConnectPending}
                            updatingAppId={updatingAppId}
                            onInstallApp={async (app): Promise<void> => {
                              setOauthCallbackAppId(null);
                              await handleConnectApp(app);
                            }}
                            onOpenAppTools={(app): void => {
                              setSelectedAppId(app.id);
                            }}
                            onOpenAppUrl={handleOpenAppUrl}
                            onSetAppEnabled={setAppEnabled}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <BrowsePagePane
                  header={
                    <BrowsePageIntro
                      currentBrowseTab={currentBrowseTab ?? "plugins"}
                      categoryFilterOptions={categoryFilterOptions}
                      inputRef={searchInputRef}
                      label={tabConfig.searchLabel}
                      marketplaceFilterOptions={marketplaceFilterOptions}
                      onOpenPlugins={() => {
                        handleBrowseTabSelect("plugins");
                      }}
                      onSelectCategory={setSelectedCategoryId}
                      onSearchQueryChange={setSearchQuery}
                      onSelectMarketplace={setSelectedMarketplacePath}
                      placeholder={tabConfig.searchPlaceholder}
                      searchQuery={searchQuery}
                      selectedCategoryId={selectedCategoryId}
                      selectedMarketplacePath={selectedMarketplacePath}
                      title={intl.formatMessage({
                        id: "skills.appsPage.browseIntro.title",
                        defaultMessage: "Make Codex work your way",
                        description:
                          "Centered title shown at the top of the unified plugins browse page",
                      })}
                    />
                  }
                >
                  {currentBrowseTab !== "skills" ? (
                    <div className="flex min-h-0 flex-1 flex-col gap-4">
                      <PluginsTabContent
                        errorMessage={pluginsErrorMessage}
                        isLoading={isPluginsTabLoading}
                        pendingPluginId={pendingPluginId}
                        pendingUninstallPluginId={pendingUninstallPluginId}
                        onInstallPlugin={async (plugin): Promise<void> => {
                          openPluginInstall(plugin);
                        }}
                        onOpenPluginDetails={handleOpenPluginDetails}
                        onTryInChat={handleTryPluginInChat}
                        onToggleInstalledPluginEnabled={setPluginEnabled}
                        onUninstallInstalledPlugin={async (params) => {
                          await uninstallPlugin(params);
                        }}
                        sections={visiblePluginSections}
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col gap-4">
                      <SkillsTabContent
                        canInstallRecommendedSkills={
                          canInstallRecommendedSkills
                        }
                        errorMessage={recommendedSkillsErrorMessage}
                        hideInstalledSectionTitle
                        installedSkillGroups={visibleInstalledSkillGroups}
                        installedStateAction="check"
                        installedSection={visibleInstalledSkillsSection}
                        installedSkillMatchKeys={installedSkillMatchKeys}
                        installedSkills={filteredInstalledSkills}
                        installingSkillId={installingSkillId}
                        isLoadingInstalledSkills={isLoadingSkills}
                        isLoadingRecommendedSkills={isLoadingRecommendedSkills}
                        onInstallRecommendedSkill={installRecommendedSkill}
                        onSkillsUpdated={markSkillsUpdated}
                        recommendedRepoRoot={recommendedRepoRoot}
                        recommendedSection={visibleRecommendedSkillsSection}
                        recommendedSkills={visibleRecommendedSkills}
                        roots={workspaceRoots}
                      />
                    </div>
                  )}
                </BrowsePagePane>
              )}
            </div>
            <PluginInstallModal
              isInstalling={isInstallingPlugin}
              onConnectRequiredApp={connectRequiredApp}
              onInstall={installPlugin}
              onOpenChange={(nextOpen): void => {
                if (!nextOpen) {
                  closePluginInstall();
                }
              }}
              session={pluginInstallSession}
            />
            <PluginDetailModal
              pluginDetail={selectedPluginDetail}
              onOpenChange={(nextOpen): void => {
                if (!nextOpen) {
                  setSelectedPluginDetail(null);
                }
              }}
            />
            <AppConnectModal
              app={modalApp}
              isCompletingConnection={isCompletingOauthConnection}
              onOpenChange={(nextOpen): void => {
                if (!nextOpen) {
                  clearConnectingApp();
                  setOauthCallbackAppId(null);
                }
              }}
              onOAuthStarted={handleAppConnectOAuthStarted}
              onConnected={async (): Promise<void> => {
                setOauthCallbackAppId(null);
                await handleRetryAppsList();
              }}
            />
            <AppToolsDialog
              app={selectedAppForTools}
              errorMessage={selectedAppToolsQuery.error?.message ?? null}
              isLoading={selectedAppToolsQuery.isLoading}
              onOpenChange={(nextOpen): void => {
                if (!nextOpen) {
                  setSelectedAppId(null);
                }
              }}
              onOpenAppUrl={handleOpenAppUrl}
              onSetAppEnabled={setAppEnabled}
              onTryInChat={(app): void => {
                const prompt = `[@${app.name}](${escapePromptLinkPath(
                  getAppMentionPath(app.id),
                )})`;
                const prefillCwd =
                  workspaceRoots[0] != null && workspaceRoots[0] !== "/"
                    ? workspaceRoots[0]
                    : undefined;
                startNewConversation(
                  {
                    prefillPrompt: prompt,
                    prefillCwd,
                  },
                  { startInSidebar: true },
                );
              }}
              tools={selectedAppToolsQuery.data ?? []}
              updatingAppId={updatingAppId}
            />
          </div>
        </>
      )}
    </div>
  );
}

function BrowsePagePane({
  children,
  header,
}: {
  children: ReactElement;
  header: ReactElement;
}): ReactElement {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden pt-6">
      <div className="mx-auto flex w-full max-w-[var(--thread-content-max-width)] flex-col gap-8 px-panel pb-8">
        {header}
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] lg:h-full">
        <div className="mx-auto flex min-h-full w-full max-w-[var(--thread-content-max-width)] flex-col px-panel pb-panel">
          <div className="flex flex-1 flex-col pb-panel">{children}</div>
        </div>
      </div>
    </div>
  );
}

function PluginDetailModal({
  pluginDetail,
  onOpenChange,
}: {
  pluginDetail: InstalledPlugin | null;
  onOpenChange: (nextOpen: boolean) => void;
}): ReactElement {
  return (
    <Dialog
      open={pluginDetail != null}
      onOpenChange={onOpenChange}
      size="xxwide"
      contentClassName="h-[min(800px,92vh)] overflow-hidden py-10"
    >
      <DialogTitle asChild>
        <h2 className="sr-only">{pluginDetail?.plugin.name}</h2>
      </DialogTitle>
      {pluginDetail != null ? (
        <PluginDetailPage
          marketplacePath={pluginDetail.marketplacePath}
          pluginName={pluginDetail.plugin.name}
          onBeforeOpenInstall={() => {
            onOpenChange(false);
          }}
        />
      ) : null}
    </Dialog>
  );
}

function BrowsePageIntro({
  categoryFilterOptions,
  currentBrowseTab,
  inputRef,
  label,
  marketplaceFilterOptions,
  onOpenPlugins,
  onSelectCategory,
  onSearchQueryChange,
  onSelectMarketplace,
  placeholder,
  searchQuery,
  selectedCategoryId,
  selectedMarketplacePath,
  title,
}: {
  categoryFilterOptions: Array<FilterOption>;
  currentBrowseTab: BrowsePluginsPageTab;
  inputRef?: RefObject<HTMLInputElement | null>;
  label: string;
  marketplaceFilterOptions: Array<PluginMarketplaceFilterOption>;
  onOpenPlugins: () => void;
  onSelectCategory: (categoryId: string | null) => void;
  onSearchQueryChange: (value: string) => void;
  onSelectMarketplace: (marketplacePath: string | null) => void;
  placeholder: string;
  searchQuery: string;
  selectedCategoryId: string | null;
  selectedMarketplacePath: string | null;
  title: string;
}): ReactElement {
  const intl = useIntl();
  const allPluginsLabel = intl.formatMessage({
    id: "skills.appsPage.pluginsFilter.all",
    defaultMessage: "All plugins",
    description:
      "Dropdown option for showing the plugins tab from the shared browse-mode switcher",
  });
  const allCategoriesLabel = intl.formatMessage({
    id: "skills.appsPage.categoryFilter.all",
    defaultMessage: "All",
    description:
      "Dropdown option for showing every category on the Skills & Apps page",
  });
  const categoriesTriggerLabel = intl.formatMessage({
    id: "skills.appsPage.categoryFilter.trigger",
    defaultMessage: "Category",
    description:
      "Collapsed trigger label for the category dropdown on the Skills & Apps page",
  });
  const selectedMarketplaceOption =
    selectedMarketplacePath == null
      ? null
      : (marketplaceFilterOptions.find((option) => {
          return option.value === selectedMarketplacePath;
        }) ?? null);
  const selectedCategoryLabel =
    selectedCategoryId == null
      ? allCategoriesLabel
      : (categoryFilterOptions.find((option) => {
          return option.value === selectedCategoryId;
        })?.label ?? allCategoriesLabel);
  const browseTriggerText = selectedMarketplaceOption?.label ?? allPluginsLabel;
  const categoryDropdownAriaLabel = intl.formatMessage({
    id: "skills.appsPage.categoryDropdown.ariaLabel",
    defaultMessage: "Choose a category",
    description:
      "Accessible label for the category dropdown on the Skills & Apps page",
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-center text-center">
        <div className="heading-xl font-normal text-token-foreground">
          {title}
        </div>
      </div>
      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:gap-2">
          <div
            className={clsx(
              "w-full md:flex-1",
              currentBrowseTab === "plugins" && "md:max-w-[560px]",
            )}
          >
            <PageSearchInput
              id="plugins-page-search"
              inputRef={inputRef}
              label={label}
              onSearchQueryChange={onSearchQueryChange}
              placeholder={placeholder}
              searchQuery={searchQuery}
            />
          </div>
          <div
            className={clsx(
              "flex flex-wrap items-center gap-3 md:gap-2",
              currentBrowseTab === "skills" && "md:ml-auto",
            )}
          >
            {currentBrowseTab === "plugins" ? (
              <div>
                <BasicDropdown
                  align="start"
                  contentWidth="menuBounded"
                  triggerButton={
                    <Button
                      color="secondary"
                      size="toolbar"
                      className="justify-start gap-1.5 text-token-foreground hover:text-token-foreground"
                      aria-label={intl.formatMessage({
                        id: "skills.appsPage.browseDropdown.ariaLabel",
                        defaultMessage: "Choose a plugin marketplace",
                        description:
                          "Accessible label for the plugin marketplace dropdown on the Skills & Apps page",
                      })}
                    >
                      <span className="truncate text-left">
                        {browseTriggerText}
                      </span>
                      <ChevronDownIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground" />
                    </Button>
                  }
                >
                  {marketplaceFilterOptions.map((option) => (
                    <Dropdown.Item
                      key={option.value}
                      RightIcon={
                        option.value === selectedMarketplacePath
                          ? CheckIcon
                          : undefined
                      }
                      onSelect={() => {
                        onSelectMarketplace(option.value);
                        onOpenPlugins();
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{option.label}</span>
                        {option.subLabel != null ? (
                          <span className="truncate text-xs text-token-input-placeholder-foreground">
                            {option.subLabel}
                          </span>
                        ) : null}
                      </div>
                    </Dropdown.Item>
                  ))}
                </BasicDropdown>
              </div>
            ) : null}
            <div>
              <BasicDropdown
                align="start"
                contentWidth="sm"
                triggerButton={
                  <Button
                    color="secondary"
                    size="toolbar"
                    className={clsx(
                      "justify-start gap-1.5 hover:text-token-foreground",
                      selectedCategoryId != null
                        ? "text-token-foreground"
                        : "text-token-description-foreground",
                    )}
                    aria-label={categoryDropdownAriaLabel}
                  >
                    <span className="truncate text-left">
                      {selectedCategoryLabel}
                    </span>
                    <ChevronDownIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground" />
                  </Button>
                }
              >
                <Dropdown.Title>{categoriesTriggerLabel}</Dropdown.Title>
                <Dropdown.Section className="max-h-40 overflow-y-auto">
                  <Dropdown.Item
                    onSelect={() => {
                      onSelectCategory(null);
                    }}
                  >
                    {allCategoriesLabel}
                  </Dropdown.Item>
                  {categoryFilterOptions.map((option) => (
                    <Dropdown.Item
                      key={option.value}
                      RightIcon={
                        option.value === selectedCategoryId
                          ? CheckIcon
                          : undefined
                      }
                      onSelect={() => {
                        onSelectCategory(option.value);
                      }}
                    >
                      {option.label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Section>
              </BasicDropdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function createBrowsePluginsPageMode(
  tab: BrowsePluginsPageTab,
): PluginsPageMode {
  return {
    kind: "browse",
    tab,
  };
}

function createManagePluginsPageMode(tab: PluginsPageTab): PluginsPageMode {
  return {
    kind: "manage",
    tab,
  };
}

function getBrowsePluginsPageTab(tab: PluginsPageTab): BrowsePluginsPageTab {
  return tab === "skills" ? "skills" : "plugins";
}

function getPluginsPageAppLists({
  apps,
}: {
  apps: Array<AppServer.v2.AppInfo>;
}): PluginsPageAppLists {
  const { installedApps } = partitionAppsByAccessibility(apps);

  return {
    installedApps,
  };
}

function buildInstalledSkillGroups({
  intl,
  roots,
  scopeFilterRepoLabel,
  skillEntries,
}: {
  intl: IntlShape;
  roots: Array<string>;
  scopeFilterRepoLabel: string;
  skillEntries: Array<{ skill: AppServer.v2.SkillMetadata }>;
}): Array<InstalledSkillGroup> {
  const groupsByLabel = new Map<
    string,
    {
      group: InstalledSkillGroup;
      order: number;
      rank: number;
    }
  >();

  for (const skillEntry of skillEntries) {
    const title = getSkillScopeLabel({
      skill: skillEntry.skill,
      roots,
      intl,
      fallbackRepoLabel: scopeFilterRepoLabel,
    });
    const existingGroup = groupsByLabel.get(title);
    if (existingGroup == null) {
      groupsByLabel.set(title, {
        group: {
          id: `skills-installed-${normalizeNavLabel(title)}`,
          title,
          skillEntries: [skillEntry],
        },
        order: groupsByLabel.size,
        rank: skillEntry.skill.scope === "system" ? 0 : 1,
      });
      continue;
    }
    existingGroup.group.skillEntries.push(skillEntry);
  }

  return Array.from(groupsByLabel.values())
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }
      return left.order - right.order;
    })
    .map(({ group }) => group);
}

function normalizeNavLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  return target.closest("[contenteditable='true']") != null;
}

function getPluginsPageViewModel({
  currentTab,
  pluginSections,
  tabSections,
}: {
  currentTab: PluginsPageTab;
  pluginSections: ReturnType<typeof selectPluginSections>;
  tabSections: Array<{ id: string; title: string }>;
}): {
  visibleSections: Array<{ id: string; title: string }>;
} {
  return {
    visibleSections:
      currentTab === "plugins"
        ? pluginSections.map(({ section }) => section)
        : tabSections,
  };
}

function selectSectionFilterOptions(
  sections: Array<{ id: string; title: string }>,
): Array<FilterOption> {
  return sections.map((section) => ({
    label: section.title,
    value: section.id,
  }));
}

function ManageModeTabs({
  appsCount,
  currentTab,
  mcpsCount,
  onSelectTab,
  pluginsCount,
  skillsCount,
}: {
  appsCount: number;
  currentTab: PluginsPageTab;
  mcpsCount: number;
  onSelectTab: (tab: PluginsPageTab) => void;
  pluginsCount: number;
  skillsCount: number;
}): ReactElement {
  const intl = useIntl();
  const tabs: Array<{ count: number; id: PluginsPageTab; label: string }> = [
    {
      count: pluginsCount,
      id: "plugins",
      label: intl.formatMessage({
        id: "skills.appsPage.manageTab.plugins",
        defaultMessage: "Plugins",
        description: "Manage-mode tab label for installed plugins",
      }),
    },
    {
      count: appsCount,
      id: "apps",
      label: intl.formatMessage({
        id: "skills.appsPage.manageTab.apps",
        defaultMessage: "Apps",
        description: "Manage-mode tab label for installed apps",
      }),
    },
    {
      count: mcpsCount,
      id: "mcps",
      label: intl.formatMessage({
        id: "skills.appsPage.manageTab.mcps",
        defaultMessage: "MCPs",
        description: "Manage-mode tab label for installed MCP servers",
      }),
    },
    {
      count: skillsCount,
      id: "skills",
      label: intl.formatMessage({
        id: "skills.appsPage.manageTab.skills",
        defaultMessage: "Skills",
        description: "Manage-mode tab label for installed skills",
      }),
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          color={tab.id === currentTab ? "secondary" : "ghost"}
          size="toolbar"
          aria-current={tab.id === currentTab ? "page" : undefined}
          onClick={() => {
            onSelectTab(tab.id);
          }}
        >
          {tab.label}
          <span className="ml-0.5 text-token-input-placeholder-foreground">
            {tab.count}
          </span>
        </Button>
      ))}
    </div>
  );
}

function ManageMcpServersList({
  mcpServers,
  onOpenSettings,
  onToggleEnabled,
  updatingServerKey,
}: {
  mcpServers: Array<{ key: string; name: string; enabled: boolean }>;
  onOpenSettings: () => void;
  onToggleEnabled: (serverKey: string, nextEnabled: boolean) => void;
  updatingServerKey: string | null;
}): ReactElement {
  const intl = useIntl();

  if (mcpServers.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center py-8">
        <div className="text-sm text-token-text-secondary">
          <FormattedMessage
            id="skills.appsPage.empty.mcps"
            defaultMessage="No MCP servers found"
            description="Empty state title when there are no MCP servers on the manage MCPs tab"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {mcpServers.map((server) => (
        <CardTile
          key={server.key}
          className="group justify-center border-none"
          actionsPlacement="center"
          icon={<McpIcon className="icon-sm text-token-text-secondary" />}
          title={server.name}
          actions={
            <ControlGroup>
              <Tooltip
                tooltipContent={
                  <FormattedMessage
                    id="skills.appsPage.mcps.settings"
                    defaultMessage="Open MCP settings"
                    description="Tooltip for the MCP settings button on the manage MCPs tab"
                  />
                }
              >
                <Button
                  color="ghost"
                  size="icon"
                  aria-label={intl.formatMessage({
                    id: "skills.appsPage.mcps.settings",
                    defaultMessage: "Open MCP settings",
                    description:
                      "Tooltip for the MCP settings button on the manage MCPs tab",
                  })}
                  onClick={(event): void => {
                    event.stopPropagation();
                    onOpenSettings();
                  }}
                >
                  <SettingsCogIcon className="icon-sm" />
                </Button>
              </Tooltip>
              <Tooltip
                tooltipContent={
                  server.enabled ? (
                    <FormattedMessage
                      id="skills.appsPage.mcps.disable"
                      defaultMessage="Disable MCP server"
                      description="Tooltip label for disabling an MCP server on the manage MCPs tab"
                    />
                  ) : (
                    <FormattedMessage
                      id="skills.appsPage.mcps.enable"
                      defaultMessage="Enable MCP server"
                      description="Tooltip label for enabling an MCP server on the manage MCPs tab"
                    />
                  )
                }
              >
                <Toggle
                  checked={server.enabled}
                  disabled={updatingServerKey === server.key}
                  ariaLabel={intl.formatMessage({
                    id: "skills.appsPage.mcps.toggle",
                    defaultMessage: "Toggle MCP server enabled state",
                    description:
                      "Accessible label for the MCP server toggle on the manage MCPs tab",
                  })}
                  onClick={(event): void => {
                    event.stopPropagation();
                  }}
                  onChange={(nextEnabled): void => {
                    onToggleEnabled(server.key, nextEnabled);
                  }}
                />
              </Tooltip>
            </ControlGroup>
          }
        />
      ))}
    </div>
  );
}

function getFilteredManageInstalledMcpServers({
  mcpServers,
  query,
}: {
  mcpServers: Record<string, { name?: string; enabled?: boolean }>;
  query: string;
}): Array<{ key: string; name: string; enabled: boolean }> {
  return Object.entries(mcpServers)
    .map(([key, config]) => ({
      key,
      name: formatMcpServerDisplayName(config.name?.trim() || key),
      enabled: config.enabled !== false,
    }))
    .filter((server) => {
      if (query.length === 0) {
        return true;
      }

      return [server.key, server.name].some((value) => {
        return value.toLowerCase().includes(query);
      });
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function formatMcpServerDisplayName(name: string): string {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return "";
  }

  return startCase(trimmedName);
}
