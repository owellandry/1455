import sumBy from "lodash/sumBy";
import { useScope } from "maitai";
import {
  GlobalStateKey,
  createGitCwd,
  type ConversationId,
  type GitCheckoutBranchErrorType,
  type GitRoot,
  type GitTrackedUncommittedChangesResult,
  type HostConfig,
} from "protocol";
import { useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import {
  useAppServerManagerForConversationId,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Spinner } from "@/components/spinner";
import { toast$ } from "@/components/toaster/toast-signal";
import { Tooltip } from "@/components/tooltip";
import { TaskDiffStats } from "@/diff-stats";
import { parseDiff, type CodexDiffFile } from "@/diff/parse-diff";
import { useGitBranches } from "@/git-rpc/use-git-branches";
import { useGitDefaultBranch } from "@/git-rpc/use-git-default-branch";
import { useGitMergedUncommittedChanges } from "@/git-rpc/use-git-merged-uncommitted-changes";
import { useGitStatusSummary } from "@/git-rpc/use-git-status-summary";
import { useGitTrackedUncommittedChanges } from "@/git-rpc/use-git-tracked-uncommitted-changes";
import { useCheckoutGitBranch } from "@/hooks/use-checkout-git-branch";
import { useCreateGitBranch } from "@/hooks/use-create-git-branch";
import { useGlobalState } from "@/hooks/use-global-state";
import { useModelSettings } from "@/hooks/use-model-settings";
import BranchIcon from "@/icons/branch.svg";
import CheckMdIcon from "@/icons/check-md.svg";
import ChevronIcon from "@/icons/chevron.svg";
import PlusIcon from "@/icons/plus.svg";
import { buildCommitMessagePrompt } from "@/local-conversation/git-actions/commit/commit-message-prompt";
import { CommitModal } from "@/local-conversation/git-actions/commit/commit-modal";
import { useGenerateCommitMessageMutation } from "@/local-conversation/git-actions/commit/use-generate-commit-message";
import { getGitActionSourceConversationId } from "@/local-conversation/git-actions/shared/get-git-action-source-conversation-id";
import { BranchNameFieldHeader } from "@/local-conversation/git-actions/sync/branch-name-field-header";
import { getDefaultBranchName } from "@/local-conversation/git-actions/sync/get-default-branch-name";
import { AppScope } from "@/scopes/app-scope";
import { useResizeObserver } from "@/utils/use-resize-observer";
import { useTokenUsageInfo } from "@/utils/use-token-usage-info";

type GitActionModalStatus = "idle" | "loading" | "success" | "error";
type PendingBranchAction =
  | { type: "checkout"; branch: string }
  | { type: "create-and-checkout"; branch: string };
const UNSUPPORTED_BRANCH_NAME_CHARACTERS = new Set([
  "~",
  "^",
  ":",
  "?",
  "*",
  "[",
  "]",
  "\\",
]);

export function ComposerFooterBranchSwitcher({
  branchName,
  gitRoot,
  hostConfig,
  localConversationId,
  shouldShow,
}: {
  branchName: string;
  gitRoot: GitRoot | null;
  hostConfig: HostConfig;
  localConversationId: ConversationId | null;
  shouldShow: boolean;
}): React.ReactElement | null {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUncommittedOpen, setIsUncommittedOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState<string | null>(null);
  const [isCommitOpen, setIsCommitOpen] = useState(false);
  const [commitDialogKey, setCommitDialogKey] = useState(0);
  const [pendingBranchAction, setPendingBranchAction] =
    useState<PendingBranchAction | null>(null);
  const [checkoutConflictFiles, setCheckoutConflictFiles] = useState<
    Array<string>
  >([]);
  const [commitStatus, setCommitStatus] =
    useState<GitActionModalStatus>("idle");
  const [message, setMessage] = useState("");
  const messageRef = useRef(message);

  const currentBranch = branchName.trim();
  const canRender = shouldShow && currentBranch.length > 0;
  const setDraftMessage = (nextMessage: string): void => {
    messageRef.current = nextMessage;
    setMessage(nextMessage);
  };

  const conversationTitle = useLocalConversationSelector(
    localConversationId,
    (conversation) => conversation?.title,
  );
  const tokenUsageInfo = useTokenUsageInfo(localConversationId);
  const appServerManager =
    useAppServerManagerForConversationId(localConversationId);
  const { modelSettings } = useModelSettings(localConversationId);
  const currentModel = modelSettings.model;
  const hasRoot = gitRoot != null;
  const canSwitch = canRender && hasRoot;
  const {
    data: branches = [],
    isLoading,
    isFetching,
    isError,
    refetch: refetchBranches,
  } = useGitBranches(gitRoot, hostConfig, {
    enabled: canSwitch && (isOpen || isCreateOpen),
  });
  const { data: defaultBranch } = useGitDefaultBranch(gitRoot, hostConfig, {
    enabled: canSwitch && (isOpen || isCreateOpen),
  });
  const { data: statusSummary } = useGitStatusSummary(gitRoot, hostConfig, {
    enabled: canSwitch && (isOpen || isCreateOpen),
  });
  const { data: trackedChanges } = useGitTrackedUncommittedChanges(
    gitRoot,
    hostConfig,
    { enabled: canSwitch },
  );
  const { uncommittedFiles } = useGitMergedUncommittedChanges(
    gitRoot,
    hostConfig,
    { enabled: canSwitch },
  );
  const checkoutBranchMutation = useCheckoutGitBranch(gitRoot, hostConfig);
  const createBranchMutation = useCreateGitBranch(gitRoot, hostConfig);
  const gitCwd = gitRoot != null ? createGitCwd(gitRoot) : null;
  const { data: commitInstructions } = useGlobalState(
    GlobalStateKey.GIT_COMMIT_INSTRUCTIONS,
  );
  const { data: branchPrefix } = useGlobalState(
    GlobalStateKey.GIT_BRANCH_PREFIX,
  );
  const defaultNewBranchName = getDefaultBranchName({
    branchPrefix,
    conversationTitle,
  });
  const newNameValue = newName ?? defaultNewBranchName;
  const trackedUnifiedDiff =
    trackedChanges?.trackedChanges.type === "success"
      ? trackedChanges.trackedChanges.unifiedDiff
      : null;
  const messagePrompt = buildCommitMessagePrompt({
    commitInstructions: commitInstructions ?? null,
    draftMessage: message,
    uncommittedDiff: trackedUnifiedDiff,
  });
  const generateMessageMutation = useGenerateCommitMessageMutation({
    cwd: gitCwd,
    hostId: hostConfig.id,
    conversationId: localConversationId,
    onError: (error) => {
      scope.get(toast$).danger(
        intl.formatMessage(
          {
            id: "review.commit.generate.failed",
            defaultMessage: "Failed to generate commit message: {error}",
            description: "Toast shown when commit message generation fails",
          },
          { error: error instanceof Error ? error.message : String(error) },
        ),
      );
    },
  });
  const isGeneratingMessage = generateMessageMutation.isPending;
  const commitMessageConversationId = getGitActionSourceConversationId({
    conversationId: localConversationId,
    tokenUsageInfo,
  });
  const trackedDiffFiles = toTrackedDiffFiles(trackedChanges);
  const diffFiles = uncommittedFiles ?? trackedDiffFiles;
  const trackedPathCount = getTrackedPathCount(trackedChanges);
  const orderedBranches = getOrderedBranches({
    branches,
    currentBranch,
    defaultBranch,
  });
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredBranches =
    normalizedSearchQuery.length > 0
      ? orderedBranches.filter((branch) => {
          return branch.toLowerCase().includes(normalizedSearchQuery);
        })
      : orderedBranches;
  const isLoadingBranches = isLoading || isFetching;
  const isCheckingOut = checkoutBranchMutation.isPending;
  const isCreating = createBranchMutation.isPending;
  const isCreateOrCheckoutPending = isCheckingOut || isCreating;
  const trimmedNewName = newNameValue.trim();
  const isNewNameEmpty = trimmedNewName.length === 0;
  const hasTrailingSlash = trimmedNewName.endsWith("/");
  const alreadyExists =
    trimmedNewName.length > 0 && orderedBranches.includes(trimmedNewName);
  const canSubmitCreate =
    !isCreateOrCheckoutPending &&
    !isLoadingBranches &&
    !isNewNameEmpty &&
    !hasTrailingSlash &&
    !alreadyExists &&
    gitRoot != null;
  const diffAdditions = sumBy(diffFiles ?? [], (file) => {
    return file.additions;
  });
  const diffDeletions = sumBy(diffFiles ?? [], (file) => {
    return file.deletions;
  });
  const showDiffStats = diffAdditions + diffDeletions > 0;
  const trackedFileCount =
    trackedPathCount ??
    trackedDiffFiles?.length ??
    (statusSummary?.type === "success"
      ? Math.max(statusSummary.stagedCount, statusSummary.unstagedCount)
      : 0);
  const untrackedFileCount =
    statusSummary?.type === "success" ? statusSummary.untrackedCount : 0;
  const fileCount = trackedFileCount + untrackedFileCount;
  const isCommitActive = isCommitOpen || commitStatus !== "idle";
  const switchTooltipText = intl.formatMessage({
    id: "composer.footer.branchSwitch.tooltip",
    defaultMessage: "Switch branch",
    description: "Tooltip shown for controls that switch git branches",
  });
  const hasNoCommits = !isLoadingBranches && !isError && branches.length === 0;
  const createDisabledTooltipText = hasNoCommits
    ? intl.formatMessage({
        id: "composer.footer.branchSwitch.createAndCheckout.disabledTooltip",
        defaultMessage: "Commit changes to create and checkout a new branch",
        description:
          "Tooltip shown when create-and-checkout branch action is disabled because the repository has no commits",
      })
    : undefined;
  const closeBranchDropdown = (): void => {
    setSearchQuery("");
    setIsOpen(false);
  };

  const showCheckoutError = (error: string): void => {
    scope.get(toast$).danger(
      intl.formatMessage(
        {
          id: "composer.footer.branchSwitch.checkoutError",
          defaultMessage: "Failed to switch branch: {message}",
          description:
            "Toast shown when switching local branches from the composer footer fails",
        },
        { message: error },
      ),
    );
  };

  const showCreateError = (error: string): void => {
    scope.get(toast$).danger(
      intl.formatMessage(
        {
          id: "composer.footer.branchSwitch.createBranchError",
          defaultMessage: "Failed to create branch: {message}",
          description:
            "Toast shown when creating a branch from the composer footer fails",
        },
        { message: error },
      ),
    );
  };

  const maybeHandleCheckoutConflict = ({
    errorType,
    conflictedPaths,
    nextAction,
  }: {
    errorType: GitCheckoutBranchErrorType;
    conflictedPaths?: Array<string>;
    nextAction: PendingBranchAction;
  }): boolean => {
    if (errorType !== "blocked-by-working-tree-changes") {
      return false;
    }
    setCheckoutConflictFiles(conflictedPaths ?? []);
    setPendingBranchAction(nextAction);
    closeBranchDropdown();
    setIsCreateOpen(false);
    setIsUncommittedOpen(true);
    return true;
  };

  const checkoutBranch = async (branch: string): Promise<void> => {
    if (isCreateOrCheckoutPending || gitRoot == null) {
      return;
    }
    if (branch === currentBranch) {
      closeBranchDropdown();
      return;
    }

    try {
      const checkedOut = await checkoutBranchMutation.mutateAsync({
        cwd: gitRoot,
        branch,
      });
      if (checkedOut.status === "error") {
        if (
          maybeHandleCheckoutConflict({
            errorType: checkedOut.errorType,
            conflictedPaths: checkedOut.conflictedPaths,
            nextAction: { type: "checkout", branch },
          })
        ) {
          return;
        }
        showCheckoutError(checkedOut.error);
        return;
      }
      if (localConversationId != null) {
        await appServerManager.updateThreadGitBranch(
          localConversationId,
          branch,
        );
      }
      closeBranchDropdown();
    } catch (error) {
      showCheckoutError(error instanceof Error ? error.message : String(error));
    }
  };

  const createAndCheckoutBranch = async (branch: string): Promise<void> => {
    if (isCreateOrCheckoutPending || gitRoot == null) {
      return;
    }

    try {
      const created = await createBranchMutation.mutateAsync({
        cwd: gitRoot,
        branch,
        mode: "worktree",
      });
      if (created.status === "error") {
        showCreateError(created.error);
        return;
      }

      const checkedOut = await checkoutBranchMutation.mutateAsync({
        cwd: gitRoot,
        branch,
      });
      if (checkedOut.status === "error") {
        if (
          maybeHandleCheckoutConflict({
            errorType: checkedOut.errorType,
            conflictedPaths: checkedOut.conflictedPaths,
            nextAction: { type: "create-and-checkout", branch },
          })
        ) {
          return;
        }
        showCheckoutError(checkedOut.error);
        setIsCreateOpen(false);
        setNewName(null);
        void refetchBranches();
        return;
      }
      if (localConversationId != null) {
        await appServerManager.updateThreadGitBranch(
          localConversationId,
          branch,
        );
      }
      setIsCreateOpen(false);
      setNewName(null);
      void refetchBranches();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showCreateError(message);
    }
  };

  const handleCreateAndCheckout = async (): Promise<void> => {
    if (!canSubmitCreate) {
      return;
    }
    await createAndCheckoutBranch(trimmedNewName);
  };

  const handleCreateOpenChange = (nextOpen: boolean): void => {
    setIsCreateOpen(nextOpen);
    if (!nextOpen) {
      setNewName(null);
    }
  };

  const handleCommitReset = (): void => {
    setIsCommitOpen(false);
    setCommitStatus("idle");
    setCheckoutConflictFiles([]);
    setPendingBranchAction(null);
  };

  const handleUncommittedOpenChange = (nextOpen: boolean): void => {
    setIsUncommittedOpen(nextOpen);
    if (!nextOpen) {
      setCheckoutConflictFiles([]);
      setPendingBranchAction(null);
    }
  };

  const clearCommitDraft = (): void => {
    setDraftMessage("");
  };

  const handleGenerateMessage = async (): Promise<string | null> => {
    if (isGeneratingMessage || gitCwd == null) {
      return null;
    }

    const startedWithMessage = messageRef.current;
    let response: { message?: string | null } | null;
    try {
      response = await generateMessageMutation.mutateAsync({
        hostId: hostConfig.id,
        prompt: messagePrompt,
        cwd: gitCwd,
        conversationId: commitMessageConversationId,
        model: currentModel,
      });
    } catch {
      return null;
    }

    const nextMessage = response?.message?.trim() ?? "";
    if (nextMessage.length === 0) {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "review.commit.generate.emptyResponse",
          defaultMessage: "Couldn't generate a commit message.",
          description:
            "Toast shown when commit message generation returns no result",
        }),
      );
      return null;
    }

    const currentMessage = messageRef.current;
    const shouldReplace =
      currentMessage.trim().length === 0 ||
      currentMessage === startedWithMessage;
    if (shouldReplace) {
      setDraftMessage(nextMessage);
    }
    return nextMessage;
  };

  const handleOpenCommitDialog = (): void => {
    if (gitCwd == null) {
      return;
    }
    setCommitStatus("idle");
    setCommitDialogKey((currentKey) => {
      return currentKey + 1;
    });
    setIsUncommittedOpen(false);
    setIsCommitOpen(true);
  };

  const handleCommitStatusChange = (nextStatus: GitActionModalStatus): void => {
    if (nextStatus === "success" && pendingBranchAction != null) {
      const nextAction = pendingBranchAction;
      handleCommitReset();
      if (nextAction.type === "checkout") {
        void checkoutBranch(nextAction.branch);
        return;
      }
      void createAndCheckoutBranch(nextAction.branch);
      return;
    }
    setCommitStatus(nextStatus);
  };

  const handleCheckout = async (branch: string): Promise<void> => {
    await checkoutBranch(branch);
  };
  const handleOpenChange = (nextOpen: boolean): void => {
    setIsOpen(nextOpen);
    if (!nextOpen) {
      setSearchQuery("");
    }
  };

  if (!canRender) {
    return null;
  }

  if (!hasRoot) {
    return (
      <Tooltip tooltipContent={currentBranch}>
        <div className="flex min-w-0 items-center gap-1 text-token-description-foreground">
          <BranchIcon className="icon-2xs" />
          <span className="composer-footer__label--sm max-w-40 truncate text-sm">
            {currentBranch}
          </span>
        </div>
      </Tooltip>
    );
  }

  return (
    <>
      <BasicDropdown
        side="top"
        open={isOpen}
        align="end"
        onOpenChange={handleOpenChange}
        triggerButton={
          <Tooltip tooltipContent={switchTooltipText}>
            <Button
              className="px-0"
              color="ghost"
              size="composerSm"
              disabled={isCreateOrCheckoutPending}
            >
              <BranchIcon className="icon-2xs" />
              <span className="composer-footer__label--sm max-w-40 truncate text-sm">
                {currentBranch}
              </span>
              {isCreateOrCheckoutPending ? (
                <Spinner className="icon-2xs text-token-input-placeholder-foreground" />
              ) : (
                <ChevronIcon className="composer-footer__secondary-chevron icon-2xs text-token-input-placeholder-foreground" />
              )}
            </Button>
          </Tooltip>
        }
      >
        <div className="flex w-72 flex-col gap-1.5 overflow-hidden">
          <Dropdown.SearchInput
            autoFocus={false}
            placeholder={intl.formatMessage({
              id: "codex.composer.searchBranches",
              defaultMessage: "Search branches",
              description: "Placeholder for the branch search input",
            })}
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (normalizedSearchQuery.length === 0) {
                  closeBranchDropdown();
                  return;
                }
                const branchToCheckout =
                  filteredBranches.find((branch) => {
                    return branch !== currentBranch;
                  }) ?? filteredBranches[0];
                if (branchToCheckout == null) {
                  return;
                }
                void handleCheckout(branchToCheckout);
              }
            }}
          />
          <div className="vertical-scroll-fade-mask flex h-[200px] flex-col gap-1.5 overflow-y-auto">
            <Dropdown.SectionLabel>
              <FormattedMessage
                id="composer.remote.branchesSectionHeading"
                defaultMessage="Branches"
                description="Section heading for remote branch search results"
              />
            </Dropdown.SectionLabel>
            {isLoadingBranches ? (
              <Dropdown.Item disabled>
                <span className="inline-flex items-center gap-2">
                  <Spinner className="icon-xxs" />
                  <FormattedMessage
                    id="localConversation.syncSetup.branchesLoading"
                    defaultMessage="Loading branches…"
                    description="Label shown while loading branches"
                  />
                </span>
              </Dropdown.Item>
            ) : isError ? (
              <Dropdown.Section className="flex flex-col gap-1">
                <Dropdown.SectionLabel>
                  <FormattedMessage
                    id="composer.reviewMode.branches.error"
                    defaultMessage="Unable to load branches"
                    description="Error message when branch list could not be loaded"
                  />
                </Dropdown.SectionLabel>
                <Dropdown.Item
                  onSelect={() => {
                    void refetchBranches();
                  }}
                >
                  <FormattedMessage
                    id="composer.reviewMode.branches.retry"
                    defaultMessage="Retry"
                    description="Retry button for branch list error"
                  />
                </Dropdown.Item>
              </Dropdown.Section>
            ) : filteredBranches.length === 0 ? (
              <Dropdown.Item disabled>
                <FormattedMessage
                  id="localConversation.syncSetup.noBranches"
                  defaultMessage="No branches found"
                  description="Label shown when no branches are available"
                />
              </Dropdown.Item>
            ) : (
              <Dropdown.Section className="flex flex-col">
                {filteredBranches.map((branch) => (
                  <BranchDropdownItem
                    key={branch}
                    branch={branch}
                    currentBranch={currentBranch}
                    fileCount={fileCount}
                    showDiffStats={showDiffStats}
                    diffAdditions={diffAdditions}
                    diffDeletions={diffDeletions}
                    disabled={isCreateOrCheckoutPending}
                    onSelect={() => {
                      void handleCheckout(branch);
                    }}
                  />
                ))}
              </Dropdown.Section>
            )}
          </div>
        </div>
        <Dropdown.Separator />
        <Dropdown.Item
          LeftIcon={PlusIcon}
          disabled={hasNoCommits || isCreateOrCheckoutPending}
          tooltipText={createDisabledTooltipText}
          onSelect={(event) => {
            event.preventDefault();
            closeBranchDropdown();
            setIsCreateOpen(true);
          }}
        >
          <FormattedMessage
            id="composer.footer.branchSwitch.createAndCheckout"
            defaultMessage="Create and checkout new branch…"
            description="Dropdown action label in the composer footer branch switcher to create and checkout a new branch"
          />
        </Dropdown.Item>
      </BasicDropdown>
      <CreateAndCheckoutDialog
        open={isCreateOpen}
        onOpenChange={handleCreateOpenChange}
        name={newNameValue}
        setName={setNewName}
        hasTrailingSlash={hasTrailingSlash}
        alreadyExists={alreadyExists}
        canSubmit={canSubmitCreate}
        isPending={isCreateOrCheckoutPending}
        onSubmit={handleCreateAndCheckout}
      />

      <UncommittedChangesDialog
        open={isUncommittedOpen}
        onOpenChange={handleUncommittedOpenChange}
        conflictFiles={checkoutConflictFiles}
        diffFiles={diffFiles ?? []}
        targetBranch={pendingBranchAction?.branch ?? null}
        fileCount={fileCount}
        showDiffStats={showDiffStats}
        diffAdditions={diffAdditions}
        diffDeletions={diffDeletions}
        onContinue={handleOpenCommitDialog}
      />

      {isCommitActive && gitCwd != null ? (
        <CommitModal
          key={commitDialogKey}
          open={isCommitOpen}
          onOpenChange={setIsCommitOpen}
          conversationId={localConversationId}
          currentModel={currentModel}
          cwd={gitCwd}
          hostConfig={hostConfig}
          onGenerateMessage={handleGenerateMessage}
          pullRequestInstructions={null}
          message={message}
          setMessage={setDraftMessage}
          clearDraft={clearCommitDraft}
          onStatusChange={handleCommitStatusChange}
          onRequestReset={handleCommitReset}
        />
      ) : null}
    </>
  );
}

