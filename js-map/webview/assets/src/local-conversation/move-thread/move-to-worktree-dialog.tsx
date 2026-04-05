import { useQuery } from "@tanstack/react-query";
import { useScope } from "maitai";
import { GlobalStateKey, type ConversationId, type GitCwd } from "protocol";
import { useState, type ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useAppServerManagerForConversationId } from "@/app-server/app-server-manager-hooks";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { toast$ } from "@/components/toaster/toast-signal";
import { useGitBranches } from "@/git-rpc/use-git-branches";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { useGitDefaultBranch } from "@/git-rpc/use-git-default-branch";
import { useGlobalState } from "@/hooks/use-global-state";
import BranchIcon from "@/icons/branch.svg";
import ChevronIcon from "@/icons/chevron.svg";
import SortIcon from "@/icons/sort.svg";
import { ActionPopover } from "@/review/action-popover-primitives";
import { AppScope } from "@/scopes/app-scope";
import { useHostConfig } from "@/shared-objects/use-host-config";
import { workerRpcClient } from "@/worker-rpc";

import { getDefaultBranchName } from "../git-actions/sync/get-default-branch-name";
import { ThreadHandoffStage } from "./thread-handoff-stage";
import {
  resetThreadHandoffOperationForRetry,
  type ThreadHandoffStepId,
  useThreadHandoffActions,
  useThreadHandoffForConversation,
  useThreadHandoffState,
} from "./thread-handoff-store";

