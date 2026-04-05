import type { ApplyPatchTarget } from "protocol";

import type { HunkActionParams } from "@/diff/code-diff";
import type { StageDiffFilter } from "@/review/diff-filter";

export function getApplyPatchBehavior(
  params: HunkActionParams,
  stageFilter: StageDiffFilter,
): { target: ApplyPatchTarget; revert: boolean } {
  if (params.action === "stage") {
    return { target: "staged", revert: false };
  }

  if (params.action === "unstage") {
    return { target: "staged", revert: true };
  }

  if (stageFilter === "unstaged") {
    return { target: "unstaged", revert: true };
  }

  return { target: "staged-and-unstaged", revert: true };
}
