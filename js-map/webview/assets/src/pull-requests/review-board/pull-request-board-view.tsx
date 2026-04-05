import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useScope } from "maitai";
import {
  createGitCwd,
  GlobalStateKey,
  type GhPullRequestBoardItem,
} from "protocol";
import { useState, type ReactElement } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { AppHeader } from "@/components/app/app-header";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { LargeEmptyState } from "@/components/large-empty-state";
import { Spinner } from "@/components/spinner";
import { toast$ } from "@/components/toaster/toast-signal";
import { Tooltip } from "@/components/tooltip";
import { useGlobalState } from "@/hooks/use-global-state";
import BranchIcon from "@/icons/branch.svg";
import ChevronIcon from "@/icons/chevron.svg";
import EyeIcon from "@/icons/eye.svg";
import GitHubMarkIcon from "@/icons/github-mark.svg";
import { useGhMergePullRequest } from "@/local-conversation/git-actions/pull-request/use-gh-merge-pull-request";
import { PullRequestVisualStateIcon } from "@/pull-requests/pull-request-status";
import { AppScope } from "@/scopes/app-scope";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { getQueryKey, useFetchFromVSCode } from "@/vscode-api";

import {
  buildPullRequestBoardColumns,
  getHiddenPullRequestBoardStates,
  type PullRequestBoardColumn,
  type PullRequestBoardRepoOption,
} from "./pull-request-board-model";

const columnMessages = defineMessages({
  draft: {
    id: "pullRequestsPage.column.draft",
    defaultMessage: "Draft",
    description: "Board column label for draft pull requests",
  },
  failing: {
    id: "pullRequestsPage.column.failing",
    defaultMessage: "Failing",
    description: "Board column label for failing pull requests",
  },
  inProgress: {
    id: "pullRequestsPage.column.inProgress",
    defaultMessage: "In-progress",
    description: "Board column label for in-progress pull requests",
  },
  merged: {
    id: "pullRequestsPage.column.merged",
    defaultMessage: "Merged",
    description: "Board column label for merged pull requests",
  },
  ready: {
    id: "pullRequestsPage.column.ready",
    defaultMessage: "Ready",
    description: "Board column label for ready pull requests",
  },
});

