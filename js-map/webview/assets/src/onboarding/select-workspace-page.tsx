import { useIsFetching } from "@tanstack/react-query";
import clsx from "clsx";
import uniqBy from "lodash/uniqBy";
import { useScope } from "maitai";
import { GlobalStateKey, isCodexWorktree } from "protocol";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";
import { useNavigate } from "react-router";

import { useConversations } from "@/app-server/app-server-manager-hooks";
import { shouldHideSubagentConversation } from "@/app-server/utils/is-subagent-conversation";
import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import type { MergedTask } from "@/header/recent-tasks-menu/use-merge-tasks";
import { useGlobalState } from "@/hooks/use-global-state";
import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import FolderIcon from "@/icons/folder-plus.svg";
import { messageBus, useMessage } from "@/message-bus";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";
import {
  getDeepestGitOrigin,
  type GitOrigin,
} from "@/sidebar/use-repository-task-groups";
import {
  getPathBasename,
  normalizeFsPath,
  stripWindowsVerbatimPathPrefix,
} from "@/utils/path";
import { useFetchFromVSCode, VSCODE_QUERY_KEY_PREFIX } from "@/vscode-api";

import {
  ONBOARDING_CHECKBOX_CLASSNAME,
  OnboardingCheckboxList,
  OnboardingCheckboxListRow,
  OnboardingContentFrame,
  OnboardingShell,
} from "./onboarding-shell";
import {
  getWorkspaceOnboardingSkipProjectName,
  useWorkspaceOnboardingAutoLaunchController,
} from "./workspace-onboarding-controller";
import {
  isWorkspaceOnboardingPlaygroundCtaTreatment,
  type WorkspaceOnboardingExperimentArm,
} from "./workspace-onboarding-experiment";

