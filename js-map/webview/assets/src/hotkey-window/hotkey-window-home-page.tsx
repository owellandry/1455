import clsx from "clsx";
import { buildHotkeyWindowThreadRoute, type ConversationId } from "protocol";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useLocation, useNavigate } from "react-router";

import { MoreMenuTrigger } from "@/components/more-menu-trigger";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { AsyncTaskStartingStateDropdown } from "@/composer/async-task-starting-state-dropdown";
import { Composer } from "@/composer/composer";
import { ComposerFooterBranchSwitcher } from "@/composer/composer-footer-branch-switcher";
import { useComposerViewState } from "@/composer/composer-view-state";
import { focusComposerInput } from "@/composer/focus-composer";
import { HotkeyWindowHomeLocalWorktreeDropdown } from "@/composer/hotkey-window/hotkey-window-home-local-worktree-dropdown";
import { LocalActiveWorkspaceRootDropdown } from "@/composer/local-active-workspace-root-dropdown";
import { PermissionsModeDropdown } from "@/composer/permissions-mode-dropdown";
import { WorktreeEnvironmentDropdown } from "@/composer/worktree-environment-dropdown";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { useGitHeadChangeRefetch } from "@/git-rpc/use-git-head-change-refetch";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useResolvedLocalEnvironmentSelection } from "@/local-conversation/local-environment-selection";
import { messageBus } from "@/message-bus";
import {
  DEFAULT_HOST_ID,
  useHostConfig,
} from "@/shared-objects/use-host-config";
import { getProjectName } from "@/thread-layout/get-project-name";
import { useGitRootForCwd } from "@/utils/git-root";
import { useFetchFromVSCode } from "@/vscode-api";

import { useHotkeyWindowDismissOnEscape } from "./use-hotkey-window-dismiss-on-escape";
import { useHotkeyWindowPointerInteractivity } from "./use-hotkey-window-pointer-interactivity";

import styles from "./hotkey-window.module.css";

type HotkeyWindowLocationState = {
  focusComposerNonce?: number;
  prefillCwd?: string | null;
};

