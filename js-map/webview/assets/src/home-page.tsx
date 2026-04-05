import { Command } from "cmdk";
import { useAtom, useAtomValue } from "jotai";
import { useScope, useSignal } from "maitai";
import {
  createConversationId,
  createGitCwd,
  type PriorConversation,
} from "protocol";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { defineMessage, FormattedMessage, useIntl } from "react-intl";
import { useLocation, useNavigate } from "react-router";

import "./components/code/syntax-highlighter.css";
import { useAuth } from "@/auth/use-auth";
import { useAccounts, useCurrentAccount } from "@/codex-api";
import { useRegisterCommandMenuEntry } from "@/commands/command-menu-entries";
import {
  compactWindowActionMessages,
  useOpenCompactWindow,
} from "@/compact-window/use-open-compact-window";
import { AnimatedIcon } from "@/components/animated-icon";
import { Button } from "@/components/button";
import { HomeLayout } from "@/components/home-layout";
import { HomeRouteScopeProviders } from "@/components/home-route-scope-providers";
import { useSplitViewLayoutMode } from "@/components/split-view-layout";
import { Tooltip } from "@/components/tooltip";
import { Composer } from "@/composer/composer";
import type { ComposerMode } from "@/composer/composer";
import { focusComposerInput } from "@/composer/focus-composer";
import { LocalActiveWorkspaceRootDropdown } from "@/composer/local-active-workspace-root-dropdown";
import { aSlashCommandMenuOpen } from "@/composer/slash-commands/slash-command";
import { SlashCommandItem } from "@/composer/slash-commands/slash-command-item";
import { CHATGPT_PRICING_URL } from "@/constants/links";
import { SearchBar } from "@/content-search/search-bar";
import { ContentSearchControllerBridge } from "@/content-search/search-controller-bridge";
import {
  contentSearchDiffSource$,
  setContentSearchDefaultDomainForOpen,
} from "@/content-search/search-model";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { useGitHeadChangeRefetch } from "@/git-rpc/use-git-head-change-refetch";
import { HomeAnnouncements } from "@/home-announcements";
import { useWebviewExecutionTarget } from "@/hooks/use-webview-execution-target";
import HomeLogoIcon from "@/icons/homepage-logo.svg";
import PopInMacIcon from "@/icons/pop-in-mac.svg";
import UpgradePlusIcon from "@/icons/upgrade-plus.svg";
import { LocalConversationGitActions } from "@/local-conversation/local-conversation-git-actions";
import { messageBus, useMessage } from "@/message-bus";
import { useWorkspaceOnboardingAutoLaunchController } from "@/onboarding/workspace-onboarding-controller";
import {
  isWorkspaceOnboardingDirectPickerTreatment,
  WORKSPACE_ONBOARDING_DEFAULT_PROJECT_NAME,
} from "@/onboarding/workspace-onboarding-experiment";
import { productEventLogger$ } from "@/product-event-signal";
import { projectContext$ } from "@/project-context/project-context-signal";
import { useSelectedRemoteProject } from "@/remote-projects/remote-projects";
import { AppScope } from "@/scopes/app-scope";
import {
  createThreadRouteScopeValue,
  ThreadRouteScope,
} from "@/scopes/thread-route-scope";
import { useWorkspaceGroups } from "@/sidebar/use-repository-task-groups";
import {
  aTerminalOpenByKey,
  getTerminalOpenByKey,
  setTerminalOpenByKey,
} from "@/terminal/terminal-atoms";
import { TerminalPanel } from "@/terminal/terminal-panel";
import { useTerminalSessionId } from "@/terminal/use-terminal-session";
import {
  useElectronDiffShortcut,
  useElectronTerminalShortcut,
} from "@/terminal/use-terminal-shortcut";
import { ThreadPageHeader } from "@/thread-layout/thread-page-header";
import { ThreadPageLayout } from "@/thread-layout/thread-page-layout";
import { ThreadSidePanel } from "@/thread-layout/thread-side-panel";
import { useFocusVsContext } from "@/utils/use-vs-context";
import { useFetchFromVSCode } from "@/vscode-api";

