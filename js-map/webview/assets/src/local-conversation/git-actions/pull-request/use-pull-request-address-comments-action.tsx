import path from "path";

import { useMutation } from "@tanstack/react-query";
import { useScope } from "maitai";
import type {
  CommentInputItem,
  RecommendedSkillMetadata,
  ConversationId,
  GitCwd,
} from "protocol";
import type { IntlShape } from "react-intl";

import { buildDiffCommentKey } from "@/code-comment-directives";
import { toast$ } from "@/components/toaster/toast-signal";
import { useComposerViewState } from "@/composer/composer-view-state";
import { focusComposerInput } from "@/composer/focus-composer";
import { AppScope } from "@/scopes/app-scope";
import { formatSkillMentionText } from "@/skills/skill-utils";
import { useRecommendedSkills } from "@/skills/use-recommended-skills";
import { useSkills } from "@/skills/use-skills";
import { useDiffComments } from "@/utils/use-diff-comments";

import { buildPullRequestAddressCommentsPrompt } from "./pull-request-comments-workflow";
import type { PullRequestFixDisabledReason } from "./use-pull-request-fix-action";

type PullRequestAddressCommentsDisabledReason =
  | "branch-mismatch"
  | "missing-conversation"
  | "missing-pr-info"
  | null;

type PullRequestAddressCommentsMutationParams = {
  baseBranch: string;
  commentAttachments: Array<CommentInputItem>;
  headBranch: string;
  prNumber: number;
};

export type PullRequestAddressCommentsAction = {
  canAddressComments: boolean;
  isPending: boolean;
  startAddressComments: () => void;
  startAddressCommentsForAttachments: (
    commentAttachments: Array<CommentInputItem>,
  ) => void;
  tooltipText?: string;
};

export function usePullRequestAddressCommentsAction({
  actionDisabledReason,
  baseBranch,
  commentAttachments,
  conversationId,
  cwd,
  headBranch,
  intl,
  onSuccess,
  prNumber,
}: {
  actionDisabledReason: PullRequestFixDisabledReason | null;
  baseBranch: string | null;
  commentAttachments: Array<CommentInputItem>;
  conversationId: ConversationId | null;
  cwd: GitCwd;
  headBranch: string | null;
  intl: IntlShape;
  onSuccess: () => void;
  prNumber: number | null;
}): PullRequestAddressCommentsAction {
  const scope = useScope(AppScope);
  const [, setComposerViewState] = useComposerViewState(
    conversationId == null
      ? undefined
      : {
          type: "local",
          localConversationId: conversationId,
        },
    cwd,
  );
  const [, setDiffComments] = useDiffComments(conversationId);
  const { ensureSkillByName, installSkill } = useRecommendedSkills();
  const { findSkillByName, forceReload } = useSkills(cwd);
  const effectiveDisabledReason =
    getCommentsActionDisabledReason(actionDisabledReason) ??
    (baseBranch == null || headBranch == null ? "missing-pr-info" : null) ??
    (prNumber == null ? "missing-pr-info" : null);

  const mutation = useMutation({
    mutationFn: async ({
      baseBranch,
      commentAttachments,
      headBranch,
      prNumber,
    }: PullRequestAddressCommentsMutationParams): Promise<void> => {
      const skillMention = await ensureAddressCommentsSkillMention({
        ensureSkillByName,
        findSkillByName,
        forceReload,
        installSkill,
        intl,
      });
      setDiffComments((prev) => {
        return mergeCommentAttachments(prev, commentAttachments);
      });
      setComposerViewState((prev) => {
        return {
          ...prev,
          commentAttachments: mergeCommentAttachments(
            prev.commentAttachments,
            commentAttachments,
          ),
          prompt: buildPullRequestAddressCommentsPrompt({
            baseBranch,
            headBranch,
            number: prNumber,
            skillMention,
          }),
        };
      });
      focusComposerInput();
    },
    onError: (error) => {
      scope.get(toast$).danger(
        error instanceof Error
          ? error.message
          : intl.formatMessage({
              id: "localConversation.pullRequest.comments.failed",
              defaultMessage: "Failed to prepare PR comments workflow",
              description:
                "Toast shown when the PR comments workflow fails to populate the composer",
            }),
      );
    },
    onSuccess,
  });

  const startAddressCommentsFor = (
    nextCommentAttachments: Array<CommentInputItem>,
  ): void => {
    if (
      conversationId == null ||
      baseBranch == null ||
      headBranch == null ||
      prNumber == null
    ) {
      return;
    }

    void mutation.mutateAsync({
      baseBranch,
      commentAttachments: nextCommentAttachments,
      headBranch,
      prNumber,
    });
  };

  return {
    canAddressComments:
      conversationId != null &&
      effectiveDisabledReason == null &&
      !mutation.isPending,
    isPending: mutation.isPending,
    startAddressComments: () => {
      startAddressCommentsFor(commentAttachments);
    },
    startAddressCommentsForAttachments: (
      nextCommentAttachments: Array<CommentInputItem>,
    ) => {
      startAddressCommentsFor(nextCommentAttachments);
    },
    tooltipText: getPullRequestAddressCommentsDisabledTooltip(
      intl,
      effectiveDisabledReason,
    ),
  };
}

