import {
  createGitCwd,
  isCodexWorktree,
  type ConversationId,
  type GitCwd,
  type GitRoot,
} from "protocol";
import { useState, type ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useAppServerManagerForConversationId } from "@/app-server/app-server-manager-hooks";
import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import { Tooltip } from "@/components/tooltip";
import { useCodexWorktrees } from "@/git-rpc/use-codex-worktrees";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useGitStatusSummary } from "@/git-rpc/use-git-status-summary";
import { useGitWorktrees } from "@/git-rpc/use-git-worktrees";
import ExclamationMarkCircleIcon from "@/icons/exclamation-mark-circle.svg";
import SortIcon from "@/icons/sort.svg";
import { useHostConfig } from "@/shared-objects/use-host-config";
import { normalizeFsPath } from "@/utils/path";
import { useFetchFromVSCode } from "@/vscode-api";

import { getMoveToLocalTargets } from "./get-move-to-local-targets";
import { MoveToLocalDialog } from "./move-to-local-dialog";
import {
  useThreadHandoffActions,
  useThreadHandoffForConversation,
} from "./thread-handoff-store";

export function MoveToLocalButton({
  conversationId,
  currentBranch,
  cwd,
  disabled,
}: {
  conversationId: ConversationId;
  currentBranch: string;
  cwd: GitCwd;
  disabled: boolean;
}): ReactElement {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocalTargetGitRoot, setSelectedLocalTargetGitRoot] =
    useState<GitRoot | null>(null);
  const appServerManager = useAppServerManagerForConversationId(conversationId);
  const hostConfig = useHostConfig(appServerManager.getHostId());
  const operation = useThreadHandoffForConversation(conversationId);
  const { openOperation } = useThreadHandoffActions();
  const { data: worktreeStableMetadata } = useGitStableMetadata(
    cwd,
    hostConfig,
  );
  const worktreeRoot = worktreeStableMetadata?.root ?? null;
  const sourceWorktreeRoot = worktreeRoot ?? cwd;
  const normalizedSourceWorktreeRoot = normalizeFsPath(sourceWorktreeRoot);
  const {
    data: allRepoWorktrees,
    isLoading: isRepoWorktreesLoading,
    isFetching: isRepoWorktreesFetching,
  } = useGitWorktrees(worktreeRoot ?? cwd, hostConfig);
  const { data: codexWorktreesResponse } = useCodexWorktrees(hostConfig);
  const { data: codexHome } = useFetchFromVSCode("codex-home", {
    params: {
      hostId: hostConfig.id,
    },
    select: (data) => data.codexHome,
  });
  const { data: workspaceRootOptions } = useFetchFromVSCode(
    "workspace-root-options",
  );
  const repoWorktreeEntries = allRepoWorktrees?.worktrees;
  const codexManagedRoots = new Set(
    (codexWorktreesResponse?.worktrees ?? []).map((worktree) =>
      normalizeFsPath(worktree.dir),
    ),
  );
  const isCodexManagedRoot = (root: string): boolean => {
    return (
      codexManagedRoots.has(normalizeFsPath(root)) ||
      isCodexWorktree(root, codexHome)
    );
  };
  const localTargets = getMoveToLocalTargets({
    cwd,
    sourceWorktreeRoot,
    repoWorktreeEntries: (repoWorktreeEntries ?? []).filter((entry) => {
      return !isCodexManagedRoot(entry.root);
    }),
  });
  const workspaceRootLabels = workspaceRootOptions?.labels ?? {};
  const defaultLocalTarget = localTargets[0] ?? null;
  const selectedLocalTarget =
    localTargets.find(
      (target) => target.gitRoot === selectedLocalTargetGitRoot,
    ) ?? defaultLocalTarget;
  const localWorkspaceRoot = selectedLocalTarget?.workspaceRoot ?? null;
  const localWorkspaceCwd =
    localWorkspaceRoot == null ? null : createGitCwd(localWorkspaceRoot);
  const localGitRoot = selectedLocalTarget?.gitRoot ?? null;
  const normalizedLocalRoot = localGitRoot
    ? normalizeFsPath(localGitRoot)
    : null;
  const {
    data: localCurrentBranch,
    isLoading: isLocalCurrentBranchLoading,
    isFetching: isLocalCurrentBranchFetching,
  } = useGitCurrentBranch(localGitRoot, hostConfig, {
    enabled: isOpen && localGitRoot != null,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
  const {
    data: localStatusSummary,
    isLoading: isLocalStatusLoading,
    isFetching: isLocalStatusFetching,
  } = useGitStatusSummary(localGitRoot, hostConfig, {
    enabled: isOpen && localGitRoot != null,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
  const branchCheckedOutElsewhere = (repoWorktreeEntries ?? []).some(
    (entry) => {
      const normalizedRoot = normalizeFsPath(entry.root);
      if (isCodexManagedRoot(entry.root)) {
        return false;
      }
      if (entry.headRef.type !== "branch") {
        return false;
      } else if (entry.headRef.string !== currentBranch) {
        return false;
      }
      if (normalizedLocalRoot && normalizedRoot === normalizedLocalRoot) {
        return false;
      } else if (normalizedRoot === normalizedSourceWorktreeRoot) {
        return false;
      }
      return true;
    },
  );
  const isLocalWorktreesLoading =
    isRepoWorktreesLoading || isRepoWorktreesFetching;
  const hasLocalChanges =
    localStatusSummary?.type === "success" &&
    localStatusSummary.stagedCount +
      localStatusSummary.unstagedCount +
      localStatusSummary.untrackedCount >
      0;
  const isLocalStatusPending =
    localGitRoot != null &&
    (isLocalCurrentBranchLoading ||
      isLocalCurrentBranchFetching ||
      isLocalStatusLoading ||
      isLocalStatusFetching);
  const isLoadingBlocked = isLocalWorktreesLoading || isLocalStatusPending;
  const turnInProgressDisabledReason = intl.formatMessage({
    id: "localConversation.moveThread.disabled.turnInProgress",
    defaultMessage: "You cannot move a thread while it is in progress",
    description:
      "Tooltip shown when moving a thread is disabled because a turn is in progress",
  });
  const progressTooltip = intl.formatMessage({
    id: "localConversation.threadHandoff.tooltip.viewProgress",
    defaultMessage: "View progress",
    description:
      "Tooltip shown when a thread handoff is in progress and the button reopens the progress view",
  });
  const handoffButtonLabel = intl.formatMessage({
    id: "localConversation.moveToLocal.label",
    defaultMessage: "Hand off",
    description: "Button label for moving a worktree conversation to local",
  });
  const destinationLabel = hostConfig.kind === "local" ? "local" : "remote";
  let confirmDisabledReason: string | null = null;
  if (isLocalWorktreesLoading) {
    confirmDisabledReason = intl.formatMessage({
      id: "localConversation.moveToLocal.disabled.loading",
      defaultMessage: "Checking available local workspaces…",
      description:
        "Tooltip shown when the move to local button is disabled while local worktrees are loading",
    });
  } else if (selectedLocalTarget == null || localWorkspaceCwd == null) {
    confirmDisabledReason = intl.formatMessage({
      id: "localConversation.moveToLocal.disabled.noWorkspace",
      defaultMessage: "No local workspace found for this worktree",
      description:
        "Tooltip shown when the move to local button is disabled because no local workspace is available",
    });
  } else if (branchCheckedOutElsewhere) {
    confirmDisabledReason = intl.formatMessage({
      id: "localConversation.moveToLocal.disabled.branchCheckedOut",
      defaultMessage: "Branch is already checked out in another worktree",
      description:
        "Tooltip shown when the move to local button is disabled because the branch is checked out elsewhere",
    });
  } else if (worktreeRoot == null) {
    confirmDisabledReason = intl.formatMessage({
      id: "localConversation.moveToLocal.confirm.missingWorktreeRoot",
      defaultMessage: "Unable to resolve the current worktree.",
      description:
        "Tooltip shown when the move to local button is disabled because the source worktree root is unavailable",
    });
  } else if (isLocalStatusPending) {
    confirmDisabledReason = intl.formatMessage({
      id: "localConversation.moveToLocal.confirm.loadingStatus",
      defaultMessage: "Checking local workspace status…",
      description:
        "Tooltip shown when the move to local button is disabled while git status is loading",
    });
  } else if (localCurrentBranch == null) {
    confirmDisabledReason = intl.formatMessage({
      id: "localConversation.moveToLocal.confirm.missingLocalBranch",
      defaultMessage: "Unable to determine the current local branch.",
      description:
        "Tooltip shown when the move to local button is disabled because the current local branch is unavailable",
    });
  } else if (localStatusSummary?.type !== "success") {
    confirmDisabledReason = intl.formatMessage({
      id: "localConversation.moveToLocal.confirm.localStatusError",
      defaultMessage:
        "Unable to determine whether the local workspace is clean.",
      description:
        "Tooltip shown when the move to local button is disabled because the local git status check failed",
    });
  } else if (hasLocalChanges) {
    confirmDisabledReason = intl.formatMessage({
      id: "localConversation.moveToLocal.confirm.localChangesBlocked",
      defaultMessage: "Stash or commit your local changes to hand off",
      description:
        "Tooltip shown when the move to local button is disabled because the destination local workspace is not clean",
    });
  }

  const handleMoveToLocalButtonClick = (): void => {
    if (operation != null) {
      openOperation(operation.id);
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      <Tooltip
        tooltipContent={
          operation?.status === "queued" || operation?.status === "running"
            ? progressTooltip
            : operation == null && disabled
              ? turnInProgressDisabledReason
              : null
        }
      >
        <Button
          aria-label={handoffButtonLabel}
          color="outline"
          size="toolbar"
          disabled={operation == null && disabled}
          onClick={handleMoveToLocalButtonClick}
        >
          <span className="flex items-center gap-1.5">
            {operation?.status === "queued" ||
            operation?.status === "running" ? (
              <Spinner className="icon-xs" />
            ) : operation?.status === "error" ? (
              <ExclamationMarkCircleIcon className="icon-xs text-token-danger" />
            ) : operation?.hasUnseenTerminalState &&
              operation.status === "warning" ? (
              <ExclamationMarkCircleIcon className="icon-xs text-token-editor-warning-foreground" />
            ) : (
              <SortIcon className="icon-xs rotate-90" />
            )}
            <span className="max-[920px]:hidden">
              <FormattedMessage
                id="localConversation.moveToLocal.label"
                defaultMessage="Hand off"
                description="Button label for moving a worktree conversation to local"
              />
            </span>
          </span>
        </Button>
      </Tooltip>
      <MoveToLocalDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        conversationId={conversationId}
        currentBranch={currentBranch}
        cwd={cwd}
        localTargets={localTargets}
        selectedLocalTarget={selectedLocalTarget}
        onChangeLocalTarget={setSelectedLocalTargetGitRoot}
        workspaceRootLabels={workspaceRootLabels}
        isLoadingBlocked={isLoadingBlocked}
        confirmDisabledReason={confirmDisabledReason}
        localGitRoot={localGitRoot}
        localWorkspaceCwd={localWorkspaceCwd}
        worktreeRoot={worktreeRoot}
        destinationLabel={destinationLabel}
      />
    </>
  );
}