export function HotkeyWindowHomePage(): React.ReactElement {
  useHotkeyWindowDismissOnEscape();

  const intl = useIntl();
  const location = useLocation();
  const navigate = useNavigate();
  const localHostConfig = useHostConfig(DEFAULT_HOST_ID);
  const interactiveRegionRef = useRef<HTMLDivElement | null>(null);
  const locationState = location.state as HotkeyWindowLocationState | null;
  const focusComposerNonce = locationState?.focusComposerNonce ?? null;
  const { data: activeWorkspaceRoots } = useFetchFromVSCode(
    "active-workspace-roots",
  );
  const activeWorkspaceRoot = activeWorkspaceRoots?.roots[0] ?? null;
  const [composerViewState, setComposerViewState] = useComposerViewState(
    undefined,
    activeWorkspaceRoot,
  );
  const composerMode = composerViewState.composerMode;
  const { data: gitMetadata } = useGitStableMetadata(
    activeWorkspaceRoot,
    localHostConfig,
  );
  const gitRoot = gitMetadata?.root ?? null;
  const { data: currentBranch, refetch: refetchCurrentBranch } =
    useGitCurrentBranch(activeWorkspaceRoot, localHostConfig);
  useGitHeadChangeRefetch(
    activeWorkspaceRoot,
    localHostConfig,
    refetchCurrentBranch,
  );
  const { gitRoot: worktreeRepoRoot } = useGitRootForCwd(activeWorkspaceRoot, {
    enabled: composerMode === "worktree",
  });
  const {
    environments: worktreeEnvironments,
    isLoading: localEnvironmentsLoading,
    error: localEnvironmentsError,
    resolvedConfigPath: resolvedWorktreeEnvironmentConfigPath,
    updateSelection: updateEnvironmentSelection,
  } = useResolvedLocalEnvironmentSelection({
    workspaceRoot: composerMode === "worktree" ? activeWorkspaceRoot : null,
    enabled: composerMode === "worktree",
  });
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false);
  const dragReactivationEnabled = useHotkeyWindowPointerInteractivity({
    activationNonce: focusComposerNonce,
    interactiveRegionRef,
    onInteractiveChange: (isInteractive) => {
      messageBus.dispatchMessage(
        "hotkey-window-home-pointer-interaction-changed",
        {
          isInteractive,
        },
      );
    },
  });

  useEffect(() => {
    focusComposerInput();
  }, [focusComposerNonce]);

  const setComposerMode = (
    composerMode: "local" | "cloud" | "worktree",
  ): void => {
    setComposerViewState((prev) => {
      return {
        ...prev,
        composerMode,
      };
    });
  };

  const setAsyncThreadStartingState = (
    asyncThreadStartingState: typeof composerViewState.asyncThreadStartingState,
  ): void => {
    setComposerViewState((prev) => {
      return {
        ...prev,
        asyncThreadStartingState,
      };
    });
  };

  const handleLocalConversationCreated = (
    conversationId: ConversationId,
  ): void => {
    messageBus.dispatchMessage("open-in-hotkey-window", {
      path: buildHotkeyWindowThreadRoute(conversationId),
    });
  };
  const projectName =
    getProjectName(activeWorkspaceRoot) ??
    intl.formatMessage({
      id: "hotkeyWindow.home.placeholder.unknownProject",
      defaultMessage: "this project",
      description:
        "Fallback project name in the hotkey window composer placeholder",
    });
  const placeholderText =
    composerMode === "cloud"
      ? intl.formatMessage({
          id: "hotkeyWindow.home.placeholder.cloud",
          defaultMessage: "Ask Codex anything in the cloud",
          description: "Hotkey window placeholder for cloud mode",
        })
      : composerMode === "worktree"
        ? intl.formatMessage(
            {
              id: "hotkeyWindow.home.placeholder.worktree",
              defaultMessage: "Ask Codex anything in a worktree in {project}",
              description: "Hotkey window placeholder for worktree mode",
            },
            { project: projectName },
          )
        : intl.formatMessage(
            {
              id: "hotkeyWindow.home.placeholder.local",
              defaultMessage: "Ask Codex anything locally in {project}",
              description: "Hotkey window placeholder for local mode",
            },
            { project: projectName },
          );
  const hasGitRepo = gitRoot != null;
  const continueInDisabledTooltipText = !hasGitRepo
    ? intl.formatMessage({
        id: "hotkeyWindow.home.taskMenu.continueIn.disabledTooltip",
        defaultMessage:
          "Initialize a git repo to continue in cloud or worktree mode",
        description:
          "Tooltip shown when the hotkey-window continue-in control is disabled because the project is not a git repo",
      })
    : undefined;
  const branchControl =
    composerMode === "worktree" ? (
      <AsyncTaskStartingStateDropdown
        startingState={composerViewState.asyncThreadStartingState}
        setStartingState={setAsyncThreadStartingState}
        hostConfig={localHostConfig}
        gitRootOverride={worktreeRepoRoot ?? activeWorkspaceRoot}
        branchSource="worktree"
      />
    ) : currentBranch ? (
      <ComposerFooterBranchSwitcher
        branchName={currentBranch}
        gitRoot={gitRoot}
        hostConfig={localHostConfig}
        localConversationId={null}
        shouldShow
      />
    ) : null;
  const taskMenuLabel = intl.formatMessage({
    id: "hotkeyWindow.home.taskMenu.label",
    defaultMessage: "Task settings",
    description: "Accessible label for the hotkey window task settings menu",
  });

  return (
    <div
      className={clsx(
        styles.home,
        "relative flex h-full w-full items-end overflow-hidden bg-transparent p-1",
      )}
    >
      <div
        ref={interactiveRegionRef}
        className={clsx(
          styles.homeShell,
          "w-full px-[15px] pb-[13px] pt-[17px]",
          dragReactivationEnabled && "no-drag",
        )}
      >
        <div className={styles.shellUnderlay} aria-hidden="true" />
        <HotkeyWindowHomeComposer
          placeholderText={placeholderText}
          overflowMenu={
            <Popover open={isTaskMenuOpen} onOpenChange={setIsTaskMenuOpen}>
              <PopoverTrigger asChild>
                <MoreMenuTrigger label={taskMenuLabel} size="composer" />
              </PopoverTrigger>
              <PopoverContent
                align="center"
                side="top"
                sideOffset={10}
                className="no-drag w-auto min-w-[320px] rounded-3xl p-0"
              >
                <div className="flex flex-col gap-4 p-3">
                  <HotkeyWindowTaskMenuRow
                    label={
                      <FormattedMessage
                        id="hotkeyWindow.home.taskMenu.project"
                        defaultMessage="Project"
                        description="Label for the hotkey window project row"
                      />
                    }
                    control={
                      <LocalActiveWorkspaceRootDropdown
                        allowRemoteProjects={false}
                      />
                    }
                  />
                  <HotkeyWindowTaskMenuRow
                    label={
                      <FormattedMessage
                        id="hotkeyWindow.home.taskMenu.continueIn"
                        defaultMessage="Continue in"
                        description="Label for the hotkey window mode row"
                      />
                    }
                    control={
                      <HotkeyWindowHomeLocalWorktreeDropdown
                        composerMode={composerMode}
                        setComposerMode={setComposerMode}
                        showLabel
                        disabledTooltipText={continueInDisabledTooltipText}
                      />
                    }
                  />
                  {composerMode === "worktree" ? (
                    <HotkeyWindowTaskMenuRow
                      label={
                        <FormattedMessage
                          id="hotkeyWindow.home.taskMenu.environment"
                          defaultMessage="Environment"
                          description="Label for the hotkey window environment row"
                        />
                      }
                      control={
                        <WorktreeEnvironmentDropdown
                          environments={worktreeEnvironments}
                          isLoading={localEnvironmentsLoading}
                          hasError={localEnvironmentsError != null}
                          selectedConfigPath={
                            resolvedWorktreeEnvironmentConfigPath
                          }
                          onSelectConfigPath={updateEnvironmentSelection}
                          onOpenSettings={() => {
                            void navigate("/settings/local-environments");
                          }}
                        />
                      }
                    />
                  ) : null}
                  {branchControl ? (
                    <HotkeyWindowTaskMenuRow
                      label={
                        <FormattedMessage
                          id="hotkeyWindow.home.taskMenu.branch"
                          defaultMessage="Branch"
                          description="Label for the hotkey window branch row"
                        />
                      }
                      control={branchControl}
                    />
                  ) : null}
                  {composerMode !== "cloud" ? (
                    <HotkeyWindowTaskMenuRow
                      label={
                        <FormattedMessage
                          id="hotkeyWindow.home.taskMenu.permissions"
                          defaultMessage="Permissions"
                          description="Label for the hotkey window permissions row"
                        />
                      }
                      control={
                        <PermissionsModeDropdown conversationId={null} />
                      }
                    />
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>
          }
          onLocalConversationCreated={handleLocalConversationCreated}
        />
      </div>
    </div>
  );
}

function HotkeyWindowHomeComposer({
  placeholderText,
  overflowMenu,
  onLocalConversationCreated,
}: {
  placeholderText: string;
  overflowMenu: React.ReactNode;
  onLocalConversationCreated: (conversationId: ConversationId) => void;
}): React.ReactElement {
  return (
    <div className="no-drag relative">
      <Composer
        showWorkspaceDropdownInFooter={false}
        showExternalFooter={false}
        showHotkeyWindowHomeFooterControls
        surfaceClassName={styles.composerSurface}
        placeholderText={placeholderText}
        hotkeyWindowHomeOverflowMenu={overflowMenu}
        onLocalConversationCreated={onLocalConversationCreated}
      />
    </div>
  );
}

function HotkeyWindowTaskMenuRow({
  label,
  control,
}: {
  label: React.ReactNode;
  control: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="shrink-0 text-sm font-medium text-token-foreground">
        {label}
      </div>
      <div className="min-w-0">{control}</div>
    </div>
  );
}
