export type QuickPrimaryGitActionMode =
  | "create-branch-and-commit"
  | "commit-and-push"
  | "commit-and-create-pr"
  | "push-and-create-pr";

export function getQuickPrimaryGitActionMode({
  hasCurrentBranch = true,
  hasOpenPr,
  hasUncommittedChanges,
  canCommitAndPush,
  canCommitAndCreatePullRequest,
  canPushAndCreatePullRequest,
}: {
  hasCurrentBranch?: boolean;
  hasOpenPr: boolean;
  hasUncommittedChanges: boolean;
  canCommitAndPush: boolean;
  canCommitAndCreatePullRequest: boolean;
  canPushAndCreatePullRequest: boolean;
}): QuickPrimaryGitActionMode | null {
  if (!hasCurrentBranch) {
    return "create-branch-and-commit";
  }

  if (hasOpenPr && hasUncommittedChanges && canCommitAndPush) {
    return "commit-and-push";
  }

  if (!hasOpenPr && hasUncommittedChanges && canCommitAndCreatePullRequest) {
    return "commit-and-create-pr";
  }

  if (!hasOpenPr && !hasUncommittedChanges && canPushAndCreatePullRequest) {
    return "push-and-create-pr";
  }

  return null;
}