export function PullRequestBoardView({
  repoOption,
  repoOptions,
  selectedRepoKey,
  onSelectRepo,
}: {
  repoOption: PullRequestBoardRepoOption | null;
  repoOptions: Array<PullRequestBoardRepoOption>;
  selectedRepoKey: string | null;
  onSelectRepo: (nextRepoKey: string) => void;
}): ReactElement {
  const intl = useIntl();
  const { data: pullRequestBoardData, isLoading: isLoadingPullRequestBoard } =
    useFetchFromVSCode("gh-pr-board", {
      params: {
        cwd: createGitCwd(repoOption?.cwd ?? "/"),
        hostId: repoOption?.hostId,
        repo: repoOption?.repo ?? null,
      },
      queryConfig: {
        enabled: repoOption != null,
        intervalMs: QUERY_STALE_TIME.FIVE_SECONDS,
        staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
      },
    });
  const { data: pullRequestMergeMethod } = useGlobalState(
    GlobalStateKey.GIT_PULL_REQUEST_MERGE_METHOD,
  );
  const items =
    pullRequestBoardData?.status === "success"
      ? pullRequestBoardData.items
      : [];
  const boardColumns = buildPullRequestBoardColumns(items);
  const hiddenColumnStates = getHiddenPullRequestBoardStates(items);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader>
        <div className="draggable flex w-full min-w-0 items-center justify-between gap-3 electron:h-toolbar browser:h-toolbar extension:py-row-y">
          <div className="min-w-0 text-base font-medium text-token-foreground">
            <FormattedMessage
              id="pullRequestsPage.title"
              defaultMessage="Pull requests"
              description="Header title for the pull requests page"
            />
          </div>
          <div className="flex items-center gap-2">
            {hiddenColumnStates.length > 0 ? (
              <PullRequestHiddenColumnsButton
                hiddenColumnStates={hiddenColumnStates}
                intl={intl}
              />
            ) : null}
            <PullRequestRepoDropdown
              repoOptions={repoOptions}
              selectedRepoKey={selectedRepoKey}
              onSelect={onSelectRepo}
            />
          </div>
        </div>
      </AppHeader>
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        {pullRequestBoardData?.status === "error" ? (
          <CenteredPullRequestsEmptyState
            description={intl.formatMessage({
              id: "pullRequestsPage.error.description",
              defaultMessage:
                "Check your GitHub CLI auth and try again in a moment.",
              description: "Description for the pull requests page error state",
            })}
            title={intl.formatMessage({
              id: "pullRequestsPage.error.title",
              defaultMessage: "Couldn’t load pull requests",
              description: "Title for the pull requests page error state",
            })}
          />
        ) : isLoadingPullRequestBoard ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <CenteredPullRequestsEmptyState
            description={intl.formatMessage({
              id: "pullRequestsPage.empty.noPullRequests.description",
              defaultMessage:
                "Your recent authored pull requests for this repo will appear here.",
              description:
                "Description for the pull requests page empty state when the selected repo has no pull requests",
            })}
            title={intl.formatMessage({
              id: "pullRequestsPage.empty.noPullRequests.title",
              defaultMessage: "No pull requests yet",
              description:
                "Title for the pull requests page empty state when the selected repo has no pull requests",
            })}
          />
        ) : (
          <div className="flex w-max items-start gap-5 px-5 py-5">
            {boardColumns.map((column) => (
              <PullRequestBoardColumnView
                key={column.key}
                column={column}
                hostId={repoOption?.hostId}
                mergeMethod={pullRequestMergeMethod ?? "merge"}
                repo={repoOption?.repo ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CenteredPullRequestsEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}): ReactElement {
  return (
    <div className="flex h-full min-h-full items-center justify-center">
      <LargeEmptyState description={description} title={title} />
    </div>
  );
}

function PullRequestBoardColumnView({
  column,
  hostId,
  mergeMethod,
  repo,
}: {
  column: PullRequestBoardColumn;
  hostId?: string;
  mergeMethod: "merge" | "squash";
  repo: string | null;
}): ReactElement {
  return (
    <div className="flex w-[304px] min-w-0 flex-col gap-3">
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-token-foreground">
        <PullRequestVisualStateIcon className="icon-sm" state={column.key} />
        {renderColumnLabel(column.key)}
      </div>
      {column.items.map((item) => (
        <PullRequestBoardCard
          key={`${column.key}-${item.number}`}
          hostId={hostId}
          item={item}
          mergeMethod={mergeMethod}
          repo={repo}
        />
      ))}
    </div>
  );
}

function PullRequestRepoDropdown({
  repoOptions,
  selectedRepoKey,
  onSelect,
}: {
  repoOptions: Array<PullRequestBoardRepoOption>;
  selectedRepoKey: string | null;
  onSelect: (nextRepoKey: string) => void;
}): ReactElement {
  const selectedRepo =
    repoOptions.find((repoOption) => repoOption.key === selectedRepoKey) ??
    repoOptions[0] ??
    null;
  const [open, setOpen] = useState(false);

  return (
    <BasicDropdown
      onOpenChange={setOpen}
      open={open}
      triggerButton={
        <Button
          color="outline"
          size="toolbar"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <GitHubMarkIcon className="icon-sm shrink-0" />
          <span className="max-w-[220px] truncate">
            {selectedRepo?.label ?? repoOptions[0]?.label}
          </span>
          <ChevronIcon
            className={clsx(
              "icon-2xs text-token-input-placeholder-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
      }
    >
      {repoOptions.map((repoOption) => (
        <Dropdown.Item
          className={
            repoOption.key === selectedRepoKey ? "font-medium" : undefined
          }
          key={repoOption.key}
          onClick={() => {
            onSelect(repoOption.key);
            setOpen(false);
          }}
        >
          {repoOption.label}
        </Dropdown.Item>
      ))}
    </BasicDropdown>
  );
}

function PullRequestHiddenColumnsButton({
  hiddenColumnStates,
  intl,
}: {
  hiddenColumnStates: Array<GhPullRequestBoardItem["state"]>;
  intl: ReturnType<typeof useIntl>;
}): ReactElement {
  return (
    <Tooltip
      align="end"
      delayOpen
      side="bottom"
      tooltipContent={
        <div className="flex min-w-[140px] flex-col gap-1">
          <div className="text-xs font-medium text-token-foreground">
            <FormattedMessage
              id="pullRequestsPage.hiddenColumns.tooltipTitle"
              defaultMessage="Hidden columns"
              description="Tooltip title for hidden pull request board columns"
            />
          </div>
          <div className="text-xs text-token-description-foreground">
            {hiddenColumnStates.map((state) => (
              <div key={state}>
                {intl.formatMessage(getColumnLabelDescriptor(state))}
              </div>
            ))}
          </div>
        </div>
      }
    >
      <Button
        aria-label={intl.formatMessage(
          {
            id: "pullRequestsPage.hiddenColumns.ariaLabel",
            defaultMessage:
              "{count} hidden {count, plural, one {column} other {columns}}",
            description:
              "ARIA label for the hidden pull request board columns button",
          },
          { count: hiddenColumnStates.length },
        )}
        color="ghost"
        size="toolbar"
      >
        <EyeIcon className="icon-sm shrink-0" />
        <span>
          <FormattedMessage
            id="pullRequestsPage.hiddenColumns.button"
            defaultMessage="{count} hidden"
            description="Button label for hidden pull request board columns"
            values={{ count: hiddenColumnStates.length }}
          />
        </span>
      </Button>
    </Tooltip>
  );
}

function PullRequestBoardCard({
  hostId,
  item,
  mergeMethod,
  repo,
}: {
  hostId?: string;
  item: GhPullRequestBoardItem;
  mergeMethod: "merge" | "squash";
  repo: string | null;
}): ReactElement {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const scope = useScope(AppScope);
  const mergePullRequestMutation = useGhMergePullRequest({
    cwd: item.cwd,
    headBranch: item.headBranch,
    hostId,
    onSuccess: (result, variables) => {
      if (result.status !== "success") {
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: getQueryKey("gh-pr-board", {
          cwd: variables.cwd,
          hostId: variables.hostId,
          repo,
        }),
      });
      scope.get(toast$).success(
        intl.formatMessage({
          id: "pullRequestsPage.card.merge.success",
          defaultMessage: "Merged pull request",
          description: "Toast shown when a board merge succeeds",
        }),
      );
    },
  });

  return (
    <div className="group relative flex w-full flex-col gap-1 rounded-xl bg-token-bg-fog px-4 py-3 text-left transition-colors hover:bg-token-foreground/6">
      <button
        aria-label={item.title}
        className="absolute inset-0 rounded-xl focus-visible:ring-1 focus-visible:ring-token-focus-border focus-visible:outline-none"
        onClick={() => {
          window.open(item.url, "_blank", "noopener,noreferrer");
        }}
        type="button"
      />
      <div className="pointer-events-none relative z-10 flex items-baseline gap-2">
        <div className="min-w-0 flex-1 truncate text-[13px] leading-6 font-medium text-token-foreground">
          {item.title}
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[12px] leading-[22px] font-semibold text-token-description-foreground">
          <FormattedMessage
            id="pullRequestsPage.card.diffStats"
            defaultMessage="+{additions} -{deletions}"
            description="Diff stats shown on a pull request board card"
            values={{
              additions: item.additions,
              deletions: item.deletions,
            }}
          />
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-between gap-2 text-[12px] leading-[22px] text-token-description-foreground">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex min-w-0 items-center gap-1 truncate">
            <BranchIcon className="icon-2xs shrink-0" />
            <span className="truncate">
              <FormattedMessage
                id="pullRequestsPage.card.branchPair"
                defaultMessage="{headBranch} to {baseBranch}"
                description="Branch pair shown on a pull request board card"
                values={{
                  baseBranch: item.baseBranch,
                  headBranch: item.headBranch,
                }}
              />
            </span>
          </span>
        </div>
        {item.state === "ready" ? (
          <Button
            className="rounded-full px-3 text-[12px] leading-[22px]"
            color="secondary"
            loading={mergePullRequestMutation.isPending}
            size="default"
            onClick={async () => {
              const result = await mergePullRequestMutation.mutateAsync({
                cwd: item.cwd,
                mergeMethod,
                number: item.number,
                repo,
              });
              if (result.status === "success") {
                return;
              }
              scope.get(toast$).danger(result.error);
            }}
          >
            {mergeMethod === "squash" ? (
              <FormattedMessage
                id="pullRequestsPage.card.squashMerge"
                defaultMessage="Squash"
                description="Button label for a ready pull request card when squash merge is selected"
              />
            ) : (
              <FormattedMessage
                id="pullRequestsPage.card.merge"
                defaultMessage="Merge"
                description="Button label for a ready pull request card"
              />
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function renderColumnLabel(
  state: GhPullRequestBoardItem["state"],
): ReactElement {
  return <FormattedMessage {...getColumnLabelDescriptor(state)} />;
}

function getColumnLabelDescriptor(state: GhPullRequestBoardItem["state"]): {
  defaultMessage: string;
  description: string;
  id: string;
} {
  switch (state) {
    case "draft":
      return columnMessages.draft;
    case "failing":
      return columnMessages.failing;
    case "in_progress":
      return columnMessages.inProgress;
    case "merged":
      return columnMessages.merged;
    case "ready":
      return columnMessages.ready;
  }
}