export function SelectWorkspacePage(): ReactElement {
  const navigate = useNavigate();
  const intl = useIntl();
  const scope = useScope(AppScope);
  const { setData: setSelectedRemoteProjectId } = useGlobalState(
    GlobalStateKey.ACTIVE_REMOTE_PROJECT_ID,
  );
  const { data: conversations = [], isFetching: isFetchingConversations } =
    useConversations();
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const visibleConversations = conversations.filter(
    (conversation) =>
      !shouldHideSubagentConversation(
        conversation,
        isBackgroundSubagentsEnabled,
      ),
  );
  const localTasks = visibleConversations.map((conversation) => ({
    kind: "local" as const,
    key: `local:${conversation.id}`,
    at: conversation.createdAt,
    conversation,
  }));
  const {
    data: workspaceRootOptions,
    isFetching: isFetchingWorkspaceRootOptions,
  } = useFetchFromVSCode("workspace-root-options", {
    placeholderData: { roots: [], labels: {} },
  });
  const taskCwds = getLocalTaskCwds(localTasks);
  const taskCwdDirs = uniqBy(taskCwds, (entry) => normalizeFsPath(entry)).sort(
    (first, second) => first.localeCompare(second),
  );
  const { data: gitOriginsData, isFetching: isFetchingGitOrigins } =
    useFetchFromVSCode("git-origins", {
      params: { dirs: taskCwdDirs },
      placeholderData: (prev) => prev ?? { origins: [], homeDir: "" },
      queryConfig: { enabled: taskCwdDirs.length > 0 },
    });
  const { data: codexHomeData, isFetching: isFetchingCodexHome } =
    useFetchFromVSCode("codex-home");
  const {
    autoLaunchAction: onboardingAutoLaunchAction,
    isRemoteHost,
    setWorkspaceOnboardingAutoLaunchApplied,
    workspaceOnboardingExperimentArm,
  } = useWorkspaceOnboardingAutoLaunchController();
  const [extraRoots, setExtraRoots] = useState<Array<string>>([]);
  const [selectedByRoot, setSelectedByRoot] = useState<Record<string, boolean>>(
    {},
  );
  const [isSkipPending, setIsSkipPending] = useState(false);
  const [skipErrorMessage, setSkipErrorMessage] = useState<string | null>(null);
  const autoLaunchedOnboardingTreatmentRef = useRef(false);
  const unknownSkipErrorMessage = intl.formatMessage({
    id: "electron.onboarding.workspace.skip.error.unknown",
    defaultMessage: "Unknown error",
    description:
      "Fallback error message when onboarding skip fails without details",
  });
  const focusComposerNonceRef = useRef(0);
  const roots = workspaceRootOptions?.roots ?? [];
  const taskOriginRoots = getLocalTaskDeepestOrigins({
    tasks: localTasks,
    gitOrigins: gitOriginsData?.origins,
    codexHome: codexHomeData?.codexHome,
  });
  const availableRoots = uniqBy(
    [...roots, ...taskOriginRoots, ...extraRoots],
    (entry) => normalizeFsPath(entry),
  ).sort((first, second) => first.localeCompare(second));
  const availableOptions = availableRoots.map((root) => {
    const labelOverride = workspaceRootOptions?.labels?.[root]?.trim();
    if (labelOverride) {
      return { root, label: labelOverride };
    }
    const label = getRootLabel(root);
    return { root, label };
  });
  const optionRoots = availableOptions.map((option) => option.root);
  const selectedRoots = optionRoots.filter((root) => !!selectedByRoot[root]);

  const selectAllState =
    optionRoots.length > 0 && selectedRoots.length === optionRoots.length
      ? true
      : selectedRoots.length > 0 && selectedRoots.length < optionRoots.length
        ? "indeterminate"
        : false;

  useMessage("workspace-root-option-picked", (message) => {
    setExtraRoots((prev) =>
      uniqBy([...prev, message.root], (entry) => normalizeFsPath(entry)),
    );
    const nextSelectedByRoot = { ...selectedByRoot, [message.root]: true };
    setSelectedByRoot(nextSelectedByRoot);
    const rootExists = optionRoots.includes(message.root);
    const selectedCount =
      countSelectedRoots(nextSelectedByRoot, optionRoots) +
      (rootExists ? 0 : 1);
    const totalCount = rootExists ? optionRoots.length : optionRoots.length + 1;
    scope.get(productEventLogger$).log({
      eventName: "codex_onboarding_workspace_selection_changed",
      metadata: {
        action: "toggle_root",
        selected_workspaces_count: selectedCount,
        total_workspaces_count: totalCount,
        experiment_arm: workspaceOnboardingExperimentArm,
      },
    });
  });

  useMessage("electron-onboarding-skip-workspace-result", (message) => {
    setIsSkipPending(false);
    if (message.success) {
      const selectedWorkspacesCount = 1;
      scope.get(productEventLogger$).log({
        eventName: "codex_onboarding_workspace_continue_clicked",
        metadata: {
          selected_workspaces_count: selectedWorkspacesCount,
          total_workspaces_count: optionRoots.length,
          auto_navigated: false,
          experiment_arm: workspaceOnboardingExperimentArm,
        },
      });
      scope.get(productEventLogger$).log({
        eventName: "codex_onboarding_completed",
        metadata: {
          selected_workspaces_count: selectedWorkspacesCount,
          experiment_arm: workspaceOnboardingExperimentArm,
        },
      });
      setSkipErrorMessage(null);
      return;
    }
    const errorMessage = message.error ?? unknownSkipErrorMessage;
    setSkipErrorMessage(errorMessage);
  });

  const handleOpenFolder = (): void => {
    setSkipErrorMessage(null);
    scope.get(productEventLogger$).log({
      eventName: "codex_onboarding_workspace_add_clicked",
      metadata: {
        has_existing_workspaces: (workspaceRootOptions?.roots?.length ?? 0) > 0,
        source: "onboarding_modal",
        experiment_arm: workspaceOnboardingExperimentArm,
      },
    });
    messageBus.dispatchMessage("electron-pick-workspace-root-option", {});
  };

  const handleSkip = (): void => {
    if (isSkipPending) {
      return;
    }
    setSkipErrorMessage(null);
    setIsSkipPending(true);
    const projectName = getWorkspaceOnboardingSkipProjectName(
      workspaceOnboardingExperimentArm,
    );
    messageBus.dispatchMessage(
      "electron-onboarding-skip-workspace",
      projectName == null ? {} : { projectName },
    );
  };

  const handleSkipEvent = useEffectEvent(() => {
    handleSkip();
  });

  const handleToggleWorkspace = (root: string, checked: boolean): void => {
    setSkipErrorMessage(null);
    setExtraRoots((prev) =>
      uniqBy([...prev, root], (entry) => normalizeFsPath(entry)),
    );
    const nextSelectedByRoot = { ...selectedByRoot, [root]: checked };
    setSelectedByRoot(nextSelectedByRoot);
    scope.get(productEventLogger$).log({
      eventName: "codex_onboarding_workspace_selection_changed",
      metadata: {
        action: "toggle_root",
        selected_workspaces_count: countSelectedRoots(
          nextSelectedByRoot,
          optionRoots,
        ),
        total_workspaces_count: optionRoots.length,
        experiment_arm: workspaceOnboardingExperimentArm,
      },
    });
  };

  const handleToggleSelectAll = (checked: boolean): void => {
    setSkipErrorMessage(null);
    const nextSelectedByRoot = { ...selectedByRoot };
    for (const root of optionRoots) {
      nextSelectedByRoot[root] = checked;
    }
    setSelectedByRoot(nextSelectedByRoot);
    const selectedCount = countSelectedRoots(nextSelectedByRoot, optionRoots);
    scope.get(productEventLogger$).log({
      eventName: "codex_onboarding_workspace_selection_changed",
      metadata: {
        action: "select_all",
        selected_workspaces_count: selectedCount,
        total_workspaces_count: optionRoots.length,
        experiment_arm: workspaceOnboardingExperimentArm,
      },
    });
  };

  const pathsExistFetchingCount = useIsFetching({
    queryKey: [VSCODE_QUERY_KEY_PREFIX, "paths-exist"],
  });
  const isLoadingRoots =
    isFetchingConversations ||
    isFetchingWorkspaceRootOptions ||
    isFetchingGitOrigins ||
    isFetchingCodexHome ||
    pathsExistFetchingCount > 0;
  const hasAvailableRoots = availableOptions.length > 0;
  const hasSelectedRoots = selectedRoots.length > 0;
  const hasPersistedRoots = (workspaceRootOptions?.roots?.length ?? 0) > 0;
  const hasExistingRoots = hasPersistedRoots || taskOriginRoots.length > 0;
  const shouldShowInitialEmptyLayout =
    !hasExistingRoots && !isLoadingRoots && !hasAvailableRoots;
  const hasAutoNavigatedRef = useRef(false);
  useEffect(() => {
    if (
      autoLaunchedOnboardingTreatmentRef.current ||
      isLoadingRoots ||
      onboardingAutoLaunchAction !== "select_workspace_skip_to_playground"
    ) {
      return;
    }
    autoLaunchedOnboardingTreatmentRef.current = true;
    setWorkspaceOnboardingAutoLaunchApplied(true);
    handleSkipEvent();
  }, [
    isLoadingRoots,
    onboardingAutoLaunchAction,
    setWorkspaceOnboardingAutoLaunchApplied,
  ]);

  const continueWithRoots = useCallback(
    (rootsToSet: Array<string>, autoNavigated: boolean): void => {
      scope.get(productEventLogger$).log({
        eventName: "codex_onboarding_workspace_continue_clicked",
        metadata: {
          selected_workspaces_count: rootsToSet.length,
          total_workspaces_count: optionRoots.length,
          auto_navigated: autoNavigated,
          experiment_arm: workspaceOnboardingExperimentArm,
        },
      });
      scope.get(productEventLogger$).log({
        eventName: "codex_onboarding_completed",
        metadata: {
          selected_workspaces_count: rootsToSet.length,
          experiment_arm: workspaceOnboardingExperimentArm,
        },
      });
      messageBus.dispatchMessage("electron-update-workspace-root-options", {
        roots: rootsToSet,
      });
      focusComposerNonceRef.current += 1;
      void setSelectedRemoteProjectId(undefined);
      messageBus.dispatchMessage("electron-set-active-workspace-root", {
        root: rootsToSet[0],
      });
      void navigate("/", {
        replace: true,
        state: { focusComposerNonce: focusComposerNonceRef.current },
      });
    },
    [
      navigate,
      optionRoots.length,
      scope,
      setSelectedRemoteProjectId,
      workspaceOnboardingExperimentArm,
    ],
  );

  useEffect(() => {
    if (hasExistingRoots) {
      return;
    }
    if (hasAutoNavigatedRef.current) {
      return;
    }
    if (isLoadingRoots) {
      return;
    }
    if (selectedRoots.length === 0) {
      return;
    }
    hasAutoNavigatedRef.current = true;
    continueWithRoots(selectedRoots, true);
  }, [continueWithRoots, hasExistingRoots, isLoadingRoots, selectedRoots]);

  const handleContinue = (): void => {
    setSkipErrorMessage(null);
    continueWithRoots(selectedRoots, false);
  };

  return (
    <OnboardingShell>
      {shouldShowInitialEmptyLayout ? (
        <EmptyState
          workspaceOnboardingExperimentArm={workspaceOnboardingExperimentArm}
          isRemoteHost={isRemoteHost}
          handleOpenFolder={handleOpenFolder}
          handleSkip={handleSkip}
          isSkipPending={isSkipPending}
          skipErrorMessage={skipErrorMessage}
        />
      ) : (
        <ExistingWorkspacesState
          isLoadingRoots={isLoadingRoots}
          hasAvailableRoots={hasAvailableRoots}
          availableOptions={availableOptions}
          selectedRoots={selectedRoots}
          selectAllState={
            selectAllState === "indeterminate" ? false : selectAllState
          }
          handleToggleSelectAll={handleToggleSelectAll}
          handleToggleWorkspace={handleToggleWorkspace}
          intl={intl}
          handleOpenFolder={handleOpenFolder}
          hasSelectedRoots={hasSelectedRoots}
          isRemoteHost={isRemoteHost}
          handleSkip={handleSkip}
          isSkipPending={isSkipPending}
          skipErrorMessage={skipErrorMessage}
          handleContinue={handleContinue}
          workspaceOnboardingExperimentArm={workspaceOnboardingExperimentArm}
        />
      )}
    </OnboardingShell>
  );
}

