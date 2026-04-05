import clsx from "clsx";
import type { AsyncThreadStartingState, HostConfig } from "protocol";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useSearchBranchesByRepository } from "@/codex-api";
import { Badged } from "@/components/badged";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Spinner } from "@/components/spinner";
import { Tooltip } from "@/components/tooltip";
import { WithWindow } from "@/components/with-window";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { useGitDefaultBranch } from "@/git-rpc/use-git-default-branch";
import { useGitRecentBranches } from "@/git-rpc/use-git-recent-branches";
import { useHasGitRpc } from "@/git-rpc/use-git-stable-metadata";
import { useGitStatusSummary } from "@/git-rpc/use-git-status-summary";
import BranchIcon from "@/icons/branch.svg";
import CheckMdIcon from "@/icons/check-md.svg";
import ChevronIcon from "@/icons/chevron.svg";
import RegenerateIcon from "@/icons/regenerate.svg";
import { useGitRootFromEnvironment } from "@/utils/git-root";

import "prosemirror-view/style/prosemirror.css";
import { useDebouncedValue } from "@/utils/use-debounced-value";
import { useEnvironment } from "@/utils/use-environment";

/**
 * Starting state selector shared by async tasks (cloud + worktree).
 */
export function AsyncTaskStartingStateDropdown({
  startingState,
  setStartingState,
  hostConfig,
  className,
  gitRootOverride,
  branchSource,
  hideLabel = false,
}: {
  startingState: AsyncThreadStartingState;
  setStartingState: (state: AsyncThreadStartingState) => void;
  hostConfig: HostConfig;
  className?: string;
  gitRootOverride?: string | null;
  branchSource: "cloud" | "worktree";
  hideLabel?: boolean;
}): React.ReactElement {
  const intl = useIntl();
  const env = useEnvironment();
  const gitRootFromEnv = useGitRootFromEnvironment();
  const gitRoot = gitRootOverride ?? gitRootFromEnv;
  const repo = env ? (env.repo_map ?? {})[env.repos[0]] : null;
  const remoteDefaultBranch = repo?.default_branch ?? "main";
  const repoId = repo?.id ?? null;
  const hasGitRpc = useHasGitRpc();
  const isWorktreeSource = branchSource === "worktree";
  const useLocalBranches = isWorktreeSource || (hasGitRpc && !!gitRootOverride);

  const [open, _setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  const setOpen = useCallback(
    (value: boolean) => {
      _setOpen(value);
      if (!value) {
        setSearchQuery("");
      }
    },
    [_setOpen, setSearchQuery],
  );

  const {
    data: remoteSearchedBranches,
    isFetching: remoteBranchesFetching,
    error: remoteBranchesError,
    hasNextPage: remoteHasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch: refetchRemoteBranches,
  } = useSearchBranchesByRepository(repoId, debouncedQuery, {
    enabled: !useLocalBranches && !!repoId && open && !!debouncedQuery,
  });

  const {
    data: currentBranch,
    isLoading: currentBranchLoading,
    refetch: refetchCurrentBranch,
  } = useGitCurrentBranch(gitRoot, hostConfig);
  const { data: statusSummary } = useGitStatusSummary(gitRoot, hostConfig, {
    enabled: useLocalBranches && !!gitRoot,
  });
  const {
    branches: localBranches,
    defaultBranch: localDefaultBranch,
    fetching: localBranchesFetching,
    error: localBranchesError,
    refetch: refetchLocalBranches,
  } = useWorktreeBranches({
    gitRoot,
    hostConfig,
    currentBranch: currentBranch ?? "main",
    remoteDefaultBranch,
    enabled: useLocalBranches && open,
  });

  const selectedBranch =
    startingState.type === "branch" ? startingState.branchName : undefined;
  const normalizedQuery = debouncedQuery?.toLowerCase() ?? "";
  const defaultBranch = useLocalBranches
    ? localDefaultBranch
    : remoteDefaultBranch;
  const sourceBranches =
    useLocalBranches || normalizedQuery
      ? useLocalBranches
        ? localBranches
        : (remoteSearchedBranches ?? [])
      : [];
  const branchList = normalizedQuery
    ? sourceBranches.filter((branch) =>
        branch.toLowerCase().includes(normalizedQuery),
      )
    : sourceBranches;
  const showDefaultBranch =
    !normalizedQuery ||
    defaultBranch.toLowerCase().includes(normalizedQuery.toLowerCase());
  const filteredBranches =
    branchList?.filter((branchName) => branchName !== defaultBranch) ?? [];
  const branchesFetching = useLocalBranches
    ? localBranchesFetching
    : remoteBranchesFetching;
  const branchesError = useLocalBranches
    ? localBranchesError
    : remoteBranchesError;
  const refetchBranches = useLocalBranches
    ? refetchLocalBranches
    : refetchRemoteBranches;
  const hasNextPage = !useLocalBranches && remoteHasNextPage;
  const loadMoreBranches = !useLocalBranches ? fetchNextPage : undefined;
  const workingTreeBranchLabel = currentBranch ?? defaultBranch;
  const branchLabel =
    startingState.type === "branch"
      ? startingState.branchName
      : workingTreeBranchLabel;
  const hasLocalChanges =
    statusSummary?.type === "success"
      ? statusSummary.stagedCount +
          statusSummary.unstagedCount +
          statusSummary.untrackedCount >
        0
      : false;
  const showLocalFileStateSection = useLocalBranches && hasLocalChanges;
  const showLocalWorkingTreeLabel =
    startingState.type === "working-tree" && hasLocalChanges;

  const label = (
    <>
      <WithWindow electron>
        {startingState.type === "working-tree" ? (
          <FormattedMessage
            id="composer.remote.fromCurrentBranch"
            defaultMessage="From {branch} (current)"
            description="Label for the current branch starting point in the composer"
            values={{ branch: currentBranch ?? defaultBranch }}
          />
        ) : (
          <FormattedMessage
            id="composer.remote.fromBranch"
            defaultMessage="From {branch}"
            description="Label for a specific branch starting point in the composer"
            values={{ branch: startingState.branchName }}
          />
        )}
      </WithWindow>
      <WithWindow extension browser>
        {showLocalWorkingTreeLabel ? (
          <FormattedMessage
            id="composer.remote.localWorkingTree"
            defaultMessage="Use local changes"
            description="Label for local working tree selection in remote composer"
          />
        ) : (
          branchLabel
        )}
      </WithWindow>
    </>
  );

  useEffect(() => {
    if (open) {
      void refetchCurrentBranch();
      if (useLocalBranches) {
        void refetchLocalBranches();
      }
    }
  }, [open, refetchCurrentBranch, refetchLocalBranches, useLocalBranches]);

  return (
    <BasicDropdown
      side="top"
      open={open}
      onOpenChange={setOpen}
      triggerButton={
        <Tooltip
          tooltipContent={
            <div className="flex flex-col gap-2">
              <FormattedMessage
                id="composer.remote.branchStartingPoint"
                defaultMessage="What branch should this task start from?"
                description="Section label for branch starting point selector"
              />
            </div>
          }
        >
          <Button
            size="composerSm"
            color="ghost"
            className={clsx("whitespace-nowrap", className)}
          >
            <Badged
              borderColor="border-token-side-bar-background"
              badgeEnabled={
                startingState?.type === "working-tree" && hasLocalChanges
              }
            >
              <BranchIcon className="icon-2xs" />
            </Badged>
            {!hideLabel ? (
              <span className="composer-footer__label--sm composer-footer__secondary-label max-w-40 truncate">
                {label}
              </span>
            ) : null}
            <ChevronIcon className="composer-footer__secondary-chevron icon-2xs text-token-input-placeholder-foreground" />
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
          onChange={(e) => {
            const next = e.currentTarget.value;
            setSearchQuery(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setOpen(false);
            }
          }}
        />
        <div className="vertical-scroll-fade-mask flex h-[200px] flex-col gap-1.5 overflow-y-auto">
          {showLocalFileStateSection ? (
            <div className="flex flex-col">
              <SectionHeading>
                <FormattedMessage
                  id="composer.remote.localFileStateHeading"
                  defaultMessage="Local file state"
                  description="Section heading for local working tree selection"
                />
              </SectionHeading>

              <Dropdown.Item
                LeftIcon={BadgedBranchIcon}
                RightIcon={
                  startingState.type === "working-tree"
                    ? CheckMdIcon
                    : undefined
                }
                SubText={
                  hasLocalChanges ? (
                    <span className="text-token-description-foreground">
                      <FormattedMessage
                        id="composer.remote.currentEditsSuffix.useLocal"
                        defaultMessage="with local code changes"
                        description="Suffix text indicating the selection includes current edits"
                      />
                    </span>
                  ) : undefined
                }
                onClick={() => {
                  setStartingState({ type: "working-tree" });
                  setOpen(false);
                }}
              >
                {currentBranchLoading ? null : (
                  <>{currentBranch ?? defaultBranch}</>
                )}
              </Dropdown.Item>
            </div>
          ) : null}
          <SectionHeading>
            <FormattedMessage
              id="composer.remote.branchesSectionHeading"
              defaultMessage="Branches"
              description="Section heading for remote branch search results"
            />
          </SectionHeading>
          {debouncedQuery && branchesFetching ? (
            <div className="flex h-full items-center justify-center">
              <Spinner className="icon-xxs" />
            </div>
          ) : debouncedQuery && branchesError ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-sm text-token-error-foreground">
              <FormattedMessage
                id="composer.remote.errorLoadingBranches"
                defaultMessage="Error loading branches"
                description="Error message for remote starting point selector"
              />
              <Button
                color="ghost"
                size="icon"
                className="text-token-description-foreground"
                onClick={() => {
                  void refetchBranches();
                }}
              >
                <RegenerateIcon className="icon-xxs" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col">
              {showDefaultBranch && (
                <Dropdown.Item
                  LeftIcon={BranchIcon}
                  RightIcon={
                    selectedBranch === defaultBranch ? CheckMdIcon : undefined
                  }
                  onClick={() => {
                    setStartingState({
                      type: "branch",
                      branchName: defaultBranch,
                    });
                    setOpen(false);
                  }}
                >
                  {defaultBranch}
                </Dropdown.Item>
              )}
              {filteredBranches.map((b) => (
                <Dropdown.Item
                  key={b}
                  LeftIcon={BranchIcon}
                  RightIcon={b === selectedBranch ? CheckMdIcon : undefined}
                  onClick={() => {
                    setStartingState({ type: "branch", branchName: b });
                    setOpen(false);
                  }}
                >
                  {b}
                </Dropdown.Item>
              ))}
              {hasNextPage && (
                <Dropdown.Item
                  onClick={() => {
                    if (!isFetchingNextPage && loadMoreBranches) {
                      void loadMoreBranches();
                    }
                  }}
                  className="w-full text-sm text-token-text-secondary"
                >
                  {isFetchingNextPage ? (
                    <FormattedMessage
                      id="composer.remote.loadingMoreBranches"
                      defaultMessage="Loading…"
                      description="Loading more branches"
                    />
                  ) : null}
                </Dropdown.Item>
              )}
            </div>
          )}
        </div>
      </div>
    </BasicDropdown>
  );
}

function BadgedBranchIcon({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <Badged borderColor="border-token-side-bar-background">
      <BranchIcon className={className} />
    </Badged>
  );
}

/**
 * Returns local branches/default for a worktree using vscode git queries.
 */
function useWorktreeBranches({
  gitRoot,
  hostConfig,
  currentBranch,
  remoteDefaultBranch,
  enabled,
}: {
  gitRoot?: string | null;
  hostConfig: HostConfig;
  currentBranch: string;
  remoteDefaultBranch?: string | null;
  enabled: boolean;
}): {
  branches: Array<string>;
  defaultBranch: string;
  fetching: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
} {
  const {
    data: gitDefaultBranch,
    isLoading: defaultBranchLoading,
    isFetching: defaultBranchFetching,
    error: defaultBranchError,
    refetch: refetchDefaultBranch,
  } = useGitDefaultBranch(gitRoot, hostConfig, {
    enabled,
  });

  const {
    data: recentBranches,
    isLoading: recentBranchesLoading,
    isFetching: recentBranchesFetching,
    error: recentBranchesError,
    refetch: refetchRecentBranches,
  } = useGitRecentBranches(gitRoot, hostConfig, {
    enabled,
  });

  // Always include the remote default and current branch so the user can pick them even before the overview resolves.
  const resolvedRemoteDefaultBranch = getEligibleRemoteDefaultBranch({
    currentBranch,
    gitDefaultBranch,
    recentBranches,
    remoteDefaultBranch,
  });
  const candidates: Array<string | null | undefined> = [
    gitDefaultBranch,
    currentBranch,
    resolvedRemoteDefaultBranch,
    ...(recentBranches ?? []),
  ];
  const seen = new Set<string>();
  const branches: Array<string> = [];
  candidates.forEach((branch) => {
    pushIfUnique({ branch, list: branches, seen });
  });

  const defaultBranch = branches[0] ?? currentBranch ?? remoteDefaultBranch;
  const fetching =
    defaultBranchLoading ||
    defaultBranchFetching ||
    recentBranchesLoading ||
    recentBranchesFetching;
  const error = defaultBranchError ?? recentBranchesError;
  const refetch = useCallback(async (): Promise<void> => {
    await Promise.all([refetchDefaultBranch(), refetchRecentBranches()]);
  }, [refetchDefaultBranch, refetchRecentBranches]);

  return {
    branches,
    defaultBranch,
    fetching,
    error,
    refetch,
  };
}

function SectionHeading({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        "text-sm text-token-description-foreground px-[var(--padding-row-x)] py-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

function getEligibleRemoteDefaultBranch({
  currentBranch,
  gitDefaultBranch,
  recentBranches,
  remoteDefaultBranch,
}: {
  currentBranch?: string | null;
  gitDefaultBranch?: string | null;
  recentBranches?: Array<string> | null;
  remoteDefaultBranch?: string | null;
}): string | null {
  if (!remoteDefaultBranch) {
    return null;
  }
  if (
    remoteDefaultBranch === currentBranch ||
    remoteDefaultBranch === gitDefaultBranch
  ) {
    return remoteDefaultBranch;
  }
  if (recentBranches?.includes(remoteDefaultBranch)) {
    return remoteDefaultBranch;
  }
  return null;
}

function pushIfUnique({
  branch,
  list,
  seen,
}: {
  branch?: string | null;
  list: Array<string>;
  seen: Set<string>;
}): void {
  if (!branch || seen.has(branch)) {
    return;
  }
  seen.add(branch);
  list.push(branch);
}
