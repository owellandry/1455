import type { Scope } from "maitai";

import type { HunkActionParams } from "@/diff/code-diff";
import type { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { applyReviewPatch } from "./apply-review-patch";
import { reviewDiffFilter$ } from "./diff-filter";
import {
  refreshReviewPathsFast,
  selectedReviewDiff$,
} from "./review-diff-state-model";
import {
  clearPendingPatchAction,
  confirmRevert,
  getReviewEffectiveStageFilter,
  isRevertDialogOpen$,
  pendingPatchAction$,
  requestPatchAction,
} from "./review-patch-model";
import { refetchReviewGitChanges } from "./review-repository-model";

export async function requestReviewPatchAction(
  scope: Scope<typeof ThreadRouteScope>,
  arg: HunkActionParams,
): Promise<void> {
  requestPatchAction(scope, arg);

  if (scope.get(isRevertDialogOpen$)) {
    return;
  }

  await executePendingReviewPatchAction(scope);
}

export async function confirmReviewRevert(
  scope: Scope<typeof ThreadRouteScope>,
): Promise<void> {
  confirmRevert(scope);

  if (scope.get(pendingPatchAction$) == null) {
    return;
  }

  await executePendingReviewPatchAction(scope);
}

async function executePendingReviewPatchAction(
  scope: Scope<typeof ThreadRouteScope>,
): Promise<void> {
  const pendingPatchAction = scope.get(pendingPatchAction$);
  if (pendingPatchAction == null) {
    return;
  }

  clearPendingPatchAction(scope);

  const diffFilter = scope.get(reviewDiffFilter$);
  const selectedDiff = scope.get(selectedReviewDiff$);
  const stageFilter = getReviewEffectiveStageFilter(diffFilter);
  await applyReviewPatch({
    ctx: scope,
    cwd: scope.value.cwd,
    diffText: selectedDiff.diffText,
    fullDiffs: {
      staged: stageFilter === "staged" ? selectedDiff.fullDiff : null,
      unstaged: stageFilter === "unstaged" ? selectedDiff.fullDiff : null,
    },
    hostConfig: scope.value.hostConfig,
    params: pendingPatchAction,
    refetchGitChanges: () => {
      void refetchReviewGitChanges(scope);
    },
    refreshPathsFast: (paths) => refreshReviewPathsFast(scope, paths),
    stageFilter,
  });
}
