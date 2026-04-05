import { useQueryClient } from "@tanstack/react-query";
import { useScope, useSignal } from "maitai";
import { useIntl } from "react-intl";

import { toast$ } from "@/components/toaster/toast-signal";
import {
  diffViewMode$,
  richDiffPreview$,
  wordDiffsEnabled$,
  wrapCodeDiff$,
} from "@/diff/diff-view-mode";
import { refetchGitCommonDirQueries } from "@/git-rpc/git-api";
import { AppScope } from "@/scopes/app-scope";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { reviewDiffFilter$ } from "./diff-filter";
import { useReviewDiffExpansion } from "./review-diff-expansion-controller";
import {
  reviewCanCopyGitApplyCommand$,
  reviewCanRefreshGitQueries$,
  reviewHasSelectedDiff$,
  reviewStageFileCounts$,
  selectedReviewDiff$,
} from "./review-diff-state-model";
import { ReviewHeader } from "./review-header";
import {
  reviewLayoutMode$,
  reviewLoadFullFiles$,
  reviewShowFileTree$,
  reviewShowFileTreeInCollapsedReview$,
} from "./review-preferences-model";
import {
  baseBranchQuery$,
  currentBranchQuery$,
  gitMetadataQuery$,
  repositorySource$,
} from "./review-repository-model";

export function ReviewHeaderContainer({
  isSmall,
}: {
  isSmall: boolean;
}): React.ReactElement {
  const scope = useScope(AppScope);
  const threadRouteScope = useScope(ThreadRouteScope);
  const intl = useIntl();
  const queryClient = useQueryClient();
  const diffFilter = useSignal(reviewDiffFilter$);
  const gitMetadataQuery = useSignal(gitMetadataQuery$);
  const baseBranchQuery = useSignal(baseBranchQuery$);
  const currentBranchQuery = useSignal(currentBranchQuery$);
  const hostKey = threadRouteScope.value.hostKey;
  const rawDiffMode = useSignal(diffViewMode$);
  const reviewLayoutMode = useSignal(reviewLayoutMode$);
  const wrap = useSignal(wrapCodeDiff$);
  const richPreviewEnabled = useSignal(richDiffPreview$);
  const wordDiffsEnabled = useSignal(wordDiffsEnabled$);
  const loadFullFilesEnabled = useSignal(reviewLoadFullFiles$);
  const isFileTreeOpen = useSignal(reviewShowFileTree$);
  const isCollapsedReviewFileTreeOpen = useSignal(
    reviewShowFileTreeInCollapsedReview$,
  );
  const { expandedDiffs, toggleExpandedDiffs } = useReviewDiffExpansion();
  const selectedDiff = useSignal(selectedReviewDiff$);
  const stageFileCounts = useSignal(reviewStageFileCounts$);
  const hasReviewFiles = useSignal(reviewHasSelectedDiff$);
  const canCopyGitApplyCommand = useSignal(reviewCanCopyGitApplyCommand$);
  const canRefreshGitQueries = useSignal(reviewCanRefreshGitQueries$);
  const repositorySource = useSignal(repositorySource$);
  const isReviewExpanded = reviewLayoutMode === "expanded";
  const showFileTree =
    hasReviewFiles &&
    (isReviewExpanded ? isFileTreeOpen : isCollapsedReviewFileTreeOpen);

  function handleCopyGitApplyCommand(): void {
    if (!canCopyGitApplyCommand || !selectedDiff.diffText) {
      return;
    }

    void (async (): Promise<void> => {
      await navigator.clipboard.writeText(
        ' (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<' +
          "'EOF' \n" +
          `${selectedDiff.diffText} \n` +
          "EOF\n" +
          ")",
      );
      scope.get(toast$).success(
        intl.formatMessage({
          id: "codex.review.copyGitApplyCommand.toast",
          defaultMessage: "Copied git apply command to the clipboard",
          description: "Toast shown after copying a git apply command",
        }),
      );
    })();
  }

  return (
    <ReviewHeader
      isSmall={isSmall}
      isReviewExpanded={isReviewExpanded}
      baseBranch={baseBranchQuery.data?.local ?? null}
      baseBranchRemote={baseBranchQuery.data?.remote ?? null}
      currentBranch={currentBranchQuery.data ?? null}
      diffFilter={repositorySource === "cloud" ? undefined : diffFilter}
      reviewSource={repositorySource}
      onSelectDiffFilter={
        repositorySource === "cloud"
          ? undefined
          : (nextFilter) => scope.set(reviewDiffFilter$, nextFilter)
      }
      diffControls={{
        diffMode: rawDiffMode,
        onSelectDiffMode: (selected) => {
          scope.set(diffViewMode$, selected === "left" ? "unified" : "split");
        },
        wrap,
        onToggleWrap: () => {
          scope.set(wrapCodeDiff$, !wrap);
        },
        expanded: expandedDiffs,
        onToggleExpanded: toggleExpandedDiffs,
        richPreviewEnabled,
        onToggleRichPreview: () => {
          scope.set(richDiffPreview$, !richPreviewEnabled);
        },
        wordDiffsEnabled,
        onToggleWordDiffs: () => {
          scope.set(wordDiffsEnabled$, !wordDiffsEnabled);
        },
        loadFullFilesEnabled,
        onToggleLoadFullFiles: () => {
          scope.set(reviewLoadFullFiles$, !loadFullFilesEnabled);
        },
      }}
      stagedFileCount={stageFileCounts.stagedFileCount}
      unstagedFileCount={stageFileCounts.unstagedFileCount}
      showRefreshGitQueries={repositorySource !== "cloud"}
      refreshGitQueriesDisabled={!canRefreshGitQueries}
      onRefreshGitQueries={() => {
        const commonDir = gitMetadataQuery.data?.commonDir;
        if (commonDir == null) {
          return;
        }
        void refetchGitCommonDirQueries(queryClient, commonDir, {
          hostKey,
        });
      }}
      isFileTreeOpen={showFileTree}
      onToggleFileTree={() => {
        if (isReviewExpanded) {
          scope.set(reviewShowFileTree$, !isFileTreeOpen);
          return;
        }
        scope.set(
          reviewShowFileTreeInCollapsedReview$,
          !isCollapsedReviewFileTreeOpen,
        );
      }}
      disableFileTreeToggle={!hasReviewFiles}
      showCopyGitApplyCommand
      copyGitApplyCommandDisabled={!canCopyGitApplyCommand}
      onClickCopyGitApplyCommand={handleCopyGitApplyCommand}
      onExpandReview={() => {
        scope.set(reviewShowFileTree$, hasReviewFiles);
        scope.set(reviewLayoutMode$, "expanded");
      }}
      onCollapseReview={() => scope.set(reviewLayoutMode$, "split")}
    />
  );
}