function SelectWorkspaceLayout({
  children,
  showIcon,
}: {
  children: React.ReactNode;
  showIcon: boolean;
}): ReactElement {
  return (
    <OnboardingContentFrame
      className="max-w-[330px]"
      icon={
        showIcon ? (
          <FolderIcon className="h-10 w-10" aria-hidden="true" />
        ) : null
      }
      textClassName="gap-6"
      title={
        <FormattedMessage
          id="electron.onboarding.workspace.title"
          defaultMessage="Select a project"
          description="Title on the desktop onboarding workspace selection page"
        />
      }
      subtitle={
        <FormattedMessage
          id="electron.onboarding.workspace.subtitle"
          defaultMessage="Codex will be able to edit files and run commands in selected folders."
          description="Subtitle on the desktop onboarding workspace selection page"
        />
      }
    >
      {children}
    </OnboardingContentFrame>
  );
}

function EmptyState({
  workspaceOnboardingExperimentArm,
  isRemoteHost,
  handleOpenFolder,
  handleSkip,
  isSkipPending,
  skipErrorMessage,
}: {
  workspaceOnboardingExperimentArm: WorkspaceOnboardingExperimentArm;
  isRemoteHost: boolean;
  handleOpenFolder: () => void;
  handleSkip: () => void;
  isSkipPending: boolean;
  skipErrorMessage: string | null;
}): ReactElement {
  return (
    <SelectWorkspaceLayout showIcon={true}>
      <div className="flex w-full flex-col gap-3">
        <Button
          className="w-full justify-center py-2.5"
          color={
            isWorkspaceOnboardingPlaygroundCtaTreatment(
              workspaceOnboardingExperimentArm,
            )
              ? "outline"
              : "primary"
          }
          onClick={handleOpenFolder}
        >
          <FormattedMessage
            id="electron.onboarding.workspace.openFolder"
            defaultMessage="Add project"
            description="Button label to add a workspace during desktop onboarding"
          />
        </Button>
        {isRemoteHost ? null : (
          <SkipWorkspaceControls
            handleSkip={handleSkip}
            isSkipPending={isSkipPending}
            skipErrorMessage={skipErrorMessage}
            workspaceOnboardingExperimentArm={workspaceOnboardingExperimentArm}
          />
        )}
      </div>
    </SelectWorkspaceLayout>
  );
}

