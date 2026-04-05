import type { RateLimitSnapshot } from "app-server-types/v2";
import clsx from "clsx";
import { useCommandState } from "cmdk";
import { useAtom, useSetAtom } from "jotai";
import uniqBy from "lodash/uniqBy";
import { useScope } from "maitai";
import {
  CODEX_HOME_URL,
  isCodexWorktree,
  type CodeEnvironment,
  type ConversationId,
} from "protocol";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { useCodexCloudAccess } from "@/auth/use-codex-cloud-access";
import { useEnvironments, useWorkspaceEnvironments } from "@/codex-api";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Spinner } from "@/components/spinner";
import { Tooltip } from "@/components/tooltip";
import { WithWindow } from "@/components/with-window";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useGitSubmodulePaths } from "@/git-rpc/use-git-submodule-paths";
import { useWebviewExecutionTarget } from "@/hooks/use-webview-execution-target";
import { useWindowType } from "@/hooks/use-window-type";
import CheckMdIcon from "@/icons/check-md.svg";
import ChevronIcon from "@/icons/chevron.svg";
import CloudOff from "@/icons/cloud-off.svg";
import CloudIcon from "@/icons/cloud.svg";
import CodexIcon from "@/icons/codex.svg";
import DockIcon from "@/icons/dock.svg";
import ExclamationMarkCircleIcon from "@/icons/exclamation-mark-circle.svg";
import GlobeIcon from "@/icons/globe.svg";
import LinkExternalIcon from "@/icons/link-external.svg";
import MacbookIcon from "@/icons/macbook.svg";
import PlusIcon from "@/icons/plus.svg";
import WorktreeIcon from "@/icons/worktree.svg";
import { productEventLogger$ } from "@/product-event-signal";
import { useRateLimit } from "@/queries/usage-queries";
import { AppScope } from "@/scopes/app-scope";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import { useGate } from "@/statsig/statsig";
import { aEnvironmentAtom } from "@/utils/use-environment";
import {
  filterRateLimitEntries,
  getRateLimitEntries,
  getRateLimitName,
  shouldSuppressRateLimitUpsell,
  toMcpRateLimitSnapshot,
} from "@/utils/use-rate-limit";
import { useFetchFromVSCode } from "@/vscode-api";
import { FetchError } from "@/web-fetch-wrapper";

import { getRateLimitAlertData } from "../rate-limits/rate-limit-format";
import { RateLimitSummary } from "../rate-limits/rate-limit-summary";
import type { ComposerMode } from "./composer";
import { aLastUsedContinueInMode } from "./composer-view-state";
import {
  EnvironmentSelector,
  EnvironmentSelectorDropdownItem,
} from "./environment-selector";
import { useProvideSlashCommand } from "./slash-commands/slash-command";
import { SlashCommandItem } from "./slash-commands/slash-command-item";
import { useCollaborationMode } from "./use-collaboration-mode";

import "prosemirror-view/style/prosemirror.css";