import { WithWindow } from "./components/with-window";
import { ReviewDiffStats } from "./diff-stats";
import { Header } from "./header/header";
import { HomeConversationStarters } from "./home-conversation-starters";
import { OpenInTargetDropdown } from "./local-conversation/open-in-target-dropdown";
import { openCreateRemoteProjectModal } from "./project-setup/open-project-setup-dialog";
import { ReviewModeComposerOverlay } from "./review/review-mode-composer-overlay";
import { reviewLayoutMode$ } from "./review/review-preferences-model";
import { NuxGate } from "./sign-in/nux-gate";
import { shouldShowUpgradeCta } from "./sign-in/upgrade-cta-eligibility";

export type HomeViewAction = "open-create-remote-project-modal";

export type HomeLocationState = {
  focusComposerNonce?: number;
  prefillPrompt?: string;
  prefillPriorConversation?: PriorConversation | null;
  prefillComposerMode?: ComposerMode;
  prefillCwd?: string | null;
  pendingViewAction?: HomeViewAction;
};

const switchWorkspaceLabel = defineMessage({
  id: "codex.commandMenu.switchWorkspace",
  defaultMessage: "Switch project",
  description:
    "Command group label in the command menu for switching the active workspace on the home page",
});

/** Entry route that decides which banners/composer variant to show. */
export function HomePage({
  announcementStorybookOverride,
}: {
  announcementStorybookOverride?: ReactNode;
} = {}): ReactElement {
  const vsContextRef = useFocusVsContext<HTMLDivElement>(
    "chatgpt.supportsNewChatKeyShortcut",
  );
  const homeExecutionTarget = useWebviewExecutionTarget();
  const { data: codexHome } = useFetchFromVSCode("codex-home", {
    select: (data) => data.codexHome,
  });

  return (
    <NuxGate>
      <HomeRouteScopeProviders
        containerRef={vsContextRef}
        threadRoute={createThreadRouteScopeValue({
          codexHome: codexHome ?? null,
          cwd: homeExecutionTarget.cwd,
          hostConfig: homeExecutionTarget.hostConfig,
          hostId: homeExecutionTarget.hostId,
        })}
        threadId={createConversationId("new-conversation")}
      >
        <HomePageContentSearch />
        <HomePageContent
          announcementStorybookOverride={announcementStorybookOverride}
        />
      </HomeRouteScopeProviders>
    </NuxGate>
  );
}

export function HomePageContentSearch(): ReactElement {
  const scope = useScope(ThreadRouteScope);
  const diffSearchSource = useSignal(contentSearchDiffSource$);

  useEffect(() => {
    setContentSearchDefaultDomainForOpen(scope, "diff");
  }, [scope]);

  return (
    <>
      <SearchBar.Surface />
      <ContentSearchControllerBridge diffSource={diffSearchSource} />
    </>
  );
}