function ExistingWorkspacesState({
  isLoadingRoots,
  hasAvailableRoots,
  availableOptions,
  selectedRoots,
  selectAllState,
  handleToggleSelectAll,
  handleToggleWorkspace,
  intl,
  handleOpenFolder,
  handleContinue,
  hasSelectedRoots,
  isRemoteHost,
  handleSkip,
  isSkipPending,
  skipErrorMessage,
  workspaceOnboardingExperimentArm,
}: {
  isLoadingRoots: boolean;
  hasAvailableRoots: boolean;
  availableOptions: Array<{ root: string; label: string }>;
  selectedRoots: Array<string>;
  selectAllState: boolean;
  handleToggleSelectAll: (checked: boolean) => void;
  handleToggleWorkspace: (root: string, checked: boolean) => void;
  intl: IntlShape;
  handleOpenFolder: () => void;
  handleContinue: () => void;
  hasSelectedRoots: boolean;
  isRemoteHost: boolean;
  handleSkip: () => void;
  isSkipPending: boolean;
  skipErrorMessage: string | null;
  workspaceOnboardingExperimentArm: WorkspaceOnboardingExperimentArm;
}): ReactElement {
  const selectAllId = "workspace-root-select-all";
  const selectedRootSet = new Set(selectedRoots);

  return (
    <SelectWorkspaceLayout showIcon={false}>
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-2">
          {isLoadingRoots ? (
            <div className="bg-token-surface-primary flex w-full items-center justify-center gap-2 rounded-2xl border border-token-border px-5 py-6">
              <Spinner className="h-4 w-4 text-token-foreground" />
              <span className="text-sm text-token-description-foreground">
                <FormattedMessage
                  id="electron.onboarding.workspace.loading"
                  defaultMessage="Loading projects…"
                  description="Loading state while onboarding workspace options are fetched"
                />
              </span>
            </div>
          ) : null}
          {hasAvailableRoots ? (
            <OnboardingCheckboxList
              className={clsx(
                isLoadingRoots && "pointer-events-none opacity-50",
              )}
              ariaLabel={intl.formatMessage({
                id: "electron.onboarding.workspace.listLabel",
                defaultMessage: "Available projects",
                description:
                  "Aria label for the available workspaces list during onboarding",
              })}
            >
              <OnboardingCheckboxListRow
                checkboxId={selectAllId}
                checkboxClassName={ONBOARDING_CHECKBOX_CLASSNAME}
                checked={selectAllState}
                disabled={isLoadingRoots}
                onCheckedChange={(checked) => {
                  handleToggleSelectAll(checked);
                }}
                label={
                  <FormattedMessage
                    id="electron.onboarding.workspace.selectAll"
                    defaultMessage="Select all"
                    description="Checkbox label for selecting all workspaces during onboarding"
                  />
                }
              />
              {availableOptions.map((option, index) => (
                <WorkspaceRootOptionRow
                  key={option.root}
                  index={index}
                  isDisabled={isLoadingRoots}
                  isSelected={selectedRootSet.has(option.root)}
                  skipExistenceCheck={isRemoteHost}
                  option={option}
                  onToggle={handleToggleWorkspace}
                />
              ))}
            </OnboardingCheckboxList>
          ) : (
            <div className="text-center text-sm text-token-description-foreground">
              <FormattedMessage
                id="electron.onboarding.workspace.empty"
                defaultMessage="Add a project to continue."
                description="Empty state shown when no workspaces are selected during onboarding"
              />
            </div>
          )}
        </div>
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full items-center gap-4">
            <Button
              className="flex-1 justify-center border-token-button-border bg-transparent text-[13px] leading-6 font-medium whitespace-nowrap enabled:hover:bg-token-foreground/5"
              color="outline"
              size="large"
              onClick={handleOpenFolder}
            >
              <FormattedMessage
                id="electron.onboarding.workspace.openFolder"
                defaultMessage="Add project"
                description="Button label to add a workspace during desktop onboarding"
              />
            </Button>
            <Button
              className="flex-1 justify-center text-[13px] leading-6 font-medium"
              color="primary"
              size="large"
              disabled={!hasSelectedRoots || isLoadingRoots}
              onClick={handleContinue}
            >
              <FormattedMessage
                id="electron.onboarding.workspace.continue"
                defaultMessage="Continue"
                description="Button label to continue after selecting workspaces during onboarding"
              />
            </Button>
          </div>
          {isRemoteHost ? null : (
            <SkipWorkspaceControls
              handleSkip={handleSkip}
              isSkipPending={isSkipPending}
              skipErrorMessage={skipErrorMessage}
              workspaceOnboardingExperimentArm={
                workspaceOnboardingExperimentArm
              }
            />
          )}
        </div>
      </div>
    </SelectWorkspaceLayout>
  );
}