function BranchDropdownItem({
  branch,
  currentBranch,
  fileCount,
  showDiffStats,
  diffAdditions,
  diffDeletions,
  disabled,
  onSelect,
}: {
  branch: string;
  currentBranch: string;
  fileCount: number;
  showDiffStats: boolean;
  diffAdditions: number;
  diffDeletions: number;
  disabled: boolean;
  onSelect: () => void;
}): React.ReactElement {
  const [isTruncated, setIsTruncated] = useState(false);
  const observeLabelRef = useResizeObserver<HTMLSpanElement>((entry) => {
    const label = entry.target as HTMLSpanElement;
    setIsTruncated(label.scrollWidth > label.clientWidth);
  });

  const setLabelRef = (node: HTMLSpanElement | null): void => {
    observeLabelRef(node);
    if (node) {
      setIsTruncated(node.scrollWidth > node.clientWidth);
    }
  };

  return (
    <Dropdown.Item
      LeftIcon={BranchIcon}
      tooltipText={isTruncated ? branch : undefined}
      tooltipSide="top"
      tooltipAlign="start"
      disabled={disabled}
      RightIcon={branch === currentBranch ? CheckMdIcon : undefined}
      SubText={
        branch === currentBranch && fileCount > 0 ? (
          <span className="ml-5 inline-flex items-center gap-1 text-xs whitespace-normal text-token-input-placeholder-foreground">
            <FormattedMessage
              id="composer.footer.branchSwitch.uncommittedSummaryPrefix"
              defaultMessage="Uncommited: {fileCount, plural, one {# file} other {# files}}"
              description="Prefix shown under the active branch in the branch dropdown when there are uncommitted tracked changes"
              values={{
                fileCount,
              }}
            />
            {showDiffStats ? (
              <TaskDiffStats
                className="inline-flex"
                linesAdded={diffAdditions}
                linesRemoved={diffDeletions}
              />
            ) : null}
          </span>
        ) : null
      }
      onSelect={onSelect}
    >
      <span ref={setLabelRef} className="block truncate">
        {branch}
      </span>
    </Dropdown.Item>
  );
}

