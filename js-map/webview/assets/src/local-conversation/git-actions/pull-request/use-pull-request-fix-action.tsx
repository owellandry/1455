import type { ConversationId, GhPullRequestCheck, GitCwd } from "protocol";
import type { IntlShape } from "react-intl";

import { useComposerViewState } from "@/composer/composer-view-state";
import { focusComposerInput } from "@/composer/focus-composer";

import { buildPullRequestFixPrompt } from "./pull-request-fix-workflow";

export type PullRequestFixDisabledReason =
  | "branch-mismatch"
  | "missing-branch-info"
  | "missing-pr-info"
  | "missing-conversation";

type PullRequestFixMutationParams = {
  baseBranch: string;
  checks: Array<GhPullRequestCheck>;
  headBranch: string;
  prNumber: number;
};

export function usePullRequestFixAction({
  baseBranch,
  checks,
  conversationId,
  cwd,
  fixDisabledReason,
  headBranch,
  intl,
  prNumber,
  onSuccess,
}: {
  baseBranch: string | null;
  checks: Array<GhPullRequestCheck>;
  conversationId: ConversationId | null;
  cwd: GitCwd;
  fixDisabledReason: PullRequestFixDisabledReason | null;
  headBranch: string | null;
  intl: IntlShape;
  onSuccess: () => void;
  prNumber: number | null;
}): {
  canFix: boolean;
  effectiveDisabledReason: PullRequestFixDisabledReason | null;
  startFix: () => void;
  startFixForChecks: (checks: Array<GhPullRequestCheck>) => void;
  tooltipText?: string;
} {
  const [, setComposerViewState] = useComposerViewState(
    conversationId == null
      ? undefined
      : {
          type: "local",
          localConversationId: conversationId,
        },
    cwd,
  );
  const effectiveDisabledReason =
    fixDisabledReason ??
    (baseBranch == null || headBranch == null ? "missing-branch-info" : null) ??
    (prNumber == null ? "missing-pr-info" : null);
  const fixParams =
    conversationId != null &&
    baseBranch != null &&
    headBranch != null &&
    prNumber != null
      ? {
          baseBranch,
          checks,
          headBranch,
          prNumber,
        }
      : null;
  const applyFix = ({
    baseBranch,
    checks,
    headBranch,
    prNumber,
  }: PullRequestFixMutationParams): void => {
    setComposerViewState((prev) => {
      return {
        ...prev,
        prompt: buildPullRequestFixPrompt({
          baseBranch,
          headBranch,
          number: prNumber,
        }),
        pullRequestChecks: checks.filter((check) => check.status === "failing"),
      };
    });
    focusComposerInput();
    onSuccess();
  };

  return {
    canFix: conversationId != null && effectiveDisabledReason == null,
    effectiveDisabledReason,
    startFix: () => {
      if (fixParams == null) {
        return;
      }
      applyFix(fixParams);
    },
    startFixForChecks: (checks) => {
      if (
        baseBranch == null ||
        headBranch == null ||
        prNumber == null ||
        checks.length === 0
      ) {
        return;
      }
      applyFix({
        baseBranch,
        checks,
        headBranch,
        prNumber,
      });
    },
    tooltipText: getPullRequestFixDisabledTooltip(
      intl,
      effectiveDisabledReason,
    ),
  };
}

function getPullRequestFixDisabledTooltip(
  intl: IntlShape,
  fixDisabledReason: PullRequestFixDisabledReason | null,
): string | undefined {
  switch (fixDisabledReason) {
    case "branch-mismatch":
      return intl.formatMessage({
        id: "localConversation.pullRequest.fix.branchMismatch",
        defaultMessage: "Switch back to the thread branch to use Fix.",
        description:
          "Tooltip shown when Fix is disabled because the checked out branch differs from the thread branch",
      });
    case "missing-branch-info":
      return intl.formatMessage({
        id: "localConversation.pullRequest.fix.missingBranchInfo",
        defaultMessage: "Fix requires both the head and base branch.",
        description:
          "Tooltip shown when Fix is disabled because the pull request branch metadata is unavailable",
      });
    case "missing-pr-info":
      return intl.formatMessage({
        id: "localConversation.pullRequest.fix.missingPullRequestInfo",
        defaultMessage: "Failed to parse the pull request info needed for Fix.",
        description:
          "Tooltip shown when Fix is disabled because required pull request information is unavailable",
      });
    case "missing-conversation":
      return intl.formatMessage({
        id: "localConversation.pullRequest.fix.missingConversation",
        defaultMessage: "Fix is only available in an active thread.",
        description:
          "Tooltip shown when Fix is disabled because there is no active conversation",
      });
    case null:
      return undefined;
  }
}
