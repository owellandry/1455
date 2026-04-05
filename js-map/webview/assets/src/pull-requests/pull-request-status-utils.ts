import type { GitPullRequestOutput } from "protocol";

export type PullRequestStatus = "closed" | "draft" | "merged" | "open";

export function getPullRequestStatusFromOutput(
  pullRequest: GitPullRequestOutput,
): PullRequestStatus {
  if (pullRequest.merged) {
    return "merged";
  }

  switch (pullRequest.state.toUpperCase()) {
    case "OPEN":
      return pullRequest.draft ? "draft" : "open";
    case "MERGED":
      return "merged";
    case "CLOSED":
      return "closed";
    default:
      return "closed";
  }
}

export function getPullRequestNumberFromUrl(prUrl: string): number | null {
  const match = /\/pull\/(\d+)(?:$|[/?#])/.exec(prUrl);
  if (!match) {
    return null;
  }

  return Number(match[1]);
}