function CreateAndCheckoutDialog({
  open,
  onOpenChange,
  name,
  setName,
  hasTrailingSlash,
  alreadyExists,
  canSubmit,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  setName: (name: string) => void;
  hasTrailingSlash: boolean;
  alreadyExists: boolean;
  canSubmit: boolean;
  isPending: boolean;
  onSubmit: () => Promise<void>;
}): React.ReactElement {
  const intl = useIntl();

  return (
    <Dialog size="feature" open={open} onOpenChange={onOpenChange}>
      <DialogBody>
        <DialogSection>
          <DialogHeader
            title={
              <FormattedMessage
                id="composer.footer.branchSwitch.createDialog.title"
                defaultMessage="Create and checkout branch"
                description="Title for dialog that creates and checks out a new branch from the composer footer"
              />
            }
          />
        </DialogSection>
        <DialogSection className="flex flex-col gap-2">
          <BranchNameFieldHeader />
          <input
            autoFocus
            className="h-10 w-full rounded-xl border border-token-border bg-token-dropdown-background px-3 text-sm text-token-foreground outline-none placeholder:text-token-description-foreground"
            value={name}
            onChange={(event) => {
              setName(sanitizeBranchNameInput(event.target.value));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void onSubmit();
              }
            }}
            placeholder={intl.formatMessage({
              id: "composer.footer.branchSwitch.createDialog.placeholder",
              defaultMessage: "new-branch",
              description:
                "Placeholder for branch name input in the composer footer create-and-checkout dialog",
            })}
            aria-label={intl.formatMessage({
              id: "composer.footer.branchSwitch.createDialog.ariaLabel",
              defaultMessage: "Branch name",
              description:
                "Aria label for branch name input in the composer footer create-and-checkout dialog",
            })}
          />
          {hasTrailingSlash ? (
            <p className="text-token-danger text-xs">
              <FormattedMessage
                id="composer.footer.branchSwitch.createDialog.trailingSlashError"
                defaultMessage="Branch name cannot end with “/”."
                description="Validation message shown in the create-and-checkout branch dialog when branch name ends with a slash"
              />
            </p>
          ) : alreadyExists && !isPending ? (
            <p className="text-token-danger text-xs">
              <FormattedMessage
                id="composer.footer.branchSwitch.createDialog.branchExistsError"
                defaultMessage="Branch already exists."
                description="Validation message shown in the create-and-checkout branch dialog when the entered branch already exists"
              />
            </p>
          ) : null}
        </DialogSection>
        <DialogSection>
          <DialogFooter>
            <Button
              color="secondary"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              <FormattedMessage
                id="composer.footer.branchSwitch.createDialog.close"
                defaultMessage="Close"
                description="Secondary button label in create-and-checkout branch dialog shown from the composer footer"
              />
            </Button>
            <Button
              color="primary"
              disabled={!canSubmit}
              loading={isPending}
              onClick={() => {
                void onSubmit();
              }}
            >
              <FormattedMessage
                id="composer.footer.branchSwitch.createDialog.createAndCheckout"
                defaultMessage="Create and checkout"
                description="Primary button label in create-and-checkout branch dialog shown from the composer footer"
              />
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}