export function LocalRemoteDropdown({
  composerMode,
  setComposerMode,
  conversationId,
  footerRemoteState,
  allowWorktree = false,
  disabled = false,
  worktreeLabelOnly = false,
  modeAdjacentControl,
  secondaryControls,
}: {
  composerMode: ComposerMode;
  setComposerMode: (mode: ComposerMode) => void;
  conversationId: ConversationId | null;
  footerRemoteState: {
    isAttachedToStartedTask: boolean;
    existingRemoteThreadState: {
      hostId: string;
      connectionDisplayName: string | null;
      projectPath: string | null;
    };
    draftNewThreadRemoteSelectionState: {
      hostId: string | null;
      connectionDisplayName: string | null;
      projectPath: string | null;
    };
  };
  allowWorktree?: boolean;
  disabled?: boolean;
  worktreeLabelOnly?: boolean;
  modeAdjacentControl?: React.ReactNode;
  secondaryControls?: React.ReactNode;
}): React.ReactElement {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const isWorktreePickerEnabled = useGate(__statsigName("codex_app_worktrees"));
  const { access: codexCloudAccess, refetch: refetchCodexCloudAccess } =
    useCodexCloudAccess();
  const { activeMode: activeCollaborationMode } =
    useCollaborationMode(conversationId);
  const currentLocalModeRemoteState =
    getCurrentLocalModeRemoteState(footerRemoteState);
  const isLocalModeRemote = currentLocalModeRemoteState != null;
  const windowType = useWindowType();
  const selectedModel = activeCollaborationMode?.settings.model ?? null;
  const executionTarget = useWebviewExecutionTarget(conversationId);
  const { data: gitMetadata, isLoading: isGitMetadataLoading } =
    useGitStableMetadata(executionTarget.cwd, executionTarget.hostConfig);
  const hasGitRepo = gitMetadata?.root != null;
  const gitRoot = gitMetadata?.root ?? null;

  const { data: codexHomeResp } = useFetchFromVSCode("codex-home");
  const { data: currentBranch } = useGitCurrentBranch(
    gitRoot,
    executionTarget.hostConfig,
  );
  const { data: submodulePaths } = useGitSubmodulePaths(
    gitRoot,
    executionTarget.hostConfig,
  );
  const hasSubmodules = (submodulePaths?.length ?? 0) > 0;
  const codexWorktree = isCodexWorktree(
    isLocalModeRemote ? null : executionTarget.activeWorkspaceRoot,
    codexHomeResp?.codexHome,
  );
  const canUseCloud = hasGitRepo && codexCloudAccess === "enabled";
  const currentBranchName =
    currentBranch ?? intl.formatMessage(messages.fallbackBranch);
  const showWorktree = hasGitRepo && allowWorktree && isWorktreePickerEnabled;
  const rateLimitPayload = useRateLimit().data ?? null;
  const rateLimit = toMcpRateLimitSnapshot(
    rateLimitPayload?.rate_limit,
    rateLimitPayload?.credits,
    rateLimitPayload?.plan_type,
  );
  const rateLimitEntries = getRateLimitEntries(rateLimitPayload);
  const rateLimitName = getRateLimitName(rateLimitPayload);
  const filteredRateLimitEntries = filterRateLimitEntries(rateLimitEntries, {
    activeLimitName: rateLimitName,
    selectedModel,
  });
  const activeRateLimitLabel =
    filteredRateLimitEntries.find((entry) => entry.limitName != null)
      ?.limitName ??
    rateLimitName ??
    null;
  const suppressRateLimitUpsell = shouldSuppressRateLimitUpsell(
    rateLimitPayload,
    { activeLimitName: rateLimitName, selectedModel },
  );
  const showRateLimit =
    filteredRateLimitEntries.some(
      (entry) =>
        !!entry.snapshot?.primary?.windowDurationMins ||
        !!entry.snapshot?.secondary?.windowDurationMins,
    ) ||
    !!rateLimit?.primary?.windowDurationMins ||
    !!rateLimit?.secondary?.windowDurationMins;
  const [open, setOpen] = useState(false);
  const [environmentDropdownOpen, setEnvironmentDropdownOpen] = useState(false);
  const [environmentSelectorOpen, setEnvironmentSelectorOpen] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] =
    useAtom(aEnvironmentAtom);
  const setLastUsedContinueInMode = useSetAtom(aLastUsedContinueInMode);

  const [envQuery, setEnvQuery] = useState("");
  const deferredEnvQuery = useDeferredValue(envQuery);

  const { data: workspaceEnvironments, refetch: refetchWorkspaceEnvironments } =
    useWorkspaceEnvironments({ enabled: canUseCloud });

  const {
    data: allEnvironments,
    isLoading: isLoadingAllEnvironments,
    error: errorLoadingAllEnvironments,
  } = useEnvironments({ enabled: canUseCloud });

  const isWorktreeSnapshotsEnabled = useGate(
    __statsigName("codex_worktree_snapshots"),
  );
  const selectedEnvId = selectedEnvironment?.id;
  const availableEnvironments = useMemo(
    () =>
      uniqBy(
        [...(workspaceEnvironments ?? []), ...(allEnvironments ?? [])],
        (environment) => environment.id,
      ),
    [workspaceEnvironments, allEnvironments],
  );
  const selectedAvailableEnvironment =
    selectedEnvironment != null
      ? (availableEnvironments.find(
          (env) => env.id === selectedEnvironment.id,
        ) ?? null)
      : null;
  const zeroEnvironments =
    isWorktreeSnapshotsEnabled && availableEnvironments.length === 0;
  const defaultCloudLabel =
    selectedAvailableEnvironment || zeroEnvironments ? (
      <FormattedMessage {...messages.runInCloud} />
    ) : (
      <FormattedMessage
        id="composer.mode.remote.selectEnvironment"
        defaultMessage="Select environment"
        description="Remote mode label when no environment is selected"
      />
    );
  const cloudLabel = selectedAvailableEnvironment ? (
    <FormattedMessage
      id="composer.mode.runInCloudWithEnvironment"
      defaultMessage="Cloud · {environment}"
      description="Remote mode label when a Codex task will be run in the cloud with a selected environment"
      values={{ environment: selectedAvailableEnvironment.label }}
    />
  ) : (
    defaultCloudLabel
  );
  const [listToShow, errorToShow] = useMemo(() => {
    const ws = workspaceEnvironments ?? [];
    const workspaceIds = new Set(ws.map((env) => env.id));

    // Sort order:
    // 1) Workspace environments first
    // 2) Then pinned
    // 3) Then by task_count (desc)
    // 4) Then alphabetical by label
    const sortEnvs = (list: Array<CodeEnvironment>): Array<CodeEnvironment> =>
      list.sort((a, b) => {
        if (a.id === selectedEnvId) {
          return -1;
        } else if (b.id === selectedEnvId) {
          return 1;
        }
        // Did this env match a workspace env?
        const aWs = workspaceIds.has(a.id);
        const bWs = workspaceIds.has(b.id);
        if (aWs !== bWs) {
          return aWs ? -1 : 1;
        }
        const aPinned = !!a.is_pinned;
        const bPinned = !!b.is_pinned;
        if (aPinned !== bPinned) {
          return aPinned ? -1 : 1;
        }
        const aTasks = a.task_count ?? 0;
        const bTasks = b.task_count ?? 0;
        if (aTasks !== bTasks) {
          return bTasks - aTasks;
        }
        return (a.label ?? "").localeCompare(b.label ?? "");
      });

    const q = deferredEnvQuery.trim();
    if (q.length > 0) {
      const normalizedQuery = q.toLowerCase();
      const filtered = availableEnvironments.filter((env) =>
        env.label?.toLowerCase().includes(normalizedQuery),
      );
      return [sortEnvs(filtered), errorLoadingAllEnvironments] as const;
    }
    return [
      sortEnvs([...availableEnvironments]),
      errorLoadingAllEnvironments,
    ] as const;
  }, [
    selectedEnvId,
    workspaceEnvironments,
    availableEnvironments,
    deferredEnvQuery,
    errorLoadingAllEnvironments,
  ]);

  const shouldRefreshCloudData =
    hasGitRepo && (open || environmentDropdownOpen);
  useEffect(() => {
    if (!shouldRefreshCloudData) {
      return;
    }

    if (
      canUseCloud &&
      !workspaceEnvironments?.length &&
      !isLoadingAllEnvironments
    ) {
      void refetchWorkspaceEnvironments();
    }

    if (
      codexCloudAccess !== "enabled" &&
      codexCloudAccess !== "loading" &&
      !isLoadingAllEnvironments
    ) {
      void refetchCodexCloudAccess();
    }
  }, [
    shouldRefreshCloudData,
    codexCloudAccess,
    workspaceEnvironments?.length,
    isLoadingAllEnvironments,
    refetchWorkspaceEnvironments,
    refetchCodexCloudAccess,
    canUseCloud,
  ]);

  useEffect(() => {
    if (selectedAvailableEnvironment != null) {
      return;
    }
    setSelectedEnvironment(availableEnvironments[0] ?? null);
  }, [
    availableEnvironments,
    selectedAvailableEnvironment,
    setSelectedEnvironment,
  ]);

  useEffect(() => {
    const fallbackComposerMode = getFallbackComposerMode({
      composerMode,
      hasGitRepo,
      isGitMetadataLoading,
      showWorktree,
    });

    if (fallbackComposerMode == null) {
      return;
    }

    setComposerMode(fallbackComposerMode);
  }, [
    composerMode,
    hasGitRepo,
    isGitMetadataLoading,
    setComposerMode,
    showWorktree,
  ]);

  const isError404 =
    errorToShow instanceof FetchError && errorToShow.status === 404;

  const envListState = listToShow?.length
    ? "list"
    : isLoadingAllEnvironments
      ? "loading"
      : !!errorToShow && !isError404
        ? "error"
        : envQuery.length
          ? "none-found"
          : "empty";

  const remoteLabel = intl.formatMessage({
    id: "composer.mode.remote",
    defaultMessage: "Remote",
    description: "Remote mode label",
  });
  const localModeTooltipText = isLocalModeRemote
    ? intl.formatMessage(messages.workRemotelyTooltipWithoutPath, {
        hostDisplayName:
          currentLocalModeRemoteState?.connectionDisplayName ?? remoteLabel,
      })
    : intl.formatMessage(messages.workLocallyTooltip, {
        branchName: currentBranchName,
      });
  const LocalModeIcon = isLocalModeRemote ? GlobeIcon : MacbookIcon;
  const localModeTitle = isLocalModeRemote
    ? intl.formatMessage(messages.startInRemote)
    : intl.formatMessage(messages.workLocally);
  const worktreeModeMessage = isLocalModeRemote
    ? messages.remoteWorktreeMode
    : messages.worktreeMode;
  const worktreeTooltipText = isLocalModeRemote
    ? intl.formatMessage(messages.remoteWorktreeTooltip)
    : intl.formatMessage(messages.worktreeTooltip);

  useProvideSlashCommand({
    id: "local",
    title: localModeTitle,
    requiresEmptyComposer: false,
    Icon: LocalModeIcon,
    enabled: composerMode !== "local",
    onSelect: useCallback(async () => {
      setComposerMode("local");
    }, [setComposerMode]),
  });

  useProvideSlashCommand({
    id: "worktree",
    title: intl.formatMessage(worktreeModeMessage),
    requiresEmptyComposer: false,
    Icon: WorktreeIcon,
    enabled: showWorktree && composerMode !== "worktree",
    onSelect: useCallback(async () => {
      setComposerMode("worktree");
    }, [setComposerMode]),
  });

  useProvideSlashCommand({
    id: "cloud",
    title: intl.formatMessage(messages.runInCloud),
    requiresEmptyComposer: false,
    Icon: CloudIcon,
    enabled: canUseCloud && composerMode !== "cloud",
    onSelect: useCallback(async () => {
      setComposerMode("cloud");
    }, [setComposerMode]),
  });

  // Closure that lets us have a stable component that can capture inner content.
  const CloudEnvContent = useMemo(() => {
    function CloudEnvContentComp({
      onClose,
    }: {
      onClose: () => void;
    }): React.ReactElement {
      const search = useCommandState((s) => s.search);
      const filteredList = listToShow
        ?.filter((env) =>
          env.label?.toLowerCase().includes(search?.toLowerCase() ?? ""),
        )
        // Slice the list for the component for performance reasons.
        // Searching will still be done against the full list.
        ?.slice(0, 100);

      return (
        <>
          {filteredList?.map((env) => (
            <SlashCommandItem
              key={env.id}
              value={env.label ?? ""}
              title={env.label ?? ""}
              onSelect={() => {
                setComposerMode("cloud");
                setSelectedEnvironment(env);
                onClose();
              }}
              RightIcon={
                env.id === selectedEnvironment?.id ? CheckMdIcon : undefined
              }
            />
          ))}
        </>
      );
    }
    return CloudEnvContentComp;
  }, [
    setComposerMode,
    selectedEnvironment,
    setSelectedEnvironment,
    listToShow,
  ]);

  useProvideSlashCommand({
    id: "cloud-environment",
    title: intl.formatMessage(messages.cloudEnvironmentTitle),
    description: selectedEnvironment?.label ?? undefined,
    requiresEmptyComposer: false,
    Icon: DockIcon,
    enabled: canUseCloud && composerMode === "cloud",
    Content: CloudEnvContent,
    dependencies: [listToShow, selectedEnvironment?.id],
  });

  // https://git-scm.com/docs/git-worktree#_bugs
  const shouldShowWorktreeSubmoduleWarning =
    hasSubmodules && composerMode === "worktree";

  const worktreeSubmoduleWarningIcon = shouldShowWorktreeSubmoduleWarning ? (
    <Tooltip
      tooltipContent={
        <FormattedMessage {...messages.worktreeSubmoduleWarning} />
      }
    >
      <span className="flex items-center">
        <ExclamationMarkCircleIcon className="icon-2xs text-token-editor-warning-foreground" />
      </span>
    </Tooltip>
  ) : null;

  const worktreeSegmentLabel = (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="truncate">
        <FormattedMessage {...messages.worktreeSegment} />
      </span>
      {worktreeSubmoduleWarningIcon}
    </span>
  );

  const handleEnvironmentDropdownOpenChange = (isOpen: boolean): void => {
    setEnvironmentDropdownOpen(isOpen);
    if (!isOpen) {
      setEnvironmentSelectorOpen(false);
    }
  };
  const openEnvironmentSelector = (): void => {
    setEnvironmentSelectorOpen(true);
  };

  const modeTriggerContent = (
    <Button size="composerSm" color="ghost">
      {composerMode === "cloud" ? (
        <CloudIcon className="icon-2xs" />
      ) : composerMode === "worktree" ? (
        <WorktreeIcon className="icon-2xs" />
      ) : isLocalModeRemote ? (
        <GlobeIcon className="icon-2xs" />
      ) : codexWorktree ? (
        <WorktreeIcon className="icon-2xs" />
      ) : (
        <MacbookIcon className="icon-2xs" />
      )}
      <span className="composer-footer__label--xs max-w-40 truncate">
        {composerMode === "cloud" ? (
          <>
            <WithWindow electron>{defaultCloudLabel}</WithWindow>
            <WithWindow extension browser>
              {cloudLabel}
            </WithWindow>
          </>
        ) : composerMode === "worktree" ? (
          <span className="inline-flex items-center gap-1">
            <FormattedMessage {...worktreeModeMessage} />
            {worktreeSubmoduleWarningIcon}
          </span>
        ) : (
          <LocalModeLabel
            rateLimit={rateLimit}
            isRemoteHost={isLocalModeRemote}
          />
        )}
      </span>
      <ChevronIcon className="icon-2xs text-token-input-placeholder-foreground" />
    </Button>
  );

  const renderModeDropdown = (): React.ReactElement => (
    <BasicDropdown
      side="top"
      disabled={disabled}
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          setEnvironmentSelectorOpen(false);
        }
      }}
      triggerButton={
        <Tooltip
          tooltipContent={
            <FormattedMessage
              id="composer.mode.localRemoteWhereRun"
              defaultMessage="Select where to run the task"
              description="Tooltip content for local/remote dropdown"
            />
          }
        >
          {modeTriggerContent}
        </Tooltip>
      }
    >
      {environmentSelectorOpen ? (
        <EnvironmentSelector
          selectedEnvironment={selectedEnvironment}
          envQuery={envQuery}
          setEnvQuery={setEnvQuery}
          envListState={envListState}
          listToShow={listToShow}
          setComposerMode={setComposerMode}
          setSelectedEnvironment={(env) => setSelectedEnvironment(env)}
          setOpen={setEnvironmentSelectorOpen}
          onClosePanel={() => setEnvironmentSelectorOpen(false)}
        />
      ) : (
        <div
          className={clsx(
            "flex flex-col",
            codexCloudAccess === "enabled" ? "min-w-[175px]" : "w-52",
          )}
        >
          <Dropdown.Title>
            <FormattedMessage
              id="composer.mode.newTask.header"
              defaultMessage="Continue in"
              description="Header label above agent mode options"
            />
          </Dropdown.Title>

          <Dropdown.Item
            LeftIcon={LocalModeIcon}
            RightIcon={composerMode === "local" ? CheckMdIcon : undefined}
            onClick={() => {
              if (composerMode !== "local") {
                scope.get(productEventLogger$).log({
                  eventName: "codex_composer_runtime_changed",
                  metadata: { mode: "local" },
                });
              }
              setLastUsedContinueInMode("local");
              setComposerMode("local");
              setOpen(false);
            }}
            tooltipText={localModeTooltipText}
          >
            {isLocalModeRemote ? (
              <FormattedMessage {...messages.startInRemote} />
            ) : (
              <FormattedMessage {...messages.workLocally} />
            )}
          </Dropdown.Item>

          {showWorktree && (
            <Dropdown.Item
              LeftIcon={WorktreeIcon}
              RightIcon={composerMode === "worktree" ? CheckMdIcon : undefined}
              onClick={() => {
                if (composerMode !== "worktree") {
                  scope.get(productEventLogger$).log({
                    eventName: "codex_composer_runtime_changed",
                    metadata: { mode: "worktree" },
                  });
                }
                setLastUsedContinueInMode("worktree");
                setComposerMode("worktree");
                setOpen(false);
              }}
              tooltipText={worktreeTooltipText}
            >
              <span className="inline-flex items-center gap-1">
                <FormattedMessage {...worktreeModeMessage} />
                {worktreeSubmoduleWarningIcon}
              </span>
            </Dropdown.Item>
          )}

          {hasGitRepo ? (
            codexCloudAccess === "enabled" ? (
              <Dropdown.Item
                LeftIcon={CloudIcon}
                RightIcon={composerMode === "cloud" ? CheckMdIcon : undefined}
                onClick={() => {
                  if (composerMode !== "cloud") {
                    scope.get(productEventLogger$).log({
                      eventName: "codex_composer_runtime_changed",
                      metadata: { mode: "cloud" },
                    });
                  }
                  setLastUsedContinueInMode("cloud");
                  setComposerMode("cloud");
                }}
                tooltipText={intl.formatMessage({
                  id: "composer.mode.cloud.tooltip",
                  defaultMessage: "Work in a cloud environment",
                  description: "Tooltip content for cloud mode dropdown item",
                })}
              >
                <FormattedMessage {...messages.runInCloud} />
              </Dropdown.Item>
            ) : (
              <>
                <Dropdown.Item
                  LeftIcon={CodexIcon}
                  RightIcon={LinkExternalIcon}
                  href={CODEX_HOME_URL}
                >
                  <FormattedMessage
                    id="composer.mode.remote.connectToCloud"
                    defaultMessage="Connect Codex web"
                    description="Menu item to connect Codex Cloud"
                  />
                </Dropdown.Item>
                <Dropdown.Item
                  LeftIcon={CloudOff}
                  className="cursor-not-allowed"
                  disabled
                  tooltipText={intl.formatMessage({
                    id: "composer.mode.remote.connectToCloudDisabledTooltip",
                    defaultMessage:
                      "Set up an environment via Codex web to enable sending tasks to the cloud",
                    description:
                      "Tooltip for disabled send to cloud item when Cloud is not connected",
                  })}
                >
                  <span className="truncate">
                    <FormattedMessage
                      id="composer.mode.remote.sendToCloud"
                      defaultMessage="Send to cloud"
                      description="Disabled label when Codex Cloud is not connected"
                    />
                  </span>
                </Dropdown.Item>
              </>
            )
          ) : null}

          <WithWindow extension browser>
            {canUseCloud && (
              <EnvironmentSelectorDropdownItem
                selectedEnvironment={selectedEnvironment}
                zeroEnvironments={zeroEnvironments}
                onClick={openEnvironmentSelector}
              />
            )}

            <div className="mx-1 my-1.5 h-[0.5px] bg-token-foreground/10" />

            {showRateLimit && (
              <RateLimitSummary
                rateLimits={filteredRateLimitEntries}
                activeLimitName={activeRateLimitLabel}
                suppressUpsell={suppressRateLimitUpsell}
                selectedModel={selectedModel}
              />
            )}
          </WithWindow>

          {windowType === "electron" && showRateLimit && (
            <>
              <div className="mx-1 my-1.5 h-[0.5px] bg-token-foreground/10" />
              <RateLimitSummary
                rateLimits={filteredRateLimitEntries}
                activeLimitName={activeRateLimitLabel}
                suppressUpsell={suppressRateLimitUpsell}
                selectedModel={selectedModel}
              />
            </>
          )}
        </div>
      )}
    </BasicDropdown>
  );

  const showEnvironmentDropdown = composerMode === "cloud" && canUseCloud;
  const environmentDropdown = showEnvironmentDropdown ? (
    <BasicDropdown
      contentMaxHeight="list"
      side="top"
      open={environmentDropdownOpen}
      onOpenChange={handleEnvironmentDropdownOpenChange}
      disabled={disabled}
      triggerButton={
        <Tooltip
          tooltipContent={
            <FormattedMessage
              id="composer.environmentSelector.tooltip"
              defaultMessage="Select a cloud environment"
              description="Tooltip content for environment selector"
            />
          }
        >
          <Button
            className="whitespace-nowrap"
            size="composerSm"
            color="ghost"
            disabled={disabled}
          >
            <DockIcon className="icon-2xs" />
            <span className="composer-footer__label--sm max-w-40 truncate">
              {selectedEnvironment ? (
                selectedEnvironment.label
              ) : (
                <FormattedMessage
                  id="composer.mode.remote.selectEnvironment"
                  defaultMessage="Select environment"
                  description="Remote mode label when no environment is selected"
                />
              )}
            </span>
            <ChevronIcon className="icon-2xs text-token-input-placeholder-foreground" />
          </Button>
        </Tooltip>
      }
    >
      {environmentSelectorOpen ? (
        <EnvironmentSelector
          selectedEnvironment={selectedEnvironment}
          envQuery={envQuery}
          setEnvQuery={setEnvQuery}
          envListState={envListState}
          listToShow={listToShow}
          setComposerMode={setComposerMode}
          setSelectedEnvironment={(env) => setSelectedEnvironment(env)}
          setOpen={setEnvironmentSelectorOpen}
          onClosePanel={() => setEnvironmentSelectorOpen(false)}
        />
      ) : (
        <div className="flex w-64 flex-col">
          <Dropdown.Title>
            <FormattedMessage
              id="composer.environmentSelector.title"
              defaultMessage="Select environment"
              description="Title for the cloud environment dropdown"
            />
          </Dropdown.Title>
          <EnvironmentDropdownContent
            envQuery={envQuery}
            setEnvQuery={setEnvQuery}
            envListState={envListState}
            listToShow={listToShow}
            selectedEnvironment={selectedEnvironment}
            zeroEnvironments={zeroEnvironments}
            onSelectEnvironment={(env) => {
              setComposerMode("cloud");
              setSelectedEnvironment(env);
            }}
            onClose={() => setEnvironmentDropdownOpen(false)}
          />
        </div>
      )}
    </BasicDropdown>
  ) : null;
  const hasSecondaryControls = secondaryControls != null;
  const inlineSecondaryControls =
    environmentDropdown || hasSecondaryControls ? (
      <div className="ml-auto flex items-center gap-1">
        {environmentDropdown}
        {secondaryControls}
      </div>
    ) : null;

  const worktreeOnlyToggle = worktreeLabelOnly ? (
    <div className="composer-footer__mode-toggle--tabs">
      <div className="pointer-events-none">
        <Button color="ghostActive" size="composerSm">
          {worktreeSegmentLabel}
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <WithWindow extension browser>
        <div className="flex items-center gap-1">
          {worktreeLabelOnly ? worktreeOnlyToggle : renderModeDropdown()}
          {modeAdjacentControl}
        </div>
      </WithWindow>
      <WithWindow electron>
        <div className="relative flex w-full items-center gap-2">
          {worktreeLabelOnly ? worktreeOnlyToggle : renderModeDropdown()}
          {modeAdjacentControl}
          {inlineSecondaryControls}
        </div>
      </WithWindow>
    </>
  );
}