function SkipWorkspaceControls({
  handleSkip,
  isSkipPending,
  skipErrorMessage,
  workspaceOnboardingExperimentArm,
}: {
  handleSkip: () => void;
  isSkipPending: boolean;
  skipErrorMessage: string | null;
  workspaceOnboardingExperimentArm: WorkspaceOnboardingExperimentArm;
}): ReactElement {
  const isTreatment4 = isWorkspaceOnboardingPlaygroundCtaTreatment(
    workspaceOnboardingExperimentArm,
  );
  return (
    <div className="flex w-full flex-col items-center gap-2">
      {skipErrorMessage != null ? (
        <div className="text-center text-sm text-token-error-foreground">
          <FormattedMessage
            id="electron.onboarding.workspace.skip.error"
            defaultMessage="Couldn't create a new project: {message}"
            description="Error shown when creating a new project fails during onboarding"
            values={{ message: skipErrorMessage }}
          />
        </div>
      ) : null}
      <Button
        className="w-full justify-center text-[13px] leading-6 font-medium"
        color="ghost"
        size="large"
        disabled={isSkipPending}
        onClick={handleSkip}
      >
        {isSkipPending ? (
          isTreatment4 ? (
            <FormattedMessage
              id="electron.onboarding.workspace.skipping.playground"
              defaultMessage="Opening playground…"
              description="Button label shown while opening Playground during onboarding workspace flow"
            />
          ) : (
            <FormattedMessage
              id="electron.onboarding.workspace.skipping"
              defaultMessage="Creating a new project…"
              description="Button label shown while creating a new project during onboarding"
            />
          )
        ) : isTreatment4 ? (
          <FormattedMessage
            id="electron.onboarding.workspace.skip.playground"
            defaultMessage="Continue to playground"
            description="Button label to continue to Playground during onboarding"
          />
        ) : (
          <FormattedMessage
            id="electron.onboarding.workspace.skip"
            defaultMessage="Skip"
            description="Button label to skip workspace selection during onboarding"
          />
        )}
      </Button>
    </div>
  );
}

