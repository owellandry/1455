import clsx from "clsx";
import {
  createConversationId,
  isCodexWorktree,
  type AsyncThreadStartingState,
  type ConversationId,
} from "protocol";
import { FormattedMessage } from "react-intl";

import { AppServerConnectionStateTooltip } from "@/app-server/app-server-connection-state";
import type { AppServerManager } from "@/app-server/app-server-manager";
import {
  useAppServerManagerForConversationId,
  useAppServerManagerForHost,
  useDefaultAppServerManager,
  useLocalConversationCwd,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import { WithWindow } from "@/components/with-window";
import { useCreateGitRepository } from "@/git-rpc/use-create-git-repository";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useWebviewExecutionTarget } from "@/hooks/use-webview-execution-target";
import { useWindowType } from "@/hooks/use-window-type";
import BranchIcon from "@/icons/branch.svg";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { useFetchFromVSCode } from "@/vscode-api";

import { AsyncTaskStartingStateDropdown } from "./async-task-starting-state-dropdown";
import { CloudFollowUpLocalRemoteDropdown } from "./cloud-follow-up-local-remote-dropdown";
import { CloudFollowUpStartingStateDropdown } from "./cloud-follow-up-starting-state-dropdown";
import type { CloudFollowUpStartingState, ComposerMode } from "./composer";
import type { FollowUpProps } from "./composer-follow-up";
import { ComposerFooterBranchSwitcher } from "./composer-footer-branch-switcher";
import { isNotCloudComposerMode } from "./composer-mode-utils";
import { CustomCliIcon } from "./custom-cli-icon";
import { LocalActiveWorkspaceRootDropdown } from "./local-active-workspace-root-dropdown";

import "./composer-footer.css";
import { LocalRemoteDropdown } from "./local-remote-dropdown";
import { PermissionsModeDropdown } from "./permissions-mode-dropdown";
import { TokenUsageIndicator } from "./token-usage-indicator";

export type ComposerExternalFooterRemoteConfig = {
  currentHostId: string | null;
  getProjectPathForHostId: (hostId: string | null) => string | null;
};