function EnvironmentDropdownContent({
  envQuery,
  setEnvQuery,
  envListState,
  listToShow,
  selectedEnvironment,
  zeroEnvironments,
  onSelectEnvironment,
  onClose,
}: {
  envQuery: string;
  setEnvQuery: React.Dispatch<React.SetStateAction<string>>;
  envListState: "list" | "loading" | "error" | "none-found" | "empty";
  listToShow: Array<CodeEnvironment> | undefined;
  selectedEnvironment: CodeEnvironment | null | undefined;
  zeroEnvironments: boolean;
  onSelectEnvironment: (env: CodeEnvironment) => void;
  onClose: () => void;
}): React.ReactElement {
  const intl = useIntl();

  if (zeroEnvironments) {
    return (
      <Dropdown.Item RightIcon={LinkExternalIcon} href={CODEX_HOME_URL}>
        <span className="text-token-description-foreground">
          <FormattedMessage
            id="composer.mode.remote.setupViaWeb"
            defaultMessage="Set up an environment via Codex web"
            description="Menu item to setup an environment via Codex web"
          />
        </span>
      </Dropdown.Item>
    );
  }

  const environments = listToShow ?? [];
  let content: React.ReactElement;

  if (envListState === "loading") {
    content = (
      <div className="flex items-center justify-center px-[var(--padding-row-x)] py-3">
        <Spinner className="icon-xxs text-token-description-foreground" />
      </div>
    );
  } else if (envListState === "error") {
    content = (
      <Dropdown.Message compact tone="error">
        <FormattedMessage
          id="composer.environmentSelector.error"
          defaultMessage="Error loading environments"
          description="Error state for the cloud environment dropdown"
        />
      </Dropdown.Message>
    );
  } else if (envListState === "none-found" || envListState === "empty") {
    content = (
      <Dropdown.Message compact>
        <FormattedMessage
          id="codex.environments.noEnvironmentsFound"
          defaultMessage="No environments found"
          description="Message shown when no Codex environments were found"
        />
      </Dropdown.Message>
    );
  } else {
    content = (
      <>
        {environments.map((env) => (
          <Dropdown.Item
            key={env.id}
            RightIcon={
              env.id === selectedEnvironment?.id ? CheckMdIcon : undefined
            }
            onClick={() => {
              onSelectEnvironment(env);
              onClose();
            }}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 truncate">{env.label}</span>
            </span>
          </Dropdown.Item>
        ))}
        <Dropdown.Separator />
        <Dropdown.Item
          LeftIcon={PlusIcon}
          href={`${CODEX_HOME_URL}/settings/environments`}
          onClick={onClose}
        >
          <FormattedMessage
            id="composer.environmentSelector.createNew"
            defaultMessage="Create new"
            description="CTA to create a new Codex environment"
          />
        </Dropdown.Item>
      </>
    );
  }

  return (
    <div className="flex flex-col">
      <Dropdown.Section className="my-1">
        <Dropdown.SearchInput
          placeholder={intl.formatMessage({
            id: "composer.searchEnvironments",
            defaultMessage: "Search environments",
            description: "Search environments placeholder",
          })}
          value={envQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEnvQuery(e.target.value)
          }
        />
      </Dropdown.Section>
      {content}
    </div>
  );
}

