import type {
  GhPullRequestCiStatus,
  GhPullRequestReviewStatus,
  GhPullRequestReviewers,
} from "protocol";

import type { PullRequestVisualState } from "@/pull-requests/pull-request-visual-state";

import { shouldShowPullRequestFixAction } from "./pull-request-summary";

export type PullRequestSecondaryAction = "fix" | "merge" | null;
export type PullRequestDropdownStatusKind =
  | "checks-none"
  | "checks-failing"
  | "checks-pending"
  | "checks-successful"
  | "merging-blocked"
  | "ready-to-merge";

export type PullRequestMergeDisabledReason =
  | "draft"
  | "merged"
  | "pending-ci"
  | "changes-requested"
  | "not-ready"
  | null;

export function getPullRequestSecondaryAction({
  ciStatus,
  pullRequestState,
}: {
  ciStatus: GhPullRequestCiStatus;
  pullRequestState: PullRequestVisualState;
}): PullRequestSecondaryAction {
  if (pullRequestState === "merged") {
    return null;
  }
  if (shouldShowPullRequestFixAction(ciStatus)) {
    return "fix";
  }
  return "merge";
}

export function getPullRequestMergeDisabledReason({
  canMerge,
  ciStatus,
  pullRequestState,
  reviewStatus,
}: {
  canMerge: boolean;
  ciStatus: GhPullRequestCiStatus;
  pullRequestState: PullRequestVisualState;
  reviewStatus: GhPullRequestReviewStatus;
}): PullRequestMergeDisabledReason {
  if (pullRequestState === "draft") {
    return "draft";
  }
  if (pullRequestState === "merged") {
    return "merged";
  }
  if (reviewStatus === "changes_requested") {
    return "changes-requested";
  }
  if (canMerge) {
    return null;
  }
  if (ciStatus === "pending") {
    return "pending-ci";
  }
  return "not-ready";
}

export function getPullRequestDropdownStatusKinds({
  ciStatus,
  mergeDisabledReason,
  pullRequestState,
  secondaryAction,
}: {
  ciStatus: GhPullRequestCiStatus;
  mergeDisabledReason: PullRequestMergeDisabledReason;
  pullRequestState: PullRequestVisualState;
  secondaryAction: PullRequestSecondaryAction;
}): Array<PullRequestDropdownStatusKind> {
  if (pullRequestState === "merged") {
    return [];
  }

  const kinds: Array<PullRequestDropdownStatusKind> = [];

  if (ciStatus === "failing") {
    kinds.push("checks-failing");
  } else if (ciStatus === "none") {
    kinds.push("checks-none");
  } else if (ciStatus === "pending") {
    kinds.push("checks-pending");
  } else if (ciStatus === "passing") {
    kinds.push("checks-successful");
  }

  if (secondaryAction === "merge") {
    kinds.push(
      mergeDisabledReason == null ? "ready-to-merge" : "merging-blocked",
    );
  }

  return kinds;
}

export function getPullRequestReviewCommentCount(
  reviewers: GhPullRequestReviewers,
): number {
  return reviewers.unresolvedCommentCount;
}