export function ComposerExternalFooter({
  followUp,
  composerMode,
  setComposerMode,
  conversationId,
  isResponseInProgress,
  asyncThreadStartingState,
  setStartingState,
  cloudFollowUpStartingState,
  setCloudFollowUpStartingState,
  worktreeEnvironmentDropdown,
  codexHome,
  showWorkspaceDropdown = true,
  gitRootForStartingState,
  footerBranchName,
  showFooterBranchWhen = "local",
  freeUpsellButton,
  remoteConfig,
}: {
  followUp?: FollowUpProps;
  composerMode: ComposerMode;
  setComposerMode: (mode: ComposerMode) => void;
  conversationId: ConversationId | null;
  isResponseInProgress?: boolean;
  asyncThreadStartingState: AsyncThreadStartingState;
  setStartingState: (state: AsyncThreadStartingState) => void;
  cloudFollowUpStartingState: CloudFollowUpStartingState;
  setCloudFollowUpStartingState: (state: CloudFollowUpStartingState) => void;
  worktreeEnvironmentDropdown?: React.ReactNode;
  codexHome?: string;
  showWorkspaceDropdown?: boolean;
  gitRootForStartingState?: string | null;
  footerBranchName?: string | null;
  showFooterBranchWhen?: "local" | "always";
  freeUpsellButton?: React.ReactNode;
  remoteConfig?: ComposerExternalFooterRemoteConfig;
}): React.ReactElement {
  const appServerManager = useDefaultAppServerManager();
  const windowType = useWindowType();
  const supportsCreateRepositoryButton =
    windowType === "electron" &&
    composerMode !== "cloud" &&
    followUp?.type !== "cloud";

  const followUpConversationId =
    followUp?.type === "local" ? followUp.localConversationId : null;
  const branchConversationId = followUpConversationId ?? conversationId;
  const hasBranchConversation = useLocalConversationSelector(
    branchConversationId,
    (conversation) => conversation != null,
  );
  const isBranchConversationPending =
    branchConversationId != null && !hasBranchConversation;
  const executionTarget = useWebviewExecutionTarget(branchConversationId);
  const branchConversationManager =
    useAppServerManagerForConversationId(branchConversationId);
  const hasStartedBranchConversation = useLocalConversationSelector(
    branchConversationId,
    (conversation) => {
      return (
        (conversation?.turns.length ?? 0) > 0 ||
        (conversation?.requests.length ?? 0) > 0
      );
    },
  );
  const isAttachedToStartedTask =
    followUp != null || hasStartedBranchConversation;
  const draftRemoteHostId = remoteConfig?.currentHostId ?? DEFAULT_HOST_ID;
  const shouldUseDraftRemoteSelection =
    composerMode === "local" &&
    draftRemoteHostId !== DEFAULT_HOST_ID &&
    (!isAttachedToStartedTask ||
      followUp?.type === "cloud" ||
      (followUp?.type === "local" &&
        branchConversationManager.getHostId() === DEFAULT_HOST_ID));
  const resolvedHostId = shouldUseDraftRemoteSelection
    ? draftRemoteHostId
    : branchConversationManager.getHostId();
  const draftRemoteAppServerManager =
    useAppServerManagerForHost(resolvedHostId);
  const isExistingRemoteThread =
    !shouldUseDraftRemoteSelection && resolvedHostId !== DEFAULT_HOST_ID;
  const localConversationCwd = useLocalConversationCwd(followUpConversationId);
  const { data: codexHomeData } = useFetchFromVSCode("codex-home", {
    params: {
      hostId: executionTarget.hostId,
    },
  });
  const resolvedCodexHome = codexHomeData?.codexHome ?? codexHome;
  const permissionsConversationId = followUpConversationId ?? conversationId;
  const isWorktreeTask = isCodexWorktree(
    localConversationCwd,
    resolvedCodexHome,
  );
  const shouldShowWorktreeOnly = windowType === "electron" && isWorktreeTask;
  const [remoteConnectionsData] = useSharedObject("remote_connections");
  const remoteConnections = remoteConnectionsData ?? [];
  const footerRemoteConnection =
    remoteConnections.find((connection) => {
      return connection.hostId === resolvedHostId;
    }) ?? null;
  const footerRemoteProjectPath =
    resolvedHostId !== DEFAULT_HOST_ID
      ? isExistingRemoteThread
        ? executionTarget.cwd
        : (remoteConfig?.getProjectPathForHostId(resolvedHostId) ?? null)
      : null;
  const permissionsAppServerManager =
    shouldUseDraftRemoteSelection && resolvedHostId !== DEFAULT_HOST_ID
      ? draftRemoteAppServerManager
      : undefined;
  const permissionsCwdOverride = shouldUseDraftRemoteSelection
    ? footerRemoteProjectPath
    : undefined;
  const selectedDraftRemoteConnection =
    remoteConnections.find((connection) => {
      return connection.hostId === remoteConfig?.currentHostId;
    }) ?? null;
  const selectedRemoteProjectPath =
    remoteConfig?.getProjectPathForHostId(
      remoteConfig?.currentHostId ?? null,
    ) ?? null;
  const footerRemoteState = {
    isAttachedToStartedTask,
    existingRemoteThreadState: {
      hostId: resolvedHostId,
      connectionDisplayName:
        resolvedHostId !== DEFAULT_HOST_ID
          ? (footerRemoteConnection?.displayName ?? null)
          : null,
      projectPath: footerRemoteProjectPath,
    },
    draftNewThreadRemoteSelectionState: {
      hostId: remoteConfig?.currentHostId ?? null,
      connectionDisplayName: selectedDraftRemoteConnection?.displayName ?? null,
      projectPath: selectedRemoteProjectPath,
    },
  };
  const gitMetadataCwd =
    supportsCreateRepositoryButton && !isBranchConversationPending
      ? executionTarget.cwd
      : null;
  const hostConfig = executionTarget.hostConfig;
  const { data: gitMetadata, isLoading: isGitMetadataLoading } =
    useGitStableMetadata(gitMetadataCwd, hostConfig);
  const { data: queriedFooterBranchName } = useGitCurrentBranch(
    gitMetadataCwd,
    hostConfig,
    {
      enabled: branchConversationId == null,
    },
  );
  const {
    canCreateGitRepository,
    createGitRepository,
    isCreatingGitRepository,
  } = useCreateGitRepository({
    cwd: gitMetadataCwd,
    hostConfig,
    showErrorToast: true,
  });
  const isGitMetadataResolved = gitMetadataCwd != null && gitMetadata != null;
  const shouldRenderCreateRepositoryButton =
    supportsCreateRepositoryButton &&
    isGitMetadataResolved &&
    gitMetadata?.root == null;
  const isCreateRepositoryButtonDisabled =
    !canCreateGitRepository ||
    isCreatingGitRepository ||
    !isGitMetadataResolved ||
    isGitMetadataLoading ||
    gitMetadataCwd == null;
  const upsellButton = shouldRenderCreateRepositoryButton
    ? null
    : freeUpsellButton;
  const baseClassName =
    "composer-footer flex flex-nowrap items-center gap-1 overflow-hidden pr-2";

  const startingStateDropdown =
    !followUp && (composerMode === "cloud" || composerMode === "worktree") ? (
      <AsyncTaskStartingStateDropdown
        startingState={asyncThreadStartingState}
        setStartingState={setStartingState}
        hostConfig={hostConfig}
        gitRootOverride={gitRootForStartingState}
        branchSource={composerMode === "worktree" ? "worktree" : "cloud"}
      />
    ) : null;

  const worktreeSecondaryControls =
    composerMode === "worktree" && worktreeEnvironmentDropdown ? (
      <div className="flex flex-nowrap items-center gap-1">
        {worktreeEnvironmentDropdown}
        {startingStateDropdown}
      </div>
    ) : (
      startingStateDropdown
    );

  const environmentDropdown =
    followUp?.type === "cloud" ? (
      <CloudFollowUpLocalRemoteDropdown
        composerMode={composerMode}
        setComposerMode={setComposerMode}
        followUp={followUp}
      />
    ) : (
      <LocalRemoteDropdown
        composerMode={composerMode}
        setComposerMode={setComposerMode}
        conversationId={permissionsConversationId}
        footerRemoteState={footerRemoteState}
        disabled={shouldShowWorktreeOnly}
        worktreeLabelOnly={shouldShowWorktreeOnly}
        allowWorktree={!followUp && !isResponseInProgress}
        secondaryControls={worktreeSecondaryControls}
        modeAdjacentControl={
          composerMode !== "cloud" && (
            <PermissionsModeDropdown
              conversationId={permissionsConversationId}
              appServerManagerOverride={permissionsAppServerManager}
              cwdOverride={permissionsCwdOverride}
            />
          )
        }
      />
    );

  const shouldShowUsageWithoutFollowUp =
    windowType === "extension" &&
    !followUp &&
    !upsellButton &&
    isNotCloudComposerMode(composerMode);
  const shouldShowContextFallback =
    windowType === "extension" && isNotCloudComposerMode(composerMode);
  const showUsageGroup = !!followUp || shouldShowUsageWithoutFollowUp;

  const cloudConversationId =
    followUp?.type === "cloud"
      ? (followUp.selectedTurn?.conversation_id ??
        followUp.taskDetails.current_assistant_turn?.conversation_id ??
        null)
      : null;
  const contextConversationId =
    followUp?.type === "local"
      ? followUp.localConversationId
      : cloudConversationId
        ? toLocalConversationId(cloudConversationId, appServerManager)
        : null;
  const contextIndicator =
    contextConversationId != null ? (
      <TokenUsageIndicator
        conversationId={contextConversationId}
        cwd={gitMetadataCwd}
        showFallbackWhenUnavailable={shouldShowContextFallback}
      />
    ) : shouldShowUsageWithoutFollowUp ? (
      <TokenUsageIndicator
        conversationId={null}
        cwd={gitMetadataCwd}
        showFallbackWhenUnavailable
      />
    ) : null;
  const usageGroup = !showUsageGroup ? null : (
    <>
      <CustomCliIcon />
      {contextIndicator}
    </>
  );

  const modeGroup =
    composerMode === "cloud" &&
    followUp?.type === "cloud" &&
    followUp.hasAppliedCodeLocally ? (
      <CloudFollowUpStartingStateDropdown
        startingState={cloudFollowUpStartingState}
        setStartingState={setCloudFollowUpStartingState}
      />
    ) : null;

  const normalizedFooterBranch =
    branchConversationId != null
      ? (footerBranchName?.trim() ?? "")
      : (queriedFooterBranchName?.trim() ?? footerBranchName?.trim() ?? "");
  const isRemoteFollowerThread =
    branchConversationId != null &&
    resolvedHostId !== DEFAULT_HOST_ID &&
    branchConversationManager.getStreamRole(branchConversationId)?.role ===
      "follower";
  const shouldShowBranchFooter =
    (showFooterBranchWhen === "always" || composerMode === "local") &&
    windowType === "electron" &&
    !isRemoteFollowerThread &&
    !isBranchConversationPending &&
    !isGitMetadataLoading;
  const footerRemoteConnectionState = isExistingRemoteThread
    ? footerRemoteState.existingRemoteThreadState
    : footerRemoteState.draftNewThreadRemoteSelectionState;
  const createRepositoryAction =
    shouldShowBranchFooter && shouldRenderCreateRepositoryButton ? (
      <Button
        className="px-0"
        color="ghost"
        size="composerSm"
        disabled={isCreateRepositoryButtonDisabled}
        onClick={() => {
          if (isCreateRepositoryButtonDisabled || gitMetadataCwd == null) {
            return;
          }
          void createGitRepository();
        }}
      >
        <BranchIcon className="icon-2xs" />
        <span className="composer-footer__label--sm max-w-40 truncate text-sm">
          {isCreatingGitRepository ? (
            <FormattedMessage
              id="codex.review.noDiff.gitInit.creating"
              defaultMessage="Creating…"
              description="Button label shown while git init is running from the diff empty state"
            />
          ) : (
            <FormattedMessage
              id="codex.review.noDiff.gitInit.createRepository"
              defaultMessage="Create git repository"
              description="Button label to create a git repository from the diff empty state"
            />
          )}
        </span>
      </Button>
    ) : null;
  const shouldShowRemoteFooterControls =
    windowType === "electron" &&
    composerMode === "local" &&
    footerRemoteConnectionState.hostId != null &&
    footerRemoteConnectionState.hostId !== DEFAULT_HOST_ID;
  const remoteFooterControls = shouldShowRemoteFooterControls ? (
    <div className="flex min-w-0 items-center gap-1">
      <RemoteConnectionLabel
        hostId={footerRemoteConnectionState.hostId}
        connectionDisplayName={
          footerRemoteConnectionState.connectionDisplayName
        }
        projectPath={footerRemoteConnectionState.projectPath}
      />
    </div>
  ) : null;

  return (
    <>
      <WithWindow electron extension>
        <div
          className={`${baseClassName} flex-wrap gap-2 overflow-visible pl-2`}
        >
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1">
            {environmentDropdown}
            {followUp?.type === "cloud" && composerMode !== "cloud" ? (
              <PermissionsModeDropdown
                conversationId={permissionsConversationId}
                appServerManagerOverride={permissionsAppServerManager}
                cwdOverride={permissionsCwdOverride}
              />
            ) : null}
            <WithWindow electron>
              {showWorkspaceDropdown &&
                isNotCloudComposerMode(composerMode) &&
                !followUp && <LocalActiveWorkspaceRootDropdown />}
            </WithWindow>
          </div>
          {composerMode === "cloud" ? (
            <div className={clsx("flex min-w-0 items-center gap-1")}>
              {modeGroup}
            </div>
          ) : null}
          {remoteFooterControls ||
          createRepositoryAction ||
          upsellButton ||
          usageGroup ||
          (normalizedFooterBranch && shouldShowBranchFooter) ? (
            <div className="flex min-w-0 items-center gap-3">
              {remoteFooterControls}
              {createRepositoryAction ?? (
                <ComposerFooterBranchSwitcher
                  branchName={normalizedFooterBranch}
                  gitRoot={gitMetadata?.root ?? null}
                  hostConfig={hostConfig}
                  localConversationId={followUpConversationId}
                  shouldShow={shouldShowBranchFooter}
                />
              )}
              {upsellButton}
              {usageGroup}
            </div>
          ) : null}
        </div>
      </WithWindow>

      <WithWindow browser>
        <div
          className={`${baseClassName} flex-wrap gap-2 overflow-visible pl-2`}
        >
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1">
            {environmentDropdown}
            {followUp?.type === "cloud" && composerMode !== "cloud" ? (
              <PermissionsModeDropdown
                conversationId={permissionsConversationId}
                appServerManagerOverride={permissionsAppServerManager}
                cwdOverride={permissionsCwdOverride}
              />
            ) : null}
            {showWorkspaceDropdown &&
              isNotCloudComposerMode(composerMode) &&
              !followUp && <LocalActiveWorkspaceRootDropdown />}
          </div>
          <div className={clsx("flex min-w-0 items-center gap-1")}>
            {modeGroup}
          </div>
          {usageGroup ? (
            <div className="flex items-center gap-3">{usageGroup}</div>
          ) : null}
        </div>
      </WithWindow>
    </>
  );
}

function toLocalConversationId(
  id: string,
  manager: AppServerManager,
): ConversationId | null {
  const conversationId = createConversationId(id);
  return manager.getConversation(conversationId) ? conversationId : null;
}

function RemoteConnectionLabel({
  hostId,
  connectionDisplayName,
  projectPath,
}: {
  hostId: string | null;
  connectionDisplayName: string | null;
  projectPath: string | null;
}): React.ReactElement | null {
  if (hostId == null) {
    return null;
  }

  return (
    <Tooltip tooltipContent={projectPath} disabled={projectPath == null}>
      <span className="composer-footer__label--sm flex min-w-0 items-center gap-1 text-sm">
        <AppServerConnectionStateTooltip hostId={hostId} />
        <span className="max-w-40 min-w-0 truncate">
          {connectionDisplayName ?? hostId}
        </span>
      </span>
    </Tooltip>
  );
}