function LocalModeLabel({
  rateLimit,
  isRemoteHost,
}: {
  rateLimit: RateLimitSnapshot | null;
  isRemoteHost: boolean;
}): React.ReactElement {
  const alertData = useMemo(
    () => getRateLimitAlertData(rateLimit),
    [rateLimit],
  );
  return (
    <>
      {isRemoteHost ? (
        <FormattedMessage
          id="composer.mode.remote"
          defaultMessage="Remote"
          description="Remote mode label"
        />
      ) : (
        <FormattedMessage
          id="composer.mode.local"
          defaultMessage="Local"
          description="Local mode label"
        />
      )}
      {alertData && (
        <span className="whitespace-nowrap text-token-input-placeholder-foreground opacity-60">
          <FormattedMessage
            id="composer.mode.local.ratePercent"
            defaultMessage=" {usage}%"
            description="Rate limit remaining percent appended to Local when near limit"
            values={{ usage: Math.round(alertData.remainingPercent) }}
          />
        </span>
      )}
    </>
  );
}

const messages = defineMessages({
  workLocally: {
    id: "composer.mode.workLocally",
    defaultMessage: "Local project",
    description: "Local mode label",
  },
  startInRemote: {
    id: "composer.mode.startInRemote",
    defaultMessage: "Remote",
    description: "Dropdown label for starting a task in a remote project",
  },
  workLocallyTooltip: {
    id: "composer.mode.workLocally.tooltip",
    defaultMessage: "Work on {branchName}",
    description: "Tooltip describing what local mode runs against",
  },
  workRemotelyTooltipWithoutPath: {
    id: "composer.mode.workRemotely.tooltipWithoutPath",
    defaultMessage: "Work on {hostDisplayName}",
    description: "Tooltip describing what where the remote mode is run",
  },
  fallbackBranch: {
    id: "composer.mode.workLocally.currentBranchFallback",
    defaultMessage: "your branch",
    description: "Fallback branch name when current branch cannot be detected",
  },
  runInCloud: {
    id: "composer.mode.runInCloud",
    defaultMessage: "Cloud",
    description: "Remote mode label when a Codex task will be run in the cloud",
  },
  worktreeMode: {
    id: "composer.mode.worktree",
    defaultMessage: "New worktree",
    description: "Worktree mode label",
  },
  remoteWorktreeMode: {
    id: "composer.mode.remoteWorktree",
    defaultMessage: "New remote worktree",
    description: "Worktree mode label when the selected workspace is remote",
  },
  worktreeTooltip: {
    id: "composer.mode.worktree.tooltip",
    defaultMessage: "Create a copy of your local project to work in parallel",
    description: "Tooltip content for worktree mode dropdown item",
  },
  remoteWorktreeTooltip: {
    id: "composer.mode.remoteWorktree.tooltip",
    defaultMessage: "Create a copy of your remote project to work in parallel",
    description:
      "Tooltip content for worktree mode dropdown item when the selected workspace is remote",
  },
  worktreeSegment: {
    id: "composer.mode.worktreeSegment",
    defaultMessage: "Worktree",
    description: "Worktree mode label for the segmented toggle",
  },
  worktreeSubmoduleWarning: {
    id: "composer.mode.worktree.submoduleWarning",
    defaultMessage: "This repo has git submodules. Worktree creation may fail",
    description: "Warning shown when a repo contains git submodules",
  },
  cloudEnvironmentTitle: {
    id: "composer.slashCommands.cloudEnvironment.title",
    defaultMessage: "Cloud environment",
    description:
      "Title for a composer slash command that makes Codex run in the cloud with a specific environment.",
  },
});

