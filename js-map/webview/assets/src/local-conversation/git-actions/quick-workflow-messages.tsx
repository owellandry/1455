import type { CommandExecutionOutput } from "protocol";
import type { IntlShape } from "react-intl";
import { defineMessages } from "react-intl";

import { TerminalToastCard } from "@/components/toaster/terminal-toast-card";
import type { Toaster } from "@/components/toaster/toast-signal";

export const QUICK_GIT_WORKFLOW_TOAST_DURATION_SECONDS = 7;

export const quickGitWorkflowMessages = defineMessages({
  commitErrorTitle: {
    id: "review.commit.error",
    defaultMessage: "Failed to commit changes",
    description: "Toast shown when a commit fails",
  },
  commitSuccess: {
    id: "review.commit.successToast",
    defaultMessage: "Committed to {branch}",
    description: "Toast shown when a commit succeeds",
  },
  commitMessageEmpty: {
    id: "review.commit.generate.emptyResponse",
    defaultMessage: "Couldn't generate a commit message.",
    description: "Toast shown when commit message generation returns no result",
  },
  branchAndCommitMessageEmpty: {
    id: "localConversation.branchAndCommit.generate.emptyResponse",
    defaultMessage: "Couldn't generate a branch name and commit message.",
    description:
      "Toast shown when branch and commit generation returns no result",
  },
  branchNameTrailingSlash: {
    id: "localConversation.worktreeBranchSetup.branchTrailingSlash",
    defaultMessage: "Branch name can't end with a slash.",
    description:
      "Validation message shown when a generated branch name ends with a slash",
  },
  createBranchErrorTitle: {
    id: "localConversation.worktreeBranchSetup.createBranchErrorTitle",
    defaultMessage: "Failed to set branch",
    description:
      "Title for the terminal toast shown when Codex failed to make a git branch",
  },
  checkoutBranchErrorTitle: {
    id: "localConversation.worktreeBranchSetup.checkoutErrorTitle",
    defaultMessage: "Failed to check out branch",
    description:
      "Title for the terminal toast shown when Codex failed to checkout a git branch",
  },
  fallbackErrorTitle: {
    id: "localConversation.worktreeBranchSetup.errorTitle",
    defaultMessage: "Something went wrong",
    description:
      "Title for the fallback terminal toast for branch setup failures",
  },
  forcePushErrorTitle: {
    id: "localConversationPage.forcePushError",
    defaultMessage: "Failed to force push",
    description: "Error message when force push fails",
  },
  pushErrorTitle: {
    id: "localConversationPage.pushError",
    defaultMessage: "Failed to push changes",
    description: "Error message when git push fails",
  },
  createPullRequestErrorTitle: {
    id: "localConversationPage.createPullRequestError",
    defaultMessage: "Failed to create pull request",
    description: "Error message when creating a pull request fails",
  },
  pullRequestGenerationError: {
    id: "localConversationPage.generatePullRequestMessageError",
    defaultMessage: "Failed to generate pull request title and body",
    description:
      "Error message shown when pull request generation fails in commit modal",
  },
  pushSuccess: {
    id: "localConversationPage.commitAndPushToast",
    defaultMessage: "Pushed {branch}",
    description: "Toast shown when commit and push succeeds",
  },
  createPullRequestSuccess: {
    id: "localConversationPage.commitAndCreatePrToast",
    defaultMessage: "Created PR for {branch}",
    description: "Toast shown when commit and create PR succeeds",
  },
  unknownBranch: {
    id: "localConversationPage.gitAction.unknownBranch",
    defaultMessage: "your branch",
    description: "Fallback branch name for git action success toasts",
  },
});

export function showQuickWorkflowTerminalErrorToast({
  toaster,
  title,
  message,
  execOutput,
}: {
  toaster: Toaster;
  title: string;
  message: string | null;
  execOutput?: CommandExecutionOutput;
}): void {
  toaster.custom({
    duration: QUICK_GIT_WORKFLOW_TOAST_DURATION_SECONDS,
    content: ({ close }) => (
      <TerminalToastCard
        title={title}
        message={message}
        execOutput={execOutput}
        onClose={close}
      />
    ),
  });
}

export function getQuickWorkflowBranchLabel(
  intl: IntlShape,
  branch: string | null | undefined,
): string {
  const trimmedBranch = branch?.trim() ?? "";
  if (trimmedBranch.length > 0) {
    return trimmedBranch;
  }

  return intl.formatMessage(quickGitWorkflowMessages.unknownBranch);
}
