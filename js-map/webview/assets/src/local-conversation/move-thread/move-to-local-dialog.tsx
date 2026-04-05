import type { ConversationId, GitCwd, GitRoot } from "protocol";
import { useState, type ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import ChevronIcon from "@/icons/chevron.svg";
import SortIcon from "@/icons/sort.svg";
import { ActionPopover } from "@/review/action-popover-primitives";
import { normalizeFsPath } from "@/utils/path";

import type { MoveToLocalTarget } from "./get-move-to-local-targets";
import { ThreadHandoffStage } from "./thread-handoff-stage";
import {
  resetThreadHandoffOperationForRetry,
  type ThreadHandoffStepId,
  useThreadHandoffActions,
  useThreadHandoffForConversation,
  useThreadHandoffState,
} from "./thread-handoff-store";

export function MoveToLocalDialog({
  open,
  onOpenChange,
  conversationId,
  currentBranch,
  cwd,
  localTargets,
  selectedLocalTarget,
  onChangeLocalTarget,
  workspaceRootLabels,
  isLoadingBlocked,
  confirmDisabledReason,
  localGitRoot,
  localWorkspaceCwd,
  worktreeRoot,
  destinationLabel = "local",
}: {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  conversationId: ConversationId;
  currentBranch: string;
  cwd: GitCwd;
  localTargets: Array<MoveToLocalTarget>;
  selectedLocalTarget: MoveToLocalTarget | null;
  onChangeLocalTarget: (gitRoot: GitRoot | null) => void;
  workspaceRootLabels: Record<string, string>;
  isLoadingBlocked: boolean;
  confirmDisabledReason: string | null;
  localGitRoot: GitRoot | null;
  localWorkspaceCwd: GitCwd | null;
  worktreeRoot: GitRoot | null;
  destinationLabel?: "local" | "remote";
}): ReactElement {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const { activeOperationId } = useThreadHandoffState();
  const operation = useThreadHandoffForConversation(conversationId);
  const {
    addToLocalOperation,
    closeActiveOperation,
    removeOperation,
    openOperation,
    updateOperation,
  } = useThreadHandoffActions();
  const isActiveOperation =
    operation != null && activeOperationId === operation.id;
  const dialogOpen = open || isActiveOperation;
  const isConfirmDisabled =
    confirmDisabledReason != null ||
    localGitRoot == null ||
    localWorkspaceCwd == null ||
    worktreeRoot == null;
  const selectedLocalTargetLabel =
    selectedLocalTarget == null
      ? null
      : getWorkspaceRootLabel({
          workspaceRoot: selectedLocalTarget.workspaceRoot,
          workspaceRootLabels,
        });
  const isProjectSelectorDisabled =
    selectedLocalTarget == null || localTargets.length <= 1;

  const handleMove = (): void => {
    if (isConfirmDisabled) {
      return;
    }
    addToLocalOperation({
      sourceConversationId: conversationId,
      sourceBranch: currentBranch,
      localBranch: currentBranch,
      request: {
        cwd,
        localGitRoot,
        localWorkspaceRoot: localWorkspaceCwd,
        worktreeRoot,
      },
      stepIds: [
        "stash-source-changes",
        "detach-worktree-branch",
        "checkout-local-branch",
        "apply-changes-to-local",
        "switching-thread",
      ] satisfies Array<ThreadHandoffStepId>,
    });
    onOpenChange(false);
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
    onOpenChange(nextOpen);
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
                id="localConversation.moveToLocal.modal.title"
                defaultMessage="Hand off thread to {destinationLabel}"
                description="Title for the move-to-local confirmation modal"
                values={{ destinationLabel }}
              />
            </ActionPopover.Title>
            <p className="text-[13px] leading-6 tracking-[-0.13px] text-token-description-foreground">
              <span>
                <FormattedMessage
                  id="localConversation.moveToLocal.modal.subtitle.prefix"
                  defaultMessage="Check out branch "
                  description="Prefix for the move-to-local confirmation sentence before the branch name"
                />
              </span>
              <BranchPill>{currentBranch}</BranchPill>
              <span>
                <FormattedMessage
                  id="localConversation.moveToLocal.modal.subtitle.suffix"
                  defaultMessage=" in a {destinationLabel} workspace and detach it from worktree."
                  description="Suffix for the move-to-local confirmation sentence after the branch name"
                  values={{ destinationLabel }}
                />
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[13px] leading-6 tracking-[-0.13px]">
            <span className="text-token-description-foreground">
              <FormattedMessage
                id="localConversation.moveToLocal.modal.projectPrefix"
                defaultMessage="Handing off to {destinationLabel} workspace"
                description="Text shown before the project selector in the move-to-local modal"
                values={{ destinationLabel }}
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
                    className="flex min-w-0 items-center gap-1.5 rounded-lg bg-token-foreground/5 px-2 py-0.5 text-[13px] leading-6 font-medium tracking-[-0.13px] text-token-foreground"
                    disabled={isProjectSelectorDisabled}
                  >
                    {selectedLocalTargetLabel != null ? (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="w-full min-w-0 truncate text-left text-token-foreground [direction:rtl]">
                          <span className="block w-full text-left [direction:ltr] [unicode-bidi:plaintext]">
                            {selectedLocalTargetLabel}
                          </span>
                        </span>
                        <ChevronIcon className="icon-xs shrink-0 text-token-description-foreground" />
                      </span>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-left text-token-description-foreground">
                        <FormattedMessage
                          id="localConversation.moveToLocal.modal.projectPlaceholder"
                          defaultMessage="No local workspace found"
                          description="Placeholder shown when the move-to-local modal cannot find a local workspace target"
                        />
                      </span>
                    )}
                  </button>
                }
              >
                <Dropdown.Section className="flex max-h-40 flex-col overflow-y-auto">
                  {localTargets.map((target) => {
                    const label = getWorkspaceRootLabel({
                      workspaceRoot: target.workspaceRoot,
                      workspaceRootLabels,
                    });
                    return (
                      <Dropdown.Item
                        key={target.gitRoot}
                        tooltipText={target.workspaceRoot}
                        tooltipAlign="start"
                        SubText={
                          <span className="text-xs whitespace-normal text-token-description-foreground">
                            {target.workspaceRoot}
                          </span>
                        }
                        onSelect={() => {
                          onChangeLocalTarget(target.gitRoot);
                        }}
                      >
                        <span className="block truncate">{label}</span>
                      </Dropdown.Item>
                    );
                  })}
                </Dropdown.Section>
              </BasicDropdown>
            </div>
          </div>
        </div>
        <ActionPopover.Footer
          className="flex-col items-stretch gap-3"
          right={
            <div className="flex w-full flex-col gap-3">
              <Button
                className="h-11 w-full justify-center rounded-full px-4 text-[13px] font-medium"
                color="primary"
                disabled={isConfirmDisabled}
                loading={isLoadingBlocked}
                onClick={handleMove}
              >
                {isLoadingBlocked ? (
                  <FormattedMessage
                    id="localConversation.moveToLocal.modal.loading"
                    defaultMessage="Checking for ability to hand off..."
                    description="Button label shown while move-to-local is waiting on required data before it can continue"
                  />
                ) : (
                  <FormattedMessage
                    id="localConversation.moveToLocal.modal.continue"
                    defaultMessage="Hand off"
                    description="Primary action in the move-to-local modal"
                  />
                )}
              </Button>
              {confirmDisabledReason != null && !isLoadingBlocked ? (
                <p className="text-center text-[13px] leading-6 tracking-[-0.13px] text-token-editor-error-foreground">
                  {confirmDisabledReason}
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

function getWorkspaceRootLabel({
  workspaceRoot,
  workspaceRootLabels,
}: {
  workspaceRoot: string;
  workspaceRootLabels: Record<string, string>;
}): string {
  const normalizedWorkspaceRoot = normalizeFsPath(workspaceRoot);
  const labelOverride =
    workspaceRootLabels[workspaceRoot]?.trim() ??
    workspaceRootLabels[normalizedWorkspaceRoot]?.trim() ??
    "";
  if (labelOverride) {
    return labelOverride;
  }

  const rootName = workspaceRoot
    .split(/[/\\]+/)
    .filter(Boolean)
    .at(-1);
  if (rootName) {
    return rootName;
  }

  return workspaceRoot;
}
