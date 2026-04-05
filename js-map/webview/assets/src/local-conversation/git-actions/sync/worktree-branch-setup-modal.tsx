import { useFamilySignal, useScope } from "maitai";
import {
  type CommandExecutionOutput,
  type ConversationId,
  GlobalStateKey,
  type GitCwd,
  type HostConfig,
} from "protocol";
import type { ReactElement } from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useAppServerManagerForConversationIdOrDefault } from "@/app-server/app-server-manager-hooks";
import { title$ } from "@/app-server/maitai/app-server-manager-signals";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { TerminalToastCard } from "@/components/toaster/terminal-toast-card";
import { toast$ } from "@/components/toaster/toast-signal";
import { Tooltip } from "@/components/tooltip";
import { useGitBranches } from "@/git-rpc/use-git-branches";
import { useCheckoutGitBranch } from "@/hooks/use-checkout-git-branch";
import { useCreateGitBranch } from "@/hooks/use-create-git-branch";
import { useGlobalState } from "@/hooks/use-global-state";
import BranchIcon from "@/icons/branch.svg";
import { useApplyWorktree } from "@/local-conversation/use-apply-worktree";
import { ActionPopover } from "@/review/action-popover-primitives";
import { AppScope } from "@/scopes/app-scope";

import { BranchNameFieldHeader } from "./branch-name-field-header";
import { getDefaultBranchName } from "./get-default-branch-name";

const BRANCH_SETUP_ERROR_TOAST_SETTINGS = { duration: 7 } as const;

