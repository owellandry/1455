import { useIntl } from "react-intl";

import type { DiffFilter } from "./diff-filter";
import { ReviewHeaderSourceControls } from "./review-header-source-controls";
import {
  ReviewHeaderToolbar,
  type ReviewHeaderDiffControls,
} from "./review-header-toolbar";

export {
  ReviewHeaderOptionsContent,
  type ReviewHeaderDiffControls,
} from "./review-header-toolbar";

export function ReviewHeader({
  isSmall,
  isReviewExpanded,
  baseBranch,
  baseBranchRemote,
  currentBranch,
  reviewSource,
  diffFilter,
  onSelectDiffFilter,
  showCopyGitApplyCommand = false,
  copyGitApplyCommandDisabled = false,
  onClickCopyGitApplyCommand,
  stagedFileCount,
  unstagedFileCount,
  showRefreshGitQueries = false,
  refreshGitQueriesDisabled = false,
  onRefreshGitQueries,
  isFileTreeOpen = true,
  disableFileTreeToggle = false,
  onToggleFileTree,
  diffControls,
  onExpandReview,
  onCollapseReview,
}: {
  isSmall: boolean;
  isReviewExpanded: boolean;
  baseBranch: string | null;
  baseBranchRemote: string | null;
  currentBranch: string | null;
  reviewSource: "local" | "worktree" | "cloud";
  diffFilter?: DiffFilter;
  onSelectDiffFilter?: (filter: DiffFilter) => void;
  showCopyGitApplyCommand?: boolean;
  copyGitApplyCommandDisabled?: boolean;
  onClickCopyGitApplyCommand?: () => void;
  stagedFileCount?: number;
  unstagedFileCount?: number;
  showRefreshGitQueries?: boolean;
  refreshGitQueriesDisabled?: boolean;
  onRefreshGitQueries?: () => void;
  isFileTreeOpen?: boolean;
  disableFileTreeToggle?: boolean;
  onToggleFileTree?: () => void;
  diffControls: ReviewHeaderDiffControls;
  onExpandReview: () => void;
  onCollapseReview: () => void;
}): React.ReactElement {
  const intl = useIntl();
  const fileTreeToggleLabel = isFileTreeOpen
    ? intl.formatMessage({
        id: "codex.review.fullReview.hideFileTree",
        defaultMessage: "Hide file tree",
        description: "Tooltip to hide the file tree",
      })
    : intl.formatMessage({
        id: "codex.review.fullReview.showFileTree",
        defaultMessage: "Show file tree",
        description: "Tooltip to show the file tree",
      });

  if (isReviewExpanded) {
    return (
      <div className="group flex flex-col px-3 py-1 pl-3 text-token-description-foreground">
        <div className="flex h-9 items-center">
          <ReviewHeaderSourceControls
            baseBranch={baseBranch}
            baseBranchRemote={baseBranchRemote}
            currentBranch={currentBranch}
            diffFilter={diffFilter}
            isReviewExpanded={isReviewExpanded}
            onSelectDiffFilter={onSelectDiffFilter}
            reviewSource={reviewSource}
            stagedFileCount={stagedFileCount}
            unstagedFileCount={unstagedFileCount}
          />
          <div className="flex min-w-0 flex-1 items-center justify-end">
            <ReviewHeaderToolbar
              copyGitApplyCommandDisabled={copyGitApplyCommandDisabled}
              diffControls={{
                ...diffControls,
                diffMode: isSmall ? "unified" : diffControls.diffMode,
              }}
              fileTreeToggleDisabled={disableFileTreeToggle}
              fileTreeToggleLabel={fileTreeToggleLabel}
              isReviewExpanded={isReviewExpanded}
              onClickCopyGitApplyCommand={onClickCopyGitApplyCommand}
              onCollapseReview={onCollapseReview}
              onExpandReview={onExpandReview}
              onRefreshGitQueries={onRefreshGitQueries}
              onToggleFileTree={onToggleFileTree}
              refreshGitQueriesDisabled={refreshGitQueriesDisabled}
              showCopyGitApplyCommand={showCopyGitApplyCommand}
              showRefreshGitQueries={showRefreshGitQueries}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-2 py-1 text-token-description-foreground">
      <div className="flex h-9 items-center justify-between">
        <ReviewHeaderSourceControls
          baseBranch={baseBranch}
          baseBranchRemote={baseBranchRemote}
          currentBranch={currentBranch}
          diffFilter={diffFilter}
          isReviewExpanded={isReviewExpanded}
          onSelectDiffFilter={onSelectDiffFilter}
          reviewSource={reviewSource}
          stagedFileCount={stagedFileCount}
          unstagedFileCount={unstagedFileCount}
        />
        <div className="mr-1 flex h-9 flex-shrink-0 items-center">
          <ReviewHeaderToolbar
            copyGitApplyCommandDisabled={copyGitApplyCommandDisabled}
            diffControls={{
              ...diffControls,
              diffMode: isSmall ? "unified" : diffControls.diffMode,
            }}
            fileTreeToggleDisabled={disableFileTreeToggle}
            fileTreeToggleLabel={fileTreeToggleLabel}
            isReviewExpanded={isReviewExpanded}
            onClickCopyGitApplyCommand={onClickCopyGitApplyCommand}
            onCollapseReview={onCollapseReview}
            onExpandReview={onExpandReview}
            onRefreshGitQueries={onRefreshGitQueries}
            onToggleFileTree={onToggleFileTree}
            refreshGitQueriesDisabled={refreshGitQueriesDisabled}
            showCopyGitApplyCommand={showCopyGitApplyCommand}
            showRefreshGitQueries={showRefreshGitQueries}
          />
        </div>
      </div>
    </div>
  );
}