async function ensureAddressCommentsSkillMention({
  ensureSkillByName,
  findSkillByName,
  forceReload,
  installSkill,
  intl,
}: {
  ensureSkillByName: (
    skillName: string,
  ) => Promise<RecommendedSkillMetadata | null>;
  findSkillByName: (skillName: string) => {
    name: string;
    path: string;
  } | null;
  forceReload: () => Promise<void>;
  installSkill: (args: {
    skill: RecommendedSkillMetadata;
    installRoot?: string | null;
  }) => Promise<{
    success: boolean;
    destination: string | null;
    error: string | null;
  }>;
  intl: IntlShape;
}): Promise<string> {
  const installedSkill = findSkillByName("gh-address-comments");
  if (installedSkill) {
    return formatSkillMentionText({
      name: installedSkill.name,
      path: installedSkill.path,
    });
  }

  const recommendedSkill = await ensureSkillByName("gh-address-comments");
  if (recommendedSkill == null) {
    throw new Error(
      intl.formatMessage({
        id: "localConversation.pullRequest.comments.skillUnavailable",
        defaultMessage: "gh-address-comments skill is unavailable.",
        description:
          "Error shown when the gh-address-comments skill cannot be found for the PR comments workflow",
      }),
    );
  }

  const response = await installSkill({ skill: recommendedSkill });
  if (!response.success || response.destination == null) {
    throw new Error(
      response.error ??
        intl.formatMessage({
          id: "localConversation.pullRequest.comments.installFailed",
          defaultMessage: "Failed to install gh-address-comments skill.",
          description:
            "Error shown when the gh-address-comments skill install fails for the PR comments workflow",
        }),
    );
  }

  await forceReload();

  return formatSkillMentionText({
    name: recommendedSkill.name,
    path: path.join(response.destination, "SKILL.md"),
  });
}

function getCommentsActionDisabledReason(
  disabledReason: PullRequestFixDisabledReason | null,
): PullRequestAddressCommentsDisabledReason {
  switch (disabledReason) {
    case "branch-mismatch":
      return "branch-mismatch";
    case "missing-conversation":
      return "missing-conversation";
    case "missing-branch-info":
    case "missing-pr-info":
      return "missing-pr-info";
    case null:
      return null;
  }
}

function getPullRequestAddressCommentsDisabledTooltip(
  intl: IntlShape,
  disabledReason: PullRequestAddressCommentsDisabledReason,
): string | undefined {
  switch (disabledReason) {
    case "branch-mismatch":
      return intl.formatMessage({
        id: "localConversation.pullRequest.comments.branchMismatch",
        defaultMessage:
          "Switch back to the thread branch to address PR comments.",
        description:
          "Tooltip shown when the PR comments action is disabled because the checked out branch differs from the thread branch",
      });
    case "missing-conversation":
      return intl.formatMessage({
        id: "localConversation.pullRequest.comments.missingConversation",
        defaultMessage:
          "Addressing PR comments is only available in an active thread.",
        description:
          "Tooltip shown when the PR comments action is disabled because there is no active conversation",
      });
    case "missing-pr-info":
      return intl.formatMessage({
        id: "localConversation.pullRequest.comments.missingPullRequestInfo",
        defaultMessage:
          "Failed to parse the pull request info needed to address comments.",
        description:
          "Tooltip shown when the PR comments action is disabled because required pull request information is unavailable",
      });
    case null:
      return undefined;
  }
}

function mergeCommentAttachments(
  existing: Array<CommentInputItem>,
  incoming: Array<CommentInputItem>,
): Array<CommentInputItem> {
  const merged = [...existing];
  const seenKeys = new Set(existing.map(buildDiffCommentKey));
  let didAppend = false;

  for (const comment of incoming) {
    const key = buildDiffCommentKey(comment);
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    merged.push(comment);
    didAppend = true;
  }

  return didAppend ? merged : existing;
}
