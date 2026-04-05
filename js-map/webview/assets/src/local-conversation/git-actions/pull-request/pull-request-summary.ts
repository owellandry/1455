import type { GhPullRequestCiStatus } from "protocol";

export function shouldShowPullRequestFixAction(
  ciStatus: GhPullRequestCiStatus,
): boolean {
  return ciStatus === "failing";
}