function WorkspaceRootOptionRow({
  index,
  isDisabled,
  isSelected,
  skipExistenceCheck,
  option,
  onToggle,
}: {
  index: number;
  isDisabled: boolean;
  isSelected: boolean;
  skipExistenceCheck: boolean;
  option: { root: string; label: string };
  onToggle: (root: string, checked: boolean) => void;
}): ReactElement | null {
  const root = option.root;
  const displayRoot = stripWindowsVerbatimPathPrefix(root);
  const normalizedRoot = normalizeFsPath(root).replace(/\/+$/, "");
  const { data } = useFetchFromVSCode("paths-exist", {
    params: { paths: [root] },
    placeholderData: { existingPaths: [root] },
    queryConfig: { enabled: !skipExistenceCheck },
  });
  const exists =
    skipExistenceCheck ||
    (data?.existingPaths ?? []).some(
      (candidate) =>
        normalizeFsPath(candidate).replace(/\/+$/, "") === normalizedRoot,
    );
  if (!exists) {
    return null;
  }
  const checkboxId = `workspace-root-${index}`;
  return (
    <OnboardingCheckboxListRow
      checkboxId={checkboxId}
      checkboxClassName={ONBOARDING_CHECKBOX_CLASSNAME}
      checked={isSelected}
      disabled={isDisabled}
      onCheckedChange={(checked) => {
        onToggle(root, checked);
      }}
      label={option.label}
      description={displayRoot}
    />
  );
}