function HomePageContent({
  announcementStorybookOverride,
}: {
  announcementStorybookOverride?: ReactNode;
}): ReactElement {
  const scope = useScope(AppScope);
  const threadRouteScope = useScope(ThreadRouteScope);
  const { authMethod, planAtLogin } = useAuth();
  const { data: accountsData } = useAccounts();
  const { data: currentAccount } = useCurrentAccount();
  const terminalKey = "home";
  const [terminalOpenByKey, setTerminalOpenByKeyAtom] =
    useAtom(aTerminalOpenByKey);
  const isTerminalOpen = getTerminalOpenByKey(terminalOpenByKey, terminalKey);
  const [animateTerminalPanel, setAnimateTerminalPanel] = useState(false);
  const reviewLayoutMode = useSignal(reviewLayoutMode$);
  const {
    handleLeftPanelOpenChange,
    isLeftPanelOpen,
    isRightPanelOpen: isReviewOpen,
    setRightPanelOpen: setReviewPanelOpen,
    showInlineComposer,
  } = useSplitViewLayoutMode({
    layoutMode: reviewLayoutMode,
    setLayoutMode: (nextMode) => scope.set(reviewLayoutMode$, nextMode),
  });
  const intl = useIntl();
  const navigate = useNavigate();
  const {
    state: homeLocationState,
  }: {
    state: HomeLocationState | undefined;
  } = useLocation();
  const [useCaseGalleryState, setUseCaseGalleryState] = useState<
    "closed" | "opening" | "open" | "closing"
  >("closed");
  const [useCasePortalTarget, setUseCasePortalTarget] =
    useState<HTMLDivElement | null>(null);
  const [expandedActionsPortalTarget, setExpandedActionsPortalTarget] =
    useState<HTMLDivElement | null>(null);
  const openGalleryTimerRef = useRef<number | null>(null);
  const closeGalleryTimerRef = useRef<number | null>(null);
  const { data: accountInfo } = useFetchFromVSCode("account-info", {
    queryConfig: { enabled: authMethod === "chatgpt" },
  });
  const {
    autoLaunchAction: onboardingAutoLaunchAction,
    isRemoteHost,
    setWorkspaceOnboardingAutoLaunchApplied,
    workspaceOnboardingExperimentArm,
  } = useWorkspaceOnboardingAutoLaunchController();
  const didAutoOpenOnboardingPickerRef = useRef(false);
  const projectContext = useSignal(projectContext$);
  const gitRoot =
    projectContext.kind === "git" ? projectContext.git.root : null;
  const projectCwd =
    projectContext.cwd == null ? null : createGitCwd(projectContext.cwd);
  const projectHostConfig = threadRouteScope.value.hostConfig;
  const projectHostId = threadRouteScope.value.hostId;

  const { compactWindowAction, hasConfiguredHotkey, openCompactWindow } =
    useOpenCompactWindow({
      conversationId: null,
      prefillCwd: projectContext.cwd,
    });
  const { data: gitCurrentBranch, refetch: refetchCurrentBranch } =
    useGitCurrentBranch(gitRoot, projectHostConfig);
  useGitHeadChangeRefetch(gitRoot, projectHostConfig, refetchCurrentBranch);
  const homeFooterBranchName = gitCurrentBranch ?? null;
  const plan = accountInfo?.plan ?? planAtLogin;
  const showGetPlusButton = shouldShowUpgradeCta({
    authMethod,
    plan,
    currentAccount,
    accounts: accountsData?.accounts,
  });
  // Synthetic conversation id that lets us track the terminal session for each
  // workspace root.
  const terminalConversationId = `home:${projectHostId}:${projectContext.cwd}`;
  const homeTerminalSessionId = useTerminalSessionId({
    // Synthetic id that is unique per-workspace root.
    conversationId: terminalConversationId,
    hostId: projectHostId,
    cwd: projectContext.cwd,
  });

  useEffect((): void => {
    setAnimateTerminalPanel(false);
  }, [terminalConversationId]);

  const isSlashCommandMenuOpen = useAtomValue(aSlashCommandMenuOpen);
  const isUseCaseGalleryOpen = useCaseGalleryState !== "closed";
  const isUseCaseGalleryVisible =
    isUseCaseGalleryOpen && !isSlashCommandMenuOpen;
  const clearGalleryTimers = useCallback((): void => {
    if (openGalleryTimerRef.current != null) {
      window.clearTimeout(openGalleryTimerRef.current);
      openGalleryTimerRef.current = null;
    }
    if (closeGalleryTimerRef.current != null) {
      window.clearTimeout(closeGalleryTimerRef.current);
      closeGalleryTimerRef.current = null;
    }
  }, []);
  const openUseCaseGallery = useCallback((): void => {
    if (useCaseGalleryState === "open" || useCaseGalleryState === "opening") {
      return;
    }
    clearGalleryTimers();
    setUseCaseGalleryState("opening");
    openGalleryTimerRef.current = window.setTimeout(() => {
      setUseCaseGalleryState("open");
      openGalleryTimerRef.current = null;
    }, 20);
  }, [clearGalleryTimers, useCaseGalleryState]);
  const closeUseCaseGallery = useCallback((): void => {
    if (useCaseGalleryState === "closed") {
      return;
    }
    clearGalleryTimers();
    setUseCaseGalleryState("closing");
    closeGalleryTimerRef.current = window.setTimeout(() => {
      setUseCaseGalleryState("closed");
      closeGalleryTimerRef.current = null;
    }, 220);
  }, [clearGalleryTimers, useCaseGalleryState]);
  useEffect((): (() => void) => {
    return (): void => {
      clearGalleryTimers();
    };
  }, [clearGalleryTimers]);
  const [homeConversationStartersPortal, setHomeConversationStartersPortal] =
    useState<HTMLDivElement | null>(null);

  const homeConversationStarters = isSlashCommandMenuOpen ? null : (
    <HomeConversationStarters
      activeWorkspaceRoot={projectContext.cwd}
      isUseCaseGalleryOpen={isUseCaseGalleryVisible}
      useCaseGalleryState={useCaseGalleryState}
      onExploreMore={openUseCaseGallery}
      onCloseGallery={closeUseCaseGallery}
      useCasePortalTarget={useCasePortalTarget}
      portalTarget={homeConversationStartersPortal}
    />
  );

  useEffect(() => {
    if (
      didAutoOpenOnboardingPickerRef.current ||
      onboardingAutoLaunchAction !== "home_open_picker_or_create_default"
    ) {
      return;
    }
    didAutoOpenOnboardingPickerRef.current = true;
    setWorkspaceOnboardingAutoLaunchApplied(true);
    messageBus.dispatchMessage(
      "electron-onboarding-pick-workspace-or-create-default",
      {
        defaultProjectName: WORKSPACE_ONBOARDING_DEFAULT_PROJECT_NAME,
      },
    );
  }, [onboardingAutoLaunchAction, setWorkspaceOnboardingAutoLaunchApplied]);

  useMessage(
    "electron-onboarding-pick-workspace-or-create-default-result",
    (message) => {
      if (!message.success) {
        return;
      }
      if (
        !isWorkspaceOnboardingDirectPickerTreatment(
          workspaceOnboardingExperimentArm,
        )
      ) {
        return;
      }
      scope.get(productEventLogger$).log({
        eventName: "codex_onboarding_workspace_continue_clicked",
        metadata: {
          selected_workspaces_count: 1,
          total_workspaces_count: 0,
          auto_navigated: true,
          experiment_arm: workspaceOnboardingExperimentArm,
        },
      });
      scope.get(productEventLogger$).log({
        eventName: "codex_onboarding_completed",
        metadata: {
          selected_workspaces_count: 1,
          experiment_arm: workspaceOnboardingExperimentArm,
        },
      });
    },
  );

  const replaceHomeLocationStateEvent = useEffectEvent(
    (nextHomeLocationState: HomeLocationState) => {
      void navigate("/", {
        replace: true,
        state: nextHomeLocationState,
      });
    },
  );

  useEffect(() => {
    if (
      homeLocationState?.pendingViewAction !==
      "open-create-remote-project-modal"
    ) {
      return;
    }

    openCreateRemoteProjectModal({ setActive: true });

    const { pendingViewAction: _pendingViewAction, ...nextHomeLocationState } =
      homeLocationState;

    replaceHomeLocationStateEvent(nextHomeLocationState);
  }, [homeLocationState]);

  const setTerminalOpen = (next: boolean): void => {
    setAnimateTerminalPanel(true);
    setTerminalOpenByKeyAtom(
      setTerminalOpenByKey(terminalOpenByKey, terminalKey, next),
    );
  };
  const toggleTerminal = (): void => {
    const next = !isTerminalOpen;
    setTerminalOpen(next);
    if (!next) {
      focusComposerInput();
    }
  };
  useElectronTerminalShortcut(toggleTerminal);
  useElectronDiffShortcut(() => setReviewPanelOpen(!isReviewOpen));
  const openUpgrade = (): void => {
    messageBus.dispatchMessage("open-in-browser", {
      url: CHATGPT_PRICING_URL,
    });
  };
  const banners: ReactElement = (
    <div className="home-banners mt-2 flex flex-col gap-2">
      {/* mt-2 needed since the home gallery use case is in its own portal elsewhere */}
      {announcementStorybookOverride ?? <HomeAnnouncements />}
    </div>
  );
  const homeBody = (
    <>
      <WithWindow electron>
        <HomeWorkspaceCommandMenuEntry />
      </WithWindow>
      <HomeLogoIcon className="pointer-events-none fixed top-[calc(50%_-_55px)] left-1/2 -z-1 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-token-foreground/20 electron:hidden" />
      <WithWindow electron>
        {isUseCaseGalleryVisible ? (
          <div
            className="flex min-h-0 w-full flex-1"
            ref={setUseCasePortalTarget}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div aria-hidden="true">
              <AnimatedIcon
                className="text-token-foreground"
                animation="hello"
                size={48}
                animated={false /* Disabled until overall app perf improves */}
                loop={false}
                fallbackSvg={HomeLogoIcon}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="heading-xl mt-2 font-normal text-token-foreground select-none">
                <FormattedMessage
                  id="home.hero.letsBuild"
                  defaultMessage="Let’s build"
                  description="Label above the workspace name on the electron home page"
                />
              </div>
              <LocalActiveWorkspaceRootDropdown variant="hero" />
            </div>
          </div>
        )}
      </WithWindow>
      <WithWindow browser>
        <div className="heading-lg text-left font-normal">
          <FormattedMessage
            id="composer.newChat.heading.browser"
            defaultMessage="What should we code next?"
            description="Heading for the new chat page"
          />
        </div>
      </WithWindow>
    </>
  );
  const homeFooter = (
    <>
      {banners}
      <WithWindow electron>
        {showInlineComposer ? (
          <Composer
            aboveComposerContent={homeConversationStarters}
            disableAutoFocus={isTerminalOpen}
            onSubmitSuccess={() => {
              if (useCaseGalleryState === "closed") {
                return;
              }
              closeUseCaseGallery();
            }}
            showWorkspaceDropdownInFooter={false}
            footerBranchName={homeFooterBranchName}
          />
        ) : null}
      </WithWindow>
      <WithWindow browser>
        <Composer
          aboveComposerContent={homeConversationStarters}
          footerBranchName={homeFooterBranchName}
        />
      </WithWindow>
      <WithWindow extension>
        <Composer
          className="electron:hidden"
          footerBranchName={homeFooterBranchName}
          freeUpsellButton={
            showGetPlusButton ? (
              <GetPlusHeaderButton onClick={openUpgrade} />
            ) : null
          }
        />
      </WithWindow>
    </>
  );
  const leftPanel = (
    <HomeLayout
      className="@container/left-panel"
      body={homeBody}
      bodyClassName={isUseCaseGalleryVisible ? "flex-1 min-h-0" : undefined}
      alignMainToTop={isUseCaseGalleryVisible}
      disableMainScroll={isUseCaseGalleryVisible}
      disableBodyPadding={isUseCaseGalleryVisible}
      overlayRef={setHomeConversationStartersPortal}
      footer={homeFooter}
    />
  );
  const reviewPanel = <ThreadSidePanel ref={setExpandedActionsPortalTarget} />;

  const sharedLayoutProps = {
    leftPanel,
    rightPanel: reviewPanel,
    isLeftPanelOpen,
    setIsLeftPanelOpen: handleLeftPanelOpenChange,
    isRightPanelOpen: isReviewOpen,
    setIsRightPanelOpen: setReviewPanelOpen,
  };
  const header = (
    <>
      <WithWindow electron>
        <ThreadPageHeader
          hostConfig={projectHostConfig}
          hostTooltipText={projectContext.cwd}
          start={
            <FormattedMessage
              id="threadPage.newThread"
              defaultMessage="New thread"
              description="Header title for the home page"
            />
          }
          showHost
          startActions={
            showGetPlusButton ? (
              <GetPlusHeaderButton onClick={openUpgrade} />
            ) : null
          }
          trailing={
            projectContext.cwd ? (
              <>
                {!isRemoteHost && projectCwd != null ? (
                  <OpenInTargetDropdown cwd={projectCwd} />
                ) : null}
                {projectCwd != null ? (
                  <LocalConversationGitActions
                    cwd={projectCwd}
                    hostId={projectHostId}
                    codexWorktree={projectContext.isCodexWorktree}
                  />
                ) : null}
              </>
            ) : null
          }
          endActions={
            compactWindowAction.kind !== "hidden" ? (
              <Tooltip
                tooltipContent={
                  compactWindowAction.kind === "open-hotkey-window" &&
                  !hasConfiguredHotkey ? (
                    <div className="flex flex-col gap-1">
                      <FormattedMessage
                        {...compactWindowActionMessages[
                          compactWindowAction.kind
                        ]}
                      />
                      <div>
                        <FormattedMessage
                          id="threadPage.openInHotkeyWindow.settingsMessage"
                          defaultMessage="Set a hotkey in <settingsLink>Settings</settingsLink>"
                          description="Tooltip copy with a settings button when the hotkey window has no configured shortcut"
                          values={{
                            settingsLink: (text) => (
                              <button
                                type="button"
                                className="text-token-link underline-offset-2 hover:underline"
                                onClick={() => {
                                  void navigate("/settings");
                                }}
                              >
                                {text}
                              </button>
                            ),
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <FormattedMessage
                      {...compactWindowActionMessages[compactWindowAction.kind]}
                    />
                  )
                }
                delayOpen
                interactive={
                  compactWindowAction.kind === "open-hotkey-window" &&
                  !hasConfiguredHotkey
                }
              >
                <Button
                  size="toolbar"
                  color="ghost"
                  aria-label={intl.formatMessage(
                    compactWindowActionMessages[compactWindowAction.kind],
                  )}
                  className={
                    compactWindowAction.kind === "local-only"
                      ? "cursor-not-allowed opacity-40"
                      : undefined
                  }
                  onClick={openCompactWindow}
                >
                  <PopInMacIcon className="icon-sm" />
                </Button>
              </Tooltip>
            ) : null
          }
          panelToggles={{
            bottom: {
              isOpen: isTerminalOpen,
              onToggle: toggleTerminal,
            },
            right: {
              isOpen: isReviewOpen,
              onToggle: () => setReviewPanelOpen(!isReviewOpen),
              buttonContent: <ReviewDiffStats className="ml-1" />,
            },
          }}
        />
      </WithWindow>
      <WithWindow browser>
        <ThreadPageHeader
          start={
            <FormattedMessage
              id="threadPage.newThread"
              defaultMessage="New thread"
              description="Header title for the home page"
            />
          }
        />
      </WithWindow>
      <WithWindow extension>
        <Header />
      </WithWindow>
    </>
  );

  return (
    <>
      {header}
      <WithWindow extension>
        <HomeLayout
          body={homeBody}
          footer={homeFooter}
          overlayRef={setHomeConversationStartersPortal}
        />
      </WithWindow>
      <WithWindow browser>
        <ThreadPageLayout
          {...sharedLayoutProps}
          bottomPanel={null}
          isBottomPanelOpen={false}
        />
      </WithWindow>
      <WithWindow electron>
        <div className="relative min-h-0 flex-1">
          <ThreadPageLayout
            {...sharedLayoutProps}
            bottomPanel={
              <TerminalPanel
                key={projectContext.cwd ?? "home-terminal"}
                hostId={projectHostId}
                cwd={isRemoteHost ? null : projectContext.cwd}
                conversationId={terminalConversationId}
                isActive={isTerminalOpen}
                sessionId={homeTerminalSessionId}
                onClose={toggleTerminal}
              />
            }
            isBottomPanelOpen={isTerminalOpen}
            animateBottomPanel={animateTerminalPanel}
            setIsBottomPanelOpen={(isOpen): void => {
              setTerminalOpen(isOpen);
            }}
          />
          {!showInlineComposer ? (
            <ReviewModeComposerOverlay
              portalTarget={expandedActionsPortalTarget}
            >
              <Composer
                disableAutoFocus={isTerminalOpen}
                showWorkspaceDropdownInFooter={false}
                footerBranchName={homeFooterBranchName}
                surfaceClassName="electron:dark:bg-token-side-bar-background"
              />
            </ReviewModeComposerOverlay>
          ) : null}
        </div>
      </WithWindow>
    </>
  );
}

function GetPlusHeaderButton({
  onClick,
}: {
  onClick: () => void;
}): ReactElement {
  return (
    <Button
      className="!bg-token-charts-purple/10 !text-token-charts-purple hover:!bg-token-charts-purple/20"
      color="secondary"
      onClick={onClick}
      size="composerSm"
    >
      <UpgradePlusIcon className="icon-xxs" />
      <FormattedMessage
        id="home.header.getPlus"
        defaultMessage="Get Plus"
        description="Upsell button label shown in the new thread page header for free users"
      />
    </Button>
  );
}

function HomeWorkspaceCommandMenuEntry(): null {
  const workspaceGroups = useWorkspaceGroups();
  const { selectedRemoteProjectId, setSelectedRemoteProjectId } =
    useSelectedRemoteProject();
  const { data: activeWorkspaceRoots } = useFetchFromVSCode(
    "active-workspace-roots",
  );
  const activeProjectId =
    selectedRemoteProjectId ?? activeWorkspaceRoots?.roots?.[0] ?? null;

  useRegisterCommandMenuEntry({
    id: "home-switch-workspace",
    order: 1000,
    enabled: workspaceGroups.length > 0,
    dependencies: [
      activeProjectId,
      workspaceGroups
        .map((group) => `${group.projectId}:${group.label}`)
        .join("|"),
    ],
    render: (close) => {
      const projects = workspaceGroups.map((group) => ({
        projectId: group.projectId,
        path: group.path,
        label: group.label,
        projectKind: group.projectKind,
      }));

      if (projects.length === 0) {
        return null;
      }

      return (
        <Command.Group
          key="group-switch-workspace"
          heading={
            <span className="block px-2 pt-2 text-sm text-token-description-foreground">
              <FormattedMessage {...switchWorkspaceLabel} />
            </span>
          }
          className="flex flex-col"
          style={{ gap: "var(--spacing)" }}
        >
          {projects.map((project) => {
            return (
              <SlashCommandItem
                key={project.projectId}
                value={project.label}
                title={project.label}
                onSelect={() => {
                  if (project.projectKind === "remote") {
                    if (activeProjectId !== project.projectId) {
                      setSelectedRemoteProjectId(project.projectId);
                    }
                    close();
                    return;
                  }

                  setSelectedRemoteProjectId(null);
                  if (activeProjectId !== project.path) {
                    messageBus.dispatchMessage(
                      "electron-set-active-workspace-root",
                      { root: project.path },
                    );
                  }
                  close();
                }}
              />
            );
          })}
        </Command.Group>
      );
    },
  });

  return null;
}