export function WorktreeBranchSetupModal({
  conversationId,
  cwd,
  hostConfig,
  open,
  onOpenChange,
  onRequestOpenCommit,
}: {
  conversationId?: ConversationId;
  cwd: GitCwd;
  hostConfig: HostConfig;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onRequestOpenCommit?: (branchName: string) => void;
}): ReactElement {
  const appServerManager = useAppServerManagerForConversationIdOrDefault(
    conversationId ?? null,
  );
  const intl = useIntl();
  const scope = useScope(AppScope);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { data: branchPrefix } = useGlobalState(
    GlobalStateKey.GIT_BRANCH_PREFIX,
  );
  const conversationTitle = useFamilySignal(title$, conversationId);
  const defaultBranchName = getDefaultBranchName({
    branchPrefix,
    conversationTitle,
  });
  const branchNameValue = branchName ?? defaultBranchName;

  const { targetRoots } = useApplyWorktree({
    conversationCwd: cwd,
    hostConfig,
  });
  const localTarget = targetRoots[0] ?? null;
  const localBranchName = localTarget?.label ?? null;
  const localWorkspaceRoot = localTarget?.workspaceRoot ?? null;

  const { data: branches = [], isLoading: isBranchesLoading } = useGitBranches(
    cwd,
    hostConfig,
    {
      enabled: open,
    },
  );
  const createBranchMutation = useCreateGitBranch(cwd, hostConfig);
  const checkoutBranchMutation = useCheckoutGitBranch(cwd, hostConfig);

  const trimmedBranchName = branchNameValue.trim();
  const isBranchNameEmpty = trimmedBranchName.length === 0;
  const hasTrailingSlash = trimmedBranchName.endsWith("/");
  const branchAlreadyExists = branches.includes(trimmedBranchName);
  const isBranchValidationPending = isBranchesLoading;
  const isSubmitting =
    isSaving ||
    createBranchMutation.isPending ||
    checkoutBranchMutation.isPending;
  const isAlreadyCheckedOut =
    localBranchName != null && trimmedBranchName === localBranchName;
  const isCheckoutBlocked = isAlreadyCheckedOut;

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setBranchName(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (): Promise<void> => {
    if (
      isSubmitting ||
      isBranchNameEmpty ||
      hasTrailingSlash ||
      isBranchValidationPending ||
      branchAlreadyExists
    ) {
      return;
    }

    setIsSaving(true);
    const showBranchSetupErrorToast = ({
      title,
      message,
      execOutput,
    }: {
      title: string;
      message: string | null;
      execOutput?: CommandExecutionOutput;
    }): void => {
      scope.get(toast$).custom({
        ...BRANCH_SETUP_ERROR_TOAST_SETTINGS,
        content: ({ close }) => (
          <TerminalToastCard
            title={title}
            message={message}
            execOutput={execOutput}
            onClose={close}
          />
        ),
      });
    };

    try {
      const createResult = await createBranchMutation.mutateAsync({
        cwd,
        branch: trimmedBranchName,
        mode: "synced",
      });
      if (createResult.status === "error") {
        showBranchSetupErrorToast({
          title: intl.formatMessage({
            id: "localConversation.worktreeBranchSetup.createBranchErrorTitle",
            defaultMessage: "Failed to set branch",
            description:
              "Title for the terminal toast shown when Codex failed to make a git branch",
          }),
          message: createResult.error,
          execOutput: createResult.execOutput,
        });
        return;
      }

      if (!isAlreadyCheckedOut) {
        const checkoutResult = await checkoutBranchMutation.mutateAsync({
          cwd,
          branch: trimmedBranchName,
        });
        if (checkoutResult.status === "error") {
          showBranchSetupErrorToast({
            title: intl.formatMessage({
              id: "localConversation.worktreeBranchSetup.checkoutErrorTitle",
              defaultMessage: "Failed to check out branch",
              description:
                "Title for the terminal toast shown when Codex failed to checkout a git branch",
            }),
            message: checkoutResult.error,
            execOutput: checkoutResult.execOutput,
          });
          return;
        }
      }

      if (conversationId != null) {
        const didUpdate = await appServerManager.updateThreadGitBranch(
          conversationId,
          trimmedBranchName,
        );
        if (!didUpdate) {
          scope.get(toast$).danger(
            intl.formatMessage({
              id: "localConversation.worktreeBranchSetup.threadBranchUpdateError",
              defaultMessage: "Failed to update the thread branch.",
              description:
                "Toast shown when updating the thread branch fails after creating a branch",
            }),
            BRANCH_SETUP_ERROR_TOAST_SETTINGS,
          );
        }
      }

      onRequestOpenCommit?.(trimmedBranchName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showBranchSetupErrorToast({
        title: intl.formatMessage({
          id: "localConversation.worktreeBranchSetup.errorTitle",
          defaultMessage: "Something went wrong",
          description:
            "Title for the fallback terminal toast for branch setup failures",
        }),
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const continueDisabled =
    isSubmitting ||
    isBranchNameEmpty ||
    hasTrailingSlash ||
    isBranchValidationPending ||
    branchAlreadyExists ||
    isCheckoutBlocked;

  return (
    <Dialog size="compact" open={open} onOpenChange={handleOpenChange}>
      <ActionPopover.Root className="gap-4">
        <ActionPopover.Header
          icon={<BranchIcon className="icon-md text-token-foreground" />}
        />
        <div className="flex flex-col gap-1">
          <ActionPopover.Title>
            <FormattedMessage
              id="localConversation.worktreeBranchSetup.title"
              defaultMessage="Work here"
              description="Title for the worktree branch setup modal"
            />
          </ActionPopover.Title>
          <p className="text-sm text-token-description-foreground">
            <FormattedMessage
              id="localConversation.worktreeBranchSetup.subtitle"
              defaultMessage="Create a branch to commit changes, push, and create a PR from this worktree. <a>Learn more</a>"
              description="Subtitle for the worktree branch setup modal"
              values={{
                a: (chunks: React.ReactNode): React.ReactElement => (
                  <a
                    className="underline"
                    href="https://developers.openai.com/codex/app/worktrees#option-1-working-on-the-worktree"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {chunks}
                  </a>
                ),
              }}
            />
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <BranchNameFieldHeader />
          <input
            className="h-10 w-full rounded-xl border border-token-border bg-token-dropdown-background px-3 text-sm text-token-foreground outline-none placeholder:text-token-description-foreground"
            autoFocus
            value={branchNameValue}
            onChange={(event) => {
              setBranchName(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder={intl.formatMessage({
              id: "localConversation.worktreeBranchSetup.branchPlaceholder.new",
              defaultMessage: "Create a new branch",
              description:
                "Placeholder for new branch name input in the sync setup modal",
            })}
            aria-label={intl.formatMessage({
              id: "localConversation.worktreeBranchSetup.branchAriaLabel",
              defaultMessage: "Branch name",
              description:
                "Aria label for branch selection input in the sync setup modal",
            })}
          />
          {branchAlreadyExists ? (
            <p className="text-token-danger text-xs">
              <FormattedMessage
                id="localConversation.worktreeBranchSetup.branchExistsError"
                defaultMessage="Branch already exists."
                description="Validation message shown in the worktree branch setup modal when the entered branch already exists"
              />
            </p>
          ) : null}
        </div>
        <ActionPopover.Footer
          right={
            <Tooltip
              disabled={!isCheckoutBlocked}
              tooltipContent={
                <FormattedMessage
                  id="localConversation.worktreeBranchSetup.checkoutDisabled"
                  defaultMessage="This branch is already checked out at {location}"
                  description="Tooltip shown when checkout is disabled because the branch is already checked out"
                  values={{
                    location: localWorkspaceRoot ?? "-",
                  }}
                />
              }
            >
              <span className="inline-flex w-full">
                <Button
                  className="w-full justify-center"
                  color="primary"
                  disabled={continueDisabled}
                  loading={isSubmitting}
                  onClick={handleSubmit}
                >
                  <FormattedMessage
                    id="localConversation.worktreeBranchSetup.action.create"
                    defaultMessage="Create"
                    description="Primary action label when creating a new branch"
                  />
                </Button>
              </span>
            </Tooltip>
          }
        />
      </ActionPopover.Root>
    </Dialog>
  );
}