function UncommittedChangesDialog({
  open,
  onOpenChange,
  conflictFiles,
  diffFiles,
  targetBranch,
  fileCount,
  showDiffStats,
  diffAdditions,
  diffDeletions,
  onContinue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictFiles: Array<string>;
  diffFiles: Array<CodexDiffFile>;
  targetBranch: string | null;
  fileCount: number;
  showDiffStats: boolean;
  diffAdditions: number;
  diffDeletions: number;
  onContinue: () => void;
}): React.ReactElement {
  const intl = useIntl();
  const resolvedTargetBranch =
    targetBranch ??
    intl.formatMessage({
      id: "composer.footer.branchSwitch.uncommittedDialog.targetBranchFallback",
      defaultMessage: "the selected branch",
      description:
        "Fallback branch label in the uncommitted changes dialog when the target branch name is unavailable",
    });
  const hasConflictFiles = conflictFiles.length > 0;

  return (
    <Dialog size="feature" open={open} onOpenChange={onOpenChange}>
      <DialogBody>
        <DialogSection>
          <DialogHeader
            title={
              <FormattedMessage
                id="composer.footer.branchSwitch.uncommittedDialog.title"
                defaultMessage="Commit changes to switch branch"
                description="Title for dialog shown when branch switching is blocked by uncommitted changes"
              />
            }
          />
        </DialogSection>
        <DialogSection className="text-token-description-foreground">
          {hasConflictFiles ? (
            <div className="flex flex-col gap-2 text-sm">
              <FormattedMessage
                id="composer.footer.branchSwitch.uncommittedDialog.conflict.bodyPrefix"
                defaultMessage="Your changes to the following files would be overwritten by checkout:"
                description="Message shown in the uncommitted changes dialog before listing files that block checkout"
              />
              <div className="flex flex-col gap-1">
                {conflictFiles.map((filePath, index) => {
                  const conflictFileDiffStats = getConflictFileDiffStats(
                    filePath,
                    diffFiles,
                  );
                  return (
                    <div
                      key={`${filePath}:${index}`}
                      className="inline-flex items-center gap-1 text-token-foreground"
                    >
                      <span>{filePath}</span>
                      {conflictFileDiffStats != null ? (
                        <TaskDiffStats
                          className="inline-flex align-middle"
                          linesAdded={conflictFileDiffStats.linesAdded}
                          linesRemoved={conflictFileDiffStats.linesRemoved}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <FormattedMessage
                id="composer.footer.branchSwitch.uncommittedDialog.conflict.bodySuffix"
                defaultMessage="Please commit your changes to continue"
                description="Message shown in the uncommitted changes dialog after listing files that block checkout"
              />
            </div>
          ) : showDiffStats ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <FormattedMessage
                id="composer.footer.branchSwitch.uncommittedDialog.bodyPrefix.withDiff"
                defaultMessage="Commit"
                description="Body prefix in the uncommitted changes dialog before diff stats"
              />
              <TaskDiffStats
                className="inline-flex align-middle"
                linesAdded={diffAdditions}
                linesRemoved={diffDeletions}
              />
              <FormattedMessage
                id="composer.footer.branchSwitch.uncommittedDialog.bodySuffix.withDiff"
                defaultMessage="changes in {fileCount, plural, one {# file} other {# files}} to check out {branchName}."
                description="Body suffix in the uncommitted changes dialog after diff stats, including file count and target branch"
                values={{
                  fileCount,
                  branchName: resolvedTargetBranch,
                }}
              />
            </span>
          ) : (
            <FormattedMessage
              id="composer.footer.branchSwitch.uncommittedDialog.body.noDiff"
              defaultMessage="Commit changes in {fileCount, plural, one {# file} other {# files}} to check out {branchName}."
              description="Body text in the uncommitted changes dialog when diff stats are unavailable"
              values={{
                fileCount,
                branchName: resolvedTargetBranch,
              }}
            />
          )}
        </DialogSection>
        <DialogSection>
          <DialogFooter>
            <Button
              color="secondary"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              <FormattedMessage
                id="composer.footer.branchSwitch.uncommittedDialog.cancel"
                defaultMessage="Cancel"
                description="Secondary button label in branch switching blocked dialog shown in the composer footer"
              />
            </Button>
            <Button color="primary" onClick={onContinue}>
              <FormattedMessage
                id="composer.footer.branchSwitch.uncommittedDialog.commit"
                defaultMessage="Commit and switch branch…"
                description="Primary button label in branch switching blocked dialog shown in the composer footer"
              />
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}

function getOrderedBranches({
  branches,
  currentBranch,
  defaultBranch,
}: {
  branches: Array<string>;
  currentBranch: string;
  defaultBranch?: string | null;
}): Array<string> {
  const seen = new Set<string>();
  const orderedBranches: Array<string> = [];
  addBranchOption(defaultBranch, orderedBranches, seen);
  addBranchOption(currentBranch, orderedBranches, seen);
  branches.forEach((branch) => {
    addBranchOption(branch, orderedBranches, seen);
  });
  return orderedBranches;
}

function addBranchOption(
  branch: string | null | undefined,
  branches: Array<string>,
  seen: Set<string>,
): void {
  if (!branch || seen.has(branch)) {
    return;
  }
  seen.add(branch);
  branches.push(branch);
}

function toTrackedDiffFiles(
  trackedChanges: GitTrackedUncommittedChangesResult | undefined,
): Array<CodexDiffFile> | null {
  if (trackedChanges?.trackedChanges.type !== "success") {
    return null;
  }
  return parseDiff(trackedChanges.trackedChanges.unifiedDiff);
}

function getTrackedPathCount(
  trackedChanges: GitTrackedUncommittedChangesResult | undefined,
): number | null {
  if (trackedChanges?.trackedChanges.type !== "success") {
    return null;
  }
  const paths = getTrackedPathsFromUnifiedDiff(
    trackedChanges.trackedChanges.unifiedDiff,
  );
  return paths.length;
}

function getTrackedPathsFromUnifiedDiff(unifiedDiff: string): Array<string> {
  const uniquePaths = new Set<string>();
  const lines = unifiedDiff.split("\n");
  const diffHeaderPattern = /^diff --git a\/(.+?) b\/(.+)$/;

  lines.forEach((line) => {
    const match = diffHeaderPattern.exec(line);
    if (match == null) {
      return;
    }
    const pathA = match[1];
    const pathB = match[2];
    const normalizedPath = pathB.length > 0 ? pathB : pathA;
    uniquePaths.add(normalizedPath);
  });

  return Array.from(uniquePaths);
}

function getConflictFileDiffStats(
  filePath: string,
  diffFiles: Array<CodexDiffFile>,
): { linesAdded: number; linesRemoved: number } | null {
  const normalizedFilePath = normalizeConflictFilePath(filePath);
  const matchingDiffFile = diffFiles.find((diffFile) => {
    const diffFilePaths = [
      diffFile.metadata.name,
      diffFile.oldPath,
      diffFile.newPath,
    ];
    return diffFilePaths.some((diffFilePath) => {
      return normalizeConflictFilePath(diffFilePath) === normalizedFilePath;
    });
  });
  if (matchingDiffFile == null) {
    return null;
  }
  return {
    linesAdded: matchingDiffFile.additions,
    linesRemoved: matchingDiffFile.deletions,
  };
}

function normalizeConflictFilePath(path: string): string {
  const trimmedPath = path.trim();
  const unquotedPath =
    (trimmedPath.startsWith(`"`) && trimmedPath.endsWith(`"`)) ||
    (trimmedPath.startsWith(`'`) && trimmedPath.endsWith(`'`))
      ? trimmedPath.slice(1, -1)
      : trimmedPath;
  const withoutRelativePrefix = unquotedPath.startsWith("./")
    ? unquotedPath.slice(2)
    : unquotedPath;
  if (
    withoutRelativePrefix.startsWith("a/") ||
    withoutRelativePrefix.startsWith("b/")
  ) {
    return withoutRelativePrefix.slice(2);
  }
  return withoutRelativePrefix;
}

function sanitizeBranchNameInput(name: string): string {
  return Array.from(name)
    .filter((char) => {
      return !/\s/u.test(char) && !UNSUPPORTED_BRANCH_NAME_CHARACTERS.has(char);
    })
    .join("");
}
