import type { UseMutationResult } from "@tanstack/react-query";
import type {
  GhCliStatus,
  GhCreatePullRequestRequest,
  GhCreatePullRequestResponse,
  GitPushStatus,
} from "protocol";
import { useIntl, type IntlShape } from "react-intl";

import { Spinner } from "@/components/spinner";
import GitHubMarkIcon from "@/icons/github-mark.svg";

import type { GitAction } from "../types";

function getCreatePullRequestBlockedTooltip({
  ghStatus,
  pushStatus,
  allowMissingUpstream,
  intl,
}: {
  ghStatus: GhCliStatus | undefined;
  pushStatus: GitPushStatus | undefined;
  allowMissingUpstream: boolean;
  intl: IntlShape;
}): string | undefined {
  if (!ghStatus) {
    return intl.formatMessage({
      id: "localConversationPage.createPullRequestGhStatusMissing",
      defaultMessage: "Loading GitHub CLI status…",
      description:
        "Tooltip shown when create PR is disabled because the GitHub CLI status is loading",
    });
  }

  if (!ghStatus.isInstalled) {
    return intl.formatMessage({
      id: "localConversationPage.createPullRequestInstallGh",
      defaultMessage: "Install GitHub CLI (gh) to create PRs",
      description:
        "Tooltip shown when create PR is disabled because GitHub CLI is missing",
    });
  }

  if (!ghStatus.isAuthenticated) {
    return intl.formatMessage({
      id: "localConversationPage.createPullRequestAuthGh",
      defaultMessage: "Authenticate GitHub CLI: run `gh auth login`",
      description:
        "Tooltip shown when create PR is disabled because GitHub CLI is not authenticated",
    });
  }

  if (!pushStatus) {
    return intl.formatMessage({
      id: "localConversationPage.createPullRequestPushStatusMissing",
      defaultMessage: "Loading push status…",
      description:
        "Tooltip shown when create PR is disabled because the push status is loading",
    });
  }

  if (!pushStatus.gitRoot) {
    return intl.formatMessage({
      id: "localConversationPage.createPullRequestNoRepo",
      defaultMessage: "No git repository found",
      description:
        "Tooltip shown when create PR is disabled because no git repository is detected",
    });
  }

  if (!pushStatus.defaultBranch) {
    return intl.formatMessage({
      id: "localConversationPage.createPullRequestDefaultBranchMissing",
      defaultMessage: "Default branch information unavailable",
      description:
        "Tooltip shown when create PR is disabled because the default branch cannot be determined",
    });
  }

  if (!pushStatus.branch) {
    return intl.formatMessage({
      id: "localConversationPage.createPullRequestBranchMissing",
      defaultMessage: "Branch information unavailable",
      description:
        "Tooltip shown when create PR is disabled because the current branch cannot be determined",
    });
  }

  if (pushStatus.branch === pushStatus.defaultBranch) {
    return intl.formatMessage({
      id: "localConversationPage.createPullRequestSwitchBranch",
      defaultMessage: "Checkout a feature branch before creating a PR",
      description:
        "Tooltip shown when create PR is disabled because the default branch is active",
    });
  }

  if (!allowMissingUpstream && !pushStatus.upstreamRef) {
    return intl.formatMessage({
      id: "localConversationPage.createPullRequestSetUpstream",
      defaultMessage: "Push this branch before creating a PR",
      description:
        "Tooltip shown when create PR is disabled because the branch has no upstream",
    });
  }

  return undefined;
}

export function useCreatePullRequestAction({
  ghStatus,
  pushStatus,
  isLoadingPRStatus,
  hasOpenPr,
  createPullRequestMutation,
  isPending: isPendingOverride,
  allowMissingUpstream = false,
  ignoreExistingPullRequest = false,
}: {
  ghStatus: GhCliStatus | undefined;
  pushStatus: GitPushStatus | undefined;
  isLoadingPRStatus: boolean;
  hasOpenPr: boolean;
  createPullRequestMutation: UseMutationResult<
    GhCreatePullRequestResponse,
    Error,
    GhCreatePullRequestRequest
  >;
  isPending?: boolean;
  // Used by the commit modal since it pushes before creating the PR.
  allowMissingUpstream?: boolean;
  // Used by the commit modal since a new commit is about to be created.
  ignoreExistingPullRequest?: boolean;
}): GitAction {
  const intl = useIntl();
  const createPullRequestBlockedTooltip = getCreatePullRequestBlockedTooltip({
    ghStatus,
    pushStatus,
    allowMissingUpstream,
    intl,
  });

  const isPending = createPullRequestMutation.isPending || !!isPendingOverride;

  if (ignoreExistingPullRequest && hasOpenPr) {
    return {
      id: "create-pr",
      label: intl.formatMessage({
        id: "localConversationPage.createPullRequestButtonLabel",
        defaultMessage: "Create PR",
        description: "Label for create pull request action",
      }),
      icon: isPending ? Spinner : GitHubMarkIcon,
      disabled: true,
      hidden: true,
      loading: isPending,
      tooltipText: intl.formatMessage({
        id: "localConversationPage.createPullRequestExistingPullRequest",
        defaultMessage: "A pull request already exists for this branch",
        description:
          "Tooltip shown when create PR is disabled because a PR already exists",
      }),
    };
  }

  return {
    id: "create-pr",
    label: isPending
      ? intl.formatMessage({
          id: "localConversationPage.createPullRequestButtonLabel.loading",
          defaultMessage: "Creating PR…",
          description:
            "Label for create pull request action while it is running",
        })
      : intl.formatMessage({
          id: "localConversationPage.createPullRequestButtonLabel",
          defaultMessage: "Create PR",
          description: "Label for create pull request action",
        }),
    icon: isPending ? Spinner : GitHubMarkIcon,
    disabled: isLoadingPRStatus || !!createPullRequestBlockedTooltip,
    loading: isPending,
    tooltipText: createPullRequestBlockedTooltip,
  };
}
