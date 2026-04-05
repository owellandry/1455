import { useScope } from "maitai";
import type { GitCwd, HostConfig } from "protocol";
import { useCallback, useMemo, useState } from "react";
import { useIntl } from "react-intl";

import { useStartCodeReviewConversation } from "@/code-review";
import { toast$ } from "@/components/toaster/toast-signal";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { useGitDefaultBranch } from "@/git-rpc/use-git-default-branch";
import { useGitRecentBranches } from "@/git-rpc/use-git-recent-branches";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";
import { useGitRootForCwd } from "@/utils/git-root";
import { logger } from "@/utils/logger";
import { useNavigateToLocalConversation } from "@/utils/use-navigate-to-local-conversation";

import type { ReviewModeState, ReviewTarget } from "../composer-view-state";
import { ReviewBaseBranchPanel, ReviewModePanel } from "./review-mode-panel";

export function ReviewModeContent({
  onItemsChanged,
  onClose,
  cwd,
  hostConfig,
}: {
  onItemsChanged: () => void;
  onClose: () => void;
  cwd: GitCwd;
  hostConfig: HostConfig;
}): React.ReactElement {
  const intl = useIntl();
  const [reviewState, setReviewState] = useState<ReviewModeState>({
    status: "choose-target",
  });
  const scope = useScope(AppScope);
  const navigateToLocalConversation = useNavigateToLocalConversation();
  const [submittingBranchName, setSubmittingBranchName] = useState<
    string | null
  >(null);

  const { gitRoot } = useGitRootForCwd(cwd);

  const { data: currentBranch, isLoading: isCurrentBranchLoading } =
    useGitCurrentBranch(gitRoot, hostConfig);

  const {
    data: defaultBranch,
    isLoading: isDefaultBranchLoading,
    isError: isDefaultBranchError,
    refetch: refetchDefaultBranch,
  } = useGitDefaultBranch(gitRoot, hostConfig);

  const {
    data: recentBranches,
    isLoading: isRecentBranchesLoading,
    isError: isRecentBranchesError,
    refetch: refetchRecentBranches,
  } = useGitRecentBranches(gitRoot, hostConfig);

  const resolvedDefaultBranch = defaultBranch ?? "main";

  // ensure we do not double add branches such as "main" or "master"
  const branches = useMemo(() => {
    const lines: Array<string> = [];
    const seen = new Set<string>();

    if (currentBranch) {
      seen.add(currentBranch);
    }

    if (resolvedDefaultBranch) {
      lines.push(resolvedDefaultBranch);
      seen.add(resolvedDefaultBranch);
    }

    recentBranches?.forEach((branch): void => {
      if (branch && !seen.has(branch)) {
        lines.push(branch);
        seen.add(branch);
      }
    });

    return lines;
  }, [currentBranch, recentBranches, resolvedDefaultBranch]);

  const isBranchDataLoading = isDefaultBranchLoading || isRecentBranchesLoading;
  const isBranchDataError = isDefaultBranchError || isRecentBranchesError;
  const refetchBranchData = (): void => {
    void refetchDefaultBranch();
    void refetchRecentBranches();
  };

  const { mutateAsync: startCodeReview, isPending: isStartingCodeReview } =
    useStartCodeReviewConversation({
      onError: (error) => {
        logger.error(`Failed to start code review`, {
          safe: {},
          sensitive: {
            error: error,
          },
        });
        scope.get(toast$).danger(
          intl.formatMessage({
            id: "composer.reviewMode.quickReviewError",
            defaultMessage: "Failed to start code review.",
            description: "Toast shown when quick review action fails",
          }),
        );
      },
      onSuccess: (conversationId) => {
        navigateToLocalConversation(conversationId);
      },
    });

  const handleReviewTargetSelected = useCallback(
    async (target: ReviewTarget): Promise<void> => {
      if (!gitRoot) {
        scope.get(toast$).danger(
          intl.formatMessage({
            id: "composer.reviewMode.gitRoot.error",
            defaultMessage: "Git root not found",
            description: "Toast shown when git root not found",
          }),
        );
        return;
      }

      if (target === "base-branch") {
        scope.get(productEventLogger$).log({
          eventName: "codex_review_target_selected",
          metadata: {
            target: "base_branch",
          },
        });
        setReviewState({ status: "choose-base" });
        onItemsChanged();
        return;
      }

      scope.get(productEventLogger$).log({
        eventName: "codex_review_target_selected",
        metadata: {
          target: "unstaged",
        },
      });
      await startCodeReview({
        context: {
          mode: "uncommitted",
          sourceBranch: currentBranch ?? "HEAD",
          gitRoot,
          cwd,
        },
      });
      onClose();
    },
    [
      scope,
      cwd,
      gitRoot,
      startCodeReview,
      currentBranch,
      onClose,
      intl,
      onItemsChanged,
    ],
  );

  const handleBaseBranchSelected = useCallback(
    async (targetBranch: string): Promise<void> => {
      if (!gitRoot) {
        scope.get(toast$).danger(
          intl.formatMessage({
            id: "composer.reviewMode.gitRoot.error",
            defaultMessage: "Git root not found",
            description: "Toast shown when git root not found",
          }),
        );
        return;
      }

      setSubmittingBranchName(targetBranch);
      await startCodeReview({
        context: {
          mode: "base-branch",
          sourceBranch: currentBranch ?? "HEAD",
          baseBranch: targetBranch,
          gitRoot,
          cwd,
        },
      });

      onClose();
    },
    [scope, onClose, currentBranch, cwd, gitRoot, intl, startCodeReview],
  );

  if (reviewState.status === "choose-target") {
    return (
      <>
        <ReviewModePanel
          onSelectUnstaged={() => handleReviewTargetSelected("unstaged")}
          onSelectBaseBranch={() => handleReviewTargetSelected("base-branch")}
          isSubmitting={isStartingCodeReview}
          isLoadingBaseBranch={isCurrentBranchLoading}
        />
      </>
    );
  }
  return (
    <ReviewBaseBranchPanel
      onSelect={handleBaseBranchSelected}
      branchLines={branches.map((branch) => ({ key: branch, label: branch }))}
      isLoading={isBranchDataLoading}
      isError={isBranchDataError}
      refetchBranchOverview={refetchBranchData}
      submittingBranchName={submittingBranchName}
    />
  );
}