function getCurrentLocalModeRemoteState({
  isAttachedToStartedTask,
  existingRemoteThreadState,
  draftNewThreadRemoteSelectionState,
}: {
  isAttachedToStartedTask: boolean;
  existingRemoteThreadState: {
    hostId: string;
    connectionDisplayName: string | null;
    projectPath: string | null;
  };
  draftNewThreadRemoteSelectionState: {
    hostId: string | null;
    connectionDisplayName: string | null;
    projectPath: string | null;
  };
}): {
  hostId: string;
  connectionDisplayName: string | null;
  projectPath: string | null;
} | null {
  if (isAttachedToStartedTask) {
    return existingRemoteThreadState.hostId !== DEFAULT_HOST_ID
      ? existingRemoteThreadState
      : null;
  }
  if (
    draftNewThreadRemoteSelectionState.hostId == null ||
    draftNewThreadRemoteSelectionState.hostId === DEFAULT_HOST_ID ||
    draftNewThreadRemoteSelectionState.projectPath == null
  ) {
    return null;
  }
  return {
    hostId: draftNewThreadRemoteSelectionState.hostId,
    connectionDisplayName:
      draftNewThreadRemoteSelectionState.connectionDisplayName,
    projectPath: draftNewThreadRemoteSelectionState.projectPath,
  };
}

function getFallbackComposerMode({
  composerMode,
  hasGitRepo,
  isGitMetadataLoading,
  showWorktree,
}: {
  composerMode: ComposerMode;
  hasGitRepo: boolean;
  isGitMetadataLoading: boolean;
  showWorktree: boolean;
}): ComposerMode | null {
  if (!isGitMetadataLoading && !hasGitRepo && composerMode !== "local") {
    return "local";
  }
  if (composerMode === "cloud" || composerMode === "local") {
    return null;
  }
  if (composerMode === "worktree" && showWorktree) {
    return null;
  }
  return "local";
}
