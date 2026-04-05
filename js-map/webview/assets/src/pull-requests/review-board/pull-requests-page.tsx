import { useAtom } from "jotai";
import type { ReactElement } from "react";
import { useIntl } from "react-intl";
import { useNavigate, useSearchParams } from "react-router";

import { LargeEmptyState } from "@/components/large-empty-state";
import { Spinner } from "@/components/spinner";
import { useWorkspaceGroups } from "@/sidebar/use-repository-task-groups";
import { persistedAtom } from "@/utils/persisted-atom";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useFetchFromVSCode } from "@/vscode-api";

import {
  buildPullRequestBoardRepoOptions,
  getSelectedPullRequestBoardRepoOption,
} from "./pull-request-board-model";
import { PullRequestBoardView } from "./pull-request-board-view";

const aLastSelectedPullRequestBoardRepoKey = persistedAtom<string | null>(
  "pull-request-board:last-selected-repo-key",
  null,
);

export function PullRequestsPage(): ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [persistedRepoKey, setPersistedRepoKey] = useAtom(
    aLastSelectedPullRequestBoardRepoKey,
  );
  const requestedRepoKey = searchParams.get("repoKey");
  const workspaceGroups = useWorkspaceGroups();
  const { isLoading: isLoadingWorkspaceRootOptions } = useFetchFromVSCode(
    "workspace-root-options",
    {
      queryConfig: {
        staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
      },
    },
  );
  const { data: gitOriginsData, isLoading: isLoadingGitOrigins } =
    useFetchFromVSCode("git-origins", {
      queryConfig: {
        staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
      },
    });
  const repoOptions = buildPullRequestBoardRepoOptions({
    gitOrigins: gitOriginsData?.origins ?? [],
    workspaceGroups,
  });
  const selectedRepo = getSelectedPullRequestBoardRepoOption({
    repoOptions,
    requestedRepoKey: requestedRepoKey ?? persistedRepoKey,
  });
  const isLoading = isLoadingWorkspaceRootOptions || isLoadingGitOrigins;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (repoOptions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <LargeEmptyState
          description={intl.formatMessage({
            id: "pullRequestsPage.empty.noRepos.description",
            defaultMessage:
              "Add a workspace with a GitHub remote to populate this board.",
            description:
              "Description for the pull requests page empty state when no repos are available",
          })}
          title={intl.formatMessage({
            id: "pullRequestsPage.empty.noRepos.title",
            defaultMessage: "No GitHub repos available",
            description:
              "Title for the pull requests page empty state when no repos are available",
          })}
        />
      </div>
    );
  }

  return (
    <PullRequestBoardView
      repoOption={selectedRepo}
      repoOptions={repoOptions}
      selectedRepoKey={selectedRepo?.key ?? null}
      onSelectRepo={(nextRepoKey) => {
        setPersistedRepoKey(nextRepoKey);
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set("repoKey", nextRepoKey);
        void navigate({
          pathname: "/pull-requests",
          search: `?${nextSearchParams.toString()}`,
        });
      }}
    />
  );
}
