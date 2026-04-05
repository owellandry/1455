import type { GhPullRequestCiStatus } from "protocol";

import type { PullRequestStatus } from "@/pull-requests/pull-request-status-utils";

export type PullRequestButtonStatus = Exclude<PullRequestStatus, "closed">;
export type PullRequestVisualState =
  | "draft"
  | "failing"
  | "in_progress"
  | "merged"
  | "ready";

export function canRenderPullRequestButton({
  hasOpenPr,
  isDraft,
  number,
  url,
}: {
  hasOpenPr: boolean;
  isDraft: boolean;
  number: number | null;
  url: string | null;
}): boolean {
  return (
    getPullRequestButtonStatus({ hasOpenPr, isDraft, url }) != null &&
    (number != null || url != null)
  );
}

export function getPullRequestButtonStatus({
  hasOpenPr,
  isDraft,
  url,
}: {
  hasOpenPr: boolean;
  isDraft: boolean;
  url: string | null;
}): PullRequestButtonStatus | null {
  if (hasOpenPr) {
    return isDraft ? "draft" : "open";
  }
  if (url != null) {
    return "merged";
  }
  return null;
}

export function getPullRequestVisualState({
  canMerge,
  ciStatus,
  status,
}: {
  canMerge: boolean;
  ciStatus: GhPullRequestCiStatus;
  status: PullRequestButtonStatus;
}): PullRequestVisualState {
  if (status === "merged") {
    return "merged";
  }
  if (status === "draft") {
    return "draft";
  }
  if (ciStatus === "failing") {
    return "failing";
  }
  if (canMerge) {
    return "ready";
  }
  return "in_progress";
}