export function MoveToWorktreeDialog({
  open,
  onOpenChange,
  conversationId,
  conversationTitle,
  currentBranch,
  cwd,
}: {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  conversationId: ConversationId;
  conversationTitle: string | null;
  currentBranch: string;
  cwd: GitCwd;
}): ReactElement {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const appServerManager = useAppServerManagerForConversationId(conversationId);
  const hostConfig = useHostConfig(appServerManager.getHostId());
  const [localCheckoutBranchOverride, setLocalCheckoutBranchOverride] =
    useState<string | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const [worktreeBranchOverride, setWorktreeBranchOverride] = useState<
    string | null
  >(null);
  const { activeOperationId } = useThreadHandoffState();
  const operation = useThreadHandoffForConversation(conversationId);
  const {
    addToWorktreeOperation,
    closeActiveOperation,
    removeOperation,
    openOperation,
    updateOperation,
  } = useThreadHandoffActions();
  const isActiveOperation =
    operation != null && activeOperationId === operation.id;
  const dialogOpen = open || isActiveOperation;
  const { data: defaultBranch } = useGitDefaultBranch(cwd, hostConfig);
  const { data: branchPrefix } = useGlobalState(
    GlobalStateKey.GIT_BRANCH_PREFIX,
  );
  const {
    data: localCurrentBranch,
    isLoading: isLocalCurrentBranchLoading,
    isFetching: isLocalCurrentBranchFetching,
  } = useGitCurrentBranch(cwd, hostConfig, {
    enabled: open,
  });
  const {
    data: existingOwnedWorktree,
    isLoading: isExistingOwnedWorktreeLoading,
  } = useQuery({
    queryKey: [
      "move-thread",
      "to-worktree",
      "resolve-owned-worktree",
      conversationId,
      cwd,
    ],
    queryFn: () =>
      workerRpcClient("git").request({
        method: "resolve-worktree-for-thread",
        params: {
          cwd,
          conversationId,
          hostConfig,
        },
      }),
    enabled: open,
    staleTime: 0,
  });
  const isLocalCheckoutRequired =
    localCurrentBranch != null && localCurrentBranch === currentBranch;
  const isSourceDefaultBranch =
    defaultBranch != null && currentBranch === defaultBranch;
  const shouldMoveLocalBranch =
    isLocalCheckoutRequired && !isSourceDefaultBranch;
  const isLocalCurrentBranchPending =
    isLocalCurrentBranchLoading || isLocalCurrentBranchFetching;
  const {
    data: localBranches = [],
    isLoading: isLocalBranchesLoading,
    isFetching: isLocalBranchesFetching,
    isError: isLocalBranchesError,
    refetch: refetchLocalBranches,
  } = useGitBranches(cwd, hostConfig, {
    enabled: open && shouldMoveLocalBranch,
  });
  const { data: allBranches = [] } = useGitBranches(cwd, hostConfig, {
    enabled: open && isSourceDefaultBranch,
  });
  const willReuseExistingWorktree =
    existingOwnedWorktree?.worktreeGitRoot != null &&
    existingOwnedWorktree?.worktreeWorkspaceRoot != null;
  const localCheckoutBranches = getBranchesWithDefaultFirst({
    branches: localBranches,
    defaultBranch: defaultBranch ?? null,
  }).filter((branch) => !currentBranch || branch !== currentBranch);
  const isBranchListLoading = isLocalBranchesLoading || isLocalBranchesFetching;
  const defaultWorktreeBranchName = getDefaultBranchName({
    branchPrefix: branchPrefix ?? undefined,
    conversationTitle,
  });
  const selectedLocalCheckoutBranch =
    shouldMoveLocalBranch &&
    localCheckoutBranchOverride &&
    localCheckoutBranches.includes(localCheckoutBranchOverride)
      ? localCheckoutBranchOverride
      : shouldMoveLocalBranch
        ? (localCheckoutBranches[0] ?? null)
        : null;
  const selectedWorktreeBranch = isSourceDefaultBranch
    ? (worktreeBranchOverride ?? defaultWorktreeBranchName)
    : currentBranch;
  const trimmedWorktreeBranch = selectedWorktreeBranch.trim();
  const isWorktreeBranchEmpty = trimmedWorktreeBranch.length === 0;
  const hasWorktreeTrailingSlash = trimmedWorktreeBranch.endsWith("/");
  const isWorktreeDefaultBranch =
    defaultBranch != null && trimmedWorktreeBranch === defaultBranch;
  const doesWorktreeBranchAlreadyExist =
    isSourceDefaultBranch &&
    trimmedWorktreeBranch.length > 0 &&
    allBranches.includes(trimmedWorktreeBranch);
  const isLoadingBlocked =
    isLocalCurrentBranchPending ||
    isExistingOwnedWorktreeLoading ||
    (shouldMoveLocalBranch && isBranchListLoading);
  let continueDisabledReason: string | null = null;
  if (isLoadingBlocked) {
    continueDisabledReason = intl.formatMessage({
      id: "localConversation.moveToWorktree.modal.loading",
      defaultMessage: "Checking for ability to hand off...",
      description:
        "Button label shown while move-to-worktree is waiting on required data before it can continue",
    });
  } else if (isSourceDefaultBranch && isWorktreeBranchEmpty) {
    continueDisabledReason = intl.formatMessage({
      id: "localConversation.moveToWorktree.modal.worktreeBranchRequired",
      defaultMessage: "Enter a worktree branch name.",
      description:
        "Inline validation message shown above the move-to-worktree CTA when the worktree branch name is empty",
    });
  } else if (hasWorktreeTrailingSlash) {
    continueDisabledReason = intl.formatMessage({
      id: "localConversation.moveToWorktree.modal.trailingSlashError",
      defaultMessage: "Branch name cannot end with “/”.",
      description:
        "Validation message shown when the worktree branch name ends with a slash",
    });
  } else if (isWorktreeDefaultBranch) {
    continueDisabledReason = intl.formatMessage({
      id: "localConversation.moveToWorktree.modal.defaultBranchError",
      defaultMessage:
        "Worktree branch must be different from the default branch.",
      description:
        "Validation message shown when the entered worktree branch equals the default branch",
    });
  } else if (doesWorktreeBranchAlreadyExist) {
    continueDisabledReason = intl.formatMessage({
      id: "localConversation.moveToWorktree.modal.branchAlreadyExistsError",
      defaultMessage: "Branch already exists.",
      description:
        "Validation message shown when the entered worktree branch already exists",
    });
  } else if (shouldMoveLocalBranch && selectedLocalCheckoutBranch == null) {
    continueDisabledReason = isLocalBranchesError
      ? intl.formatMessage({
          id: "localConversation.moveToWorktree.modal.branchesError",
          defaultMessage: "Unable to load branches",
          description:
            "Error shown in the move-to-worktree modal when branch list fails to load",
        })
      : intl.formatMessage({
          id: "localConversation.moveToWorktree.modal.noTargetBranch",
          defaultMessage: "No other local branches are available",
          description:
            "Message shown when no local branch can be selected for checkout before moving to a worktree",
        });
  }
  const isContinueDisabled = continueDisabledReason != null;

  const resetState = (): void => {
    setLocalCheckoutBranchOverride(null);
    setWorktreeBranchOverride(null);
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen && isActiveOperation) {
      if (operation?.status === "success" || operation?.status === "error") {
        removeOperation(operation.id);
        onOpenChange(false);
        return;
      }
      if (operation?.status === "warning") {
        removeOperation(operation.id);
        onOpenChange(false);
        return;
      }
      closeActiveOperation();
      onOpenChange(false);
      return;
    }
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleContinue = (): void => {
    if (doesWorktreeBranchAlreadyExist) {
      scope.get(toast$).warning(
        intl.formatMessage({
          id: "localConversation.moveToWorktree.modal.branchAlreadyExists",
          defaultMessage: "Branch already exists",
          description:
            "Toast shown when moving to worktree with an existing branch name",
        }),
      );
      return;
    }
    if (isContinueDisabled) {
      return;
    }
    addToWorktreeOperation({
      sourceConversationId: conversationId,
      sourceBranch: currentBranch,
      localBranch: selectedLocalCheckoutBranch,
      worktreeBranch: trimmedWorktreeBranch,
      request: {
        cwd,
        defaultBranch: defaultBranch ?? null,
        existingWorktreeGitRoot: existingOwnedWorktree?.worktreeGitRoot ?? null,
        existingWorktreeWorkspaceRoot:
          existingOwnedWorktree?.worktreeWorkspaceRoot ?? null,
        targetHasUncommittedChanges:
          existingOwnedWorktree?.hasUncommittedChanges ?? false,
      },
      stepIds: [
        willReuseExistingWorktree
          ? "reuse-existing-worktree"
          : "create-new-worktree",
        "stash-source-changes",
        "checkout-local-branch",
        "stash-target-worktree-changes",
        "checkout-worktree-branch",
        "apply-changes-to-worktree",
        "switching-thread",
      ] satisfies Array<ThreadHandoffStepId>,
    });
    resetState();
    onOpenChange(false);
  };

  if (isActiveOperation && operation != null) {
    return (
      <Dialog size="compact" open={dialogOpen} onOpenChange={handleOpenChange}>
        <ThreadHandoffStage
          operation={operation}
          onClose={() => {
            if (
              operation.status === "success" ||
              operation.status === "error"
            ) {
              removeOperation(operation.id);
              return;
            }
            if (operation.status === "warning") {
              removeOperation(operation.id);
              return;
            }
            closeActiveOperation();
          }}
          onRetry={() => {
            updateOperation(operation.id, (draft) => {
              Object.assign(draft, resetThreadHandoffOperationForRetry(draft));
            });
            openOperation(operation.id);
          }}
        />
      </Dialog>
    );
  }

  return (
    <Dialog size="compact" open={open} onOpenChange={handleOpenChange}>
      <ActionPopover.Root className="gap-5">
        <ActionPopover.Header
          icon={
            <SortIcon className="icon-base rotate-90 text-token-foreground" />
          }
        />
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <ActionPopover.Title>
              <FormattedMessage
                id="localConversation.moveToWorktree.modal.title"
                defaultMessage="Hand off thread to worktree"
                description="Title for the move-to-worktree modal"
              />
            </ActionPopover.Title>
            <p className="text-[13px] leading-6 tracking-[-0.13px] text-token-description-foreground">
              {isSourceDefaultBranch ? (
                <FormattedMessage
                  id="localConversation.moveToWorktree.modal.subtitle.defaultBranch"
                  defaultMessage="Create and check out a branch in a {worktreeDescription} to continue working in parallel."
                  description="Subtitle for the move-to-worktree modal when the source branch is the default branch"
                  values={{
                    worktreeDescription: willReuseExistingWorktree ? (
                      <FormattedMessage
                        id="localConversation.moveToWorktree.modal.subtitle.defaultBranch.existing"
                        defaultMessage="existing worktree"
                        description="Noun phrase used in the move-to-worktree subtitle when reusing an existing worktree"
                      />
                    ) : (
                      <FormattedMessage
                        id="localConversation.moveToWorktree.modal.subtitle.defaultBranch.new"
                        defaultMessage="new worktree"
                        description="Noun phrase used in the move-to-worktree subtitle when creating a new worktree"
                      />
                    ),
                  }}
                />
              ) : (
                <>
                  <span>
                    <FormattedMessage
                      id="localConversation.moveToWorktree.modal.subtitle.branch.prefix"
                      defaultMessage="Check out branch "
                      description="Prefix for the move-to-worktree confirmation sentence before the branch name"
                    />
                  </span>
                  <BranchPill>{trimmedWorktreeBranch}</BranchPill>
                  <span>
                    <FormattedMessage
                      id="localConversation.moveToWorktree.modal.subtitle.branch.suffix"
                      defaultMessage=" in a {worktreeDescription} to continue working in parallel."
                      description="Suffix for the move-to-worktree confirmation sentence after the branch name"
                      values={{
                        worktreeDescription: willReuseExistingWorktree ? (
                          <FormattedMessage
                            id="localConversation.moveToWorktree.modal.subtitle.branch.existing"
                            defaultMessage="existing worktree"
                            description="Noun phrase used in the move-to-worktree subtitle when reusing an existing worktree"
                          />
                        ) : (
                          <FormattedMessage
                            id="localConversation.moveToWorktree.modal.subtitle.branch.new"
                            defaultMessage="new worktree"
                            description="Noun phrase used in the move-to-worktree subtitle when creating a new worktree"
                          />
                        ),
                      }}
                    />
                  </span>
                </>
              )}
            </p>
          </div>
          {shouldMoveLocalBranch ? (
            <div className="flex flex-wrap items-center gap-2 text-[13px] leading-6 tracking-[-0.13px]">
              <span className="text-token-description-foreground">
                <FormattedMessage
                  id="localConversation.moveToWorktree.modal.localCheckoutLabel"
                  defaultMessage="Local workspace will switch to"
                  description="Label for selecting the branch to check out locally when moving to a worktree"
                />
              </span>
              <div
                ref={(node) => {
                  if (typeof document === "undefined") {
                    setPortalContainer(null);
                    return;
                  }
                  const container =
                    node?.closest(".codex-dialog") ?? document.body;
                  setPortalContainer(container as HTMLElement | null);
                }}
              >
                <BasicDropdown
                  align="end"
                  contentMaxHeight="list"
                  contentWidth="menuBounded"
                  portalContainer={portalContainer}
                  triggerButton={
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-1.5 rounded-lg bg-token-foreground/5 px-2 py-0.5 text-[13px] leading-6 font-medium tracking-[-0.13px] text-token-foreground disabled:opacity-50"
                      disabled={isBranchListLoading || isLocalBranchesError}
                    >
                      {selectedLocalCheckoutBranch ? (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="w-full min-w-0 truncate text-left text-token-foreground [direction:rtl]">
                            <span className="block w-full text-left [direction:ltr] [unicode-bidi:plaintext]">
                              {selectedLocalCheckoutBranch}
                            </span>
                          </span>
                          <ChevronIcon className="icon-xs shrink-0 text-token-description-foreground" />
                        </span>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-left text-token-description-foreground">
                          <FormattedMessage
                            id="localConversation.moveToWorktree.modal.localBranchPlaceholder"
                            defaultMessage="Select local checkout branch"
                            description="Placeholder shown in the move-to-worktree modal branch selector"
                          />
                        </span>
                      )}
                    </button>
                  }
                >
                  {isBranchListLoading ? (
                    <Dropdown.Item disabled>
                      <FormattedMessage
                        id="localConversation.moveToWorktree.modal.branchesLoading"
                        defaultMessage="Loading branches…"
                        description="Label shown while loading branches in the move-to-worktree modal"
                      />
                    </Dropdown.Item>
                  ) : isLocalBranchesError ? (
                    <Dropdown.Section className="flex flex-col gap-1">
                      <Dropdown.SectionLabel>
                        <FormattedMessage
                          id="localConversation.moveToWorktree.modal.branchesError"
                          defaultMessage="Unable to load branches"
                          description="Error shown in the move-to-worktree modal when branch list fails to load"
                        />
                      </Dropdown.SectionLabel>
                      <Dropdown.Item
                        onSelect={() => {
                          void refetchLocalBranches();
                        }}
                      >
                        <FormattedMessage
                          id="localConversation.moveToWorktree.modal.branchesRetry"
                          defaultMessage="Retry"
                          description="Retry button for branch loading errors in the move-to-worktree modal"
                        />
                      </Dropdown.Item>
                    </Dropdown.Section>
                  ) : localCheckoutBranches.length === 0 ? (
                    <Dropdown.Item disabled>
                      <FormattedMessage
                        id="localConversation.moveToWorktree.modal.noTargetBranch"
                        defaultMessage="No other local branches are available"
                        description="Message shown when no local branch can be selected for checkout before moving to a worktree"
                      />
                    </Dropdown.Item>
                  ) : (
                    <Dropdown.Section className="flex max-h-40 flex-col overflow-y-auto">
                      {localCheckoutBranches.map((branch) => (
                        <Dropdown.Item
                          key={branch}
                          className="[direction:rtl] [&_.min-w-0]:text-left"
                          onSelect={() => {
                            setLocalCheckoutBranchOverride(branch);
                          }}
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <BranchIcon className="icon-sm shrink-0 text-token-foreground" />
                            <span className="[direction:ltr] [unicode-bidi:plaintext]">
                              {branch}
                            </span>
                          </span>
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Section>
                  )}
                </BasicDropdown>
              </div>
            </div>
          ) : null}
          {isSourceDefaultBranch ? (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] leading-6 font-medium tracking-[-0.13px] text-token-foreground">
                <FormattedMessage
                  id="localConversation.moveToWorktree.modal.worktreeBranchLabel"
                  defaultMessage="Branch name"
                  description="Label for the target worktree branch when moving from the default branch"
                />
              </span>
              <input
                className="h-12 w-full rounded-2xl border border-token-border/40 bg-transparent px-4 text-[13px] leading-6 tracking-[-0.13px] text-token-foreground outline-none placeholder:text-token-description-foreground"
                autoFocus
                value={selectedWorktreeBranch}
                onChange={(event) => {
                  setWorktreeBranchOverride(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleContinue();
                  }
                }}
                placeholder={intl.formatMessage({
                  id: "localConversation.moveToWorktree.modal.worktreeBranchPlaceholder",
                  defaultMessage: "new-branch",
                  description:
                    "Placeholder for worktree branch name input when moving from the default branch",
                })}
                aria-label={intl.formatMessage({
                  id: "localConversation.moveToWorktree.modal.worktreeBranchAriaLabel",
                  defaultMessage: "Worktree branch name",
                  description:
                    "Aria label for worktree branch name input when moving from the default branch",
                })}
              />
            </div>
          ) : null}
        </div>
        <ActionPopover.Footer
          className="flex-col items-stretch gap-3"
          right={
            <div className="flex w-full flex-col gap-3">
              <Button
                className="h-11 w-full justify-center rounded-full px-4 text-[13px] font-medium"
                color="primary"
                disabled={isContinueDisabled}
                loading={isLoadingBlocked}
                onClick={handleContinue}
              >
                {isLoadingBlocked ? (
                  <FormattedMessage
                    id="localConversation.moveToWorktree.modal.loading"
                    defaultMessage="Checking for ability to hand off..."
                    description="Button label shown while move-to-worktree is waiting on required data before it can continue"
                  />
                ) : (
                  <FormattedMessage
                    id="localConversation.moveToWorktree.modal.continue"
                    defaultMessage="Hand off"
                    description="Primary action in the move-to-worktree modal"
                  />
                )}
              </Button>
              {continueDisabledReason != null && !isLoadingBlocked ? (
                <p className="text-center text-[13px] leading-6 tracking-[-0.13px] text-token-editor-error-foreground">
                  {continueDisabledReason}
                </p>
              ) : null}
            </div>
          }
        />
      </ActionPopover.Root>
    </Dialog>
  );
}

function BranchPill({ children }: { children: string }): ReactElement {
  return (
    <span className="mx-1 inline-flex max-w-full items-center rounded-lg bg-token-foreground/5 px-2 py-0.5 align-middle text-[13px] leading-6 tracking-[-0.13px] text-token-foreground">
      <span className="truncate">{children}</span>
    </span>
  );
}

function getBranchesWithDefaultFirst({
  branches,
  defaultBranch,
}: {
  branches: Array<string>;
  defaultBranch: string | null;
}): Array<string> {
  if (defaultBranch == null) {
    return branches;
  }
  if (!branches.includes(defaultBranch)) {
    return branches;
  }
  if (branches[0] === defaultBranch) {
    return branches;
  }
  return [
    defaultBranch,
    ...branches.filter((branch) => branch !== defaultBranch),
  ];
}