function countSelectedRoots(
  selectedByRoot: Record<string, boolean>,
  roots: Array<string>,
): number {
  let count = 0;
  for (const root of roots) {
    if (selectedByRoot[root]) {
      count += 1;
    }
  }
  return count;
}

function getLocalTaskCwds(tasks: Array<MergedTask> | null): Array<string> {
  const cwds: Array<string> = [];
  (tasks ?? []).forEach((task) => {
    switch (task.kind) {
      case "local": {
        const cwd = task.conversation.cwd;
        if (cwd) {
          cwds.push(cwd);
        }
        return;
      }
      case "pending-worktree": {
        const cwd =
          task.pendingWorktree.startConversationParamsInput?.cwd ??
          task.pendingWorktree.sourceWorkspaceRoot;
        if (cwd) {
          cwds.push(cwd);
        }
        return;
      }
      case "remote":
        return;
    }
  });
  return cwds;
}

function getLocalTaskDeepestOrigins({
  tasks,
  gitOrigins,
  codexHome,
}: {
  tasks: Array<MergedTask> | null;
  gitOrigins: GitOrigin | undefined;
  codexHome?: string;
}): Array<string> {
  const cwds = getLocalTaskCwds(tasks);
  if (cwds.length === 0) {
    return [];
  }
  const origins = gitOrigins ?? [];
  const roots = cwds
    .map((cwd) => {
      const origin = getDeepestGitOrigin(cwd, origins);
      if (!origin?.root) {
        return cwd;
      }
      if (!isCodexWorktree(origin.root, codexHome)) {
        return cwd;
      }
      const mappedClone = origins.reduce<string | null>(
        (deepest, candidate) => {
          if (!origin.originUrl || candidate.originUrl !== origin.originUrl) {
            return deepest;
          }
          if (isCodexWorktree(candidate.root, codexHome)) {
            return deepest;
          }
          if (!deepest) {
            return candidate.root;
          }
          return candidate.root.length > deepest.length
            ? candidate.root
            : deepest;
        },
        null,
      );
      return mappedClone ?? origin.root;
    })
    .filter((root): root is string => Boolean(root));

  return uniqBy(roots, (root) => normalizeFsPath(root).replace(/\/+$/, ""));
}

function getRootLabel(root: string): string {
  return getPathBasename(root);
}
