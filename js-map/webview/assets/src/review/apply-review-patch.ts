import type { Scope } from "maitai";
import type { ApplyPatchResult, ApplyPatchTarget, HostConfig } from "protocol";

import { toast$ } from "@/components/toaster/toast-signal";
import type { HunkActionParams } from "@/diff/code-diff";
import { parseDiff, type CodexDiffFile } from "@/diff/parse-diff";
import { intl$ } from "@/intl/app-intl-signal";
import { productEventLogger$ } from "@/product-event-signal";
import { getApplyPatchBehavior } from "@/review/apply-patch-behavior";
import type { StageDiffFilter } from "@/review/diff-filter";
import {
  buildFilePatch,
  buildHunkPatch,
  buildPatchFromFiles,
  buildSectionPatch,
  extractFilePatch,
} from "@/review/hunk-patch";
import type { ThreadRouteScope } from "@/scopes/thread-route-scope";
import { fetchFromVSCode } from "@/vscode-api";

function extractPathsFromPatchText(diff: string): Array<string> {
  if (diff.trim().length === 0) {
    return [];
  }

  const paths = new Set<string>();
  const parsed = parseDiff(diff);
  for (const file of parsed) {
    // Record both sides so we include renames and deletions; deleted files still show in diff headers.
    const current = file.metadata.name;
    if (current && current !== "/dev/null") {
      paths.add(current);
    }
    const previous = file.metadata.prevName;
    if (previous && previous !== "/dev/null") {
      paths.add(previous);
    }
  }

  return Array.from(paths);
}

function showStageOrUnstageToast(
  ctx: Scope<typeof ThreadRouteScope>,
  status: ApplyPatchResult["status"],
  action: "stage" | "unstage",
  errorCode?: ApplyPatchResult["errorCode"],
): void {
  const intl = ctx.get(intl$);
  const toast = ctx.get(toast$);

  if (status === "error" && errorCode === "not-git-repo") {
    toast.danger(
      intl.formatMessage({
        id: "codex.hunk.patch.notGitRepo",
        defaultMessage: "This action requires a Git repository",
        description:
          "Message displayed when stage/unstage patch action is attempted outside a Git repository",
      }),
    );
    return;
  }

  if (status === "success") {
    toast.success(
      action === "unstage"
        ? intl.formatMessage({
            id: "codex.hunk.patch.revertSuccess",
            defaultMessage: "Unstaged successfully",
            description: "Message displayed when hunk is unstaged successfully",
          })
        : intl.formatMessage({
            id: "codex.hunk.patch.success",
            defaultMessage: "Staged successfully",
            description: "Message displayed when hunk is updated successfully",
          }),
    );
    return;
  }

  if (status === "error") {
    toast.danger(
      action === "unstage"
        ? intl.formatMessage({
            id: "codex.hunk.patch.revertError",
            defaultMessage: "Failed to unstage",
            description: "Message displayed when failed to revert a hunk",
          })
        : intl.formatMessage({
            id: "codex.hunk.patch.error",
            defaultMessage: "Failed to stage",
            description: "Message displayed when failed to update a hunk",
          }),
    );
    return;
  }

  toast.info(
    intl.formatMessage({
      id: "codex.hunk.patch.partialSuccess",
      defaultMessage: "Partial success",
      description: "Message displayed when partial success",
    }),
  );
}

function showRevertToast(
  ctx: Scope<typeof ThreadRouteScope>,
  status: ApplyPatchResult["status"],
  params: HunkActionParams,
  errorCode?: ApplyPatchResult["errorCode"],
): void {
  const intl = ctx.get(intl$);
  const toast = ctx.get(toast$);

  if (status === "error" && errorCode === "not-git-repo") {
    toast.danger(
      intl.formatMessage({
        id: "codex.review.revert.notGitRepo",
        defaultMessage: "Revert requires a Git repository",
        description:
          "Toast shown when revert patch action is attempted outside a Git repository",
      }),
    );
    return;
  }

  const hunkNumber = (params.hunkIndex ?? 0) + 1;
  if (status === "success") {
    if (params.scope === "section") {
      toast.success(
        intl.formatMessage({
          id: "codex.review.revert.section.success",
          defaultMessage: "Section reverted",
          description: "Toast shown when section revert succeeds",
        }),
      );
      return;
    }

    if (params.scope === "file") {
      toast.success(
        intl.formatMessage(
          {
            id: "codex.review.revert.file.success",
            defaultMessage: "Reverted {path}",
            description: "Toast shown when file revert succeeds",
          },
          { path: params.path },
        ),
      );
      return;
    }

    toast.success(
      intl.formatMessage(
        {
          id: "codex.review.revert.hunk.success",
          defaultMessage: "Reverted hunk {hunkNumber} in {path}",
          description: "Toast shown when hunk revert succeeds",
        },
        {
          hunkNumber,
          path: params.path,
        },
      ),
    );
    return;
  }

  if (status === "error") {
    if (params.scope === "section") {
      toast.danger(
        intl.formatMessage({
          id: "codex.review.revert.section.error",
          defaultMessage: "Failed to revert section",
          description: "Toast shown when section revert fails",
        }),
      );
      return;
    }

    if (params.scope === "file") {
      toast.danger(
        intl.formatMessage(
          {
            id: "codex.review.revert.file.error",
            defaultMessage: "Failed to revert {path}",
            description: "Toast shown when file revert fails",
          },
          { path: params.path },
        ),
      );
      return;
    }

    toast.danger(
      intl.formatMessage(
        {
          id: "codex.review.revert.hunk.error",
          defaultMessage: "Failed to revert hunk {hunkNumber} in {path}",
          description: "Toast shown when hunk revert fails",
        },
        {
          hunkNumber,
          path: params.path,
        },
      ),
    );
    return;
  }

  if (params.scope === "section") {
    toast.info(
      intl.formatMessage({
        id: "codex.review.revert.section.partialSuccess",
        defaultMessage: "Section partially reverted",
        description: "Toast shown when section revert partially succeeds",
      }),
    );
    return;
  }

  if (params.scope === "file") {
    toast.info(
      intl.formatMessage(
        {
          id: "codex.review.revert.file.partialSuccess",
          defaultMessage: "Partially reverted {path}",
          description: "Toast shown when file revert partially succeeds",
        },
        { path: params.path },
      ),
    );
    return;
  }

  toast.info(
    intl.formatMessage(
      {
        id: "codex.review.revert.hunk.partialSuccess",
        defaultMessage: "Partially reverted hunk {hunkNumber} in {path}",
        description: "Toast shown when hunk revert partially succeeds",
      },
      {
        hunkNumber,
        path: params.path,
      },
    ),
  );
}

function showApplyPatchToast(
  ctx: Scope<typeof ThreadRouteScope>,
  status: ApplyPatchResult["status"],
  params: HunkActionParams,
  errorCode?: ApplyPatchResult["errorCode"],
): void {
  if (params.action === "revert") {
    showRevertToast(ctx, status, params, errorCode);
    return;
  }

  showStageOrUnstageToast(ctx, status, params.action, errorCode);
}

export async function applyReviewPatch({
  cwd,
  diffText,
  fullDiffs,
  hostConfig,
  params,
  refetchGitChanges,
  refreshPathsFast,
  ctx,
  stageFilter,
}: {
  cwd: string | null;
  diffText: string | null;
  fullDiffs: {
    staged: Array<CodexDiffFile> | null;
    unstaged: Array<CodexDiffFile> | null;
  };
  hostConfig: HostConfig;
  params: HunkActionParams;
  refetchGitChanges: () => void;
  refreshPathsFast: (paths: Array<string>) => Promise<void>;
  ctx: Scope<typeof ThreadRouteScope>;
  stageFilter: StageDiffFilter;
}): Promise<void> {
  const files =
    stageFilter === "staged" ? fullDiffs.staged : fullDiffs.unstaged;
  const rawDiff = diffText ?? (files ? buildPatchFromFiles(files) : null);
  if (!cwd || !rawDiff) {
    return;
  }
  const isFileAction = params.scope === "file";
  const isSectionAction = params.scope === "section";
  const patch = isSectionAction
    ? (diffText ?? buildSectionPatch(rawDiff))
    : isFileAction
      ? (extractFilePatch(rawDiff, params.path) ??
        buildFilePatch(rawDiff, params.path))
      : buildHunkPatch(rawDiff, params.path, params.hunkIndex ?? 0);
  if (!patch) {
    showMissingPatchToast(ctx, params.scope);
    return;
  }

  const behavior = getApplyPatchBehavior(params, stageFilter);

  if (params.action === "revert" && stageFilter === "staged") {
    try {
      const stagedResult = await runApplyPatch({
        cwd,
        diff: patch,
        hostConfig,
        refreshPathsFast,
        refetchGitChanges,
        revert: behavior.revert,
        target: "staged",
      });
      if (stagedResult.status !== "success") {
        showApplyPatchToast(
          ctx,
          stagedResult.status,
          params,
          stagedResult.errorCode,
        );
        logPatchActionResult(ctx, params, stagedResult.status);
        return;
      }

      const worktreeResult = await runApplyPatch({
        cwd,
        diff: patch,
        hostConfig,
        refreshPathsFast,
        refetchGitChanges,
        revert: behavior.revert,
        target: "unstaged",
      });
      const combinedStatus =
        worktreeResult.status === "success" ? "success" : "partial-success";
      showApplyPatchToast(ctx, combinedStatus, params);
      logPatchActionResult(ctx, params, combinedStatus);
      return;
    } catch {
      showApplyPatchToast(ctx, "error", params);
      logPatchActionResult(ctx, params, "error");
      return;
    }
  }

  try {
    const result = await runApplyPatch({
      cwd,
      diff: patch,
      hostConfig,
      refreshPathsFast,
      refetchGitChanges,
      revert: behavior.revert,
      target: behavior.target,
    });
    showApplyPatchToast(ctx, result.status, params, result.errorCode);
    logPatchActionResult(ctx, params, result.status);
  } catch {
    showApplyPatchToast(ctx, "error", params);
    logPatchActionResult(ctx, params, "error");
  }
}

async function runApplyPatch({
  cwd,
  diff,
  hostConfig,
  refreshPathsFast,
  refetchGitChanges,
  revert,
  target,
}: {
  cwd: string;
  diff: string;
  hostConfig: HostConfig;
  refreshPathsFast: (paths: Array<string>) => Promise<void>;
  refetchGitChanges: () => void;
  revert: boolean;
  target: ApplyPatchTarget;
}): Promise<ApplyPatchResult> {
  let result: ApplyPatchResult | undefined;

  try {
    const nextResult = await fetchFromVSCode("apply-patch", {
      params: {
        cwd,
        diff,
        hostConfig,
        revert,
        target,
      },
    });
    result = nextResult;
    return nextResult;
  } finally {
    await refreshPatchState({
      diff,
      refreshPathsFast,
      refetchGitChanges,
      result,
    });
  }
}

async function refreshPatchState({
  diff,
  refreshPathsFast,
  refetchGitChanges,
  result,
}: {
  diff: string;
  refreshPathsFast: (paths: Array<string>) => Promise<void>;
  refetchGitChanges: () => void;
  result?: ApplyPatchResult;
}): Promise<void> {
  const candidatePaths = new Set<string>([
    ...(result?.appliedPaths ?? []),
    ...(result?.skippedPaths ?? []),
    ...(result?.conflictedPaths ?? []),
  ]);
  if (candidatePaths.size === 0) {
    for (const path of extractPathsFromPatchText(diff)) {
      candidatePaths.add(path);
    }
  }
  if (candidatePaths.size > 0) {
    await refreshPathsFast(Array.from(candidatePaths));
  }
  refetchGitChanges();
}

function showMissingPatchToast(
  ctx: Scope<typeof ThreadRouteScope>,
  patchScope: HunkActionParams["scope"],
): void {
  const intl = ctx.get(intl$);
  const toast = ctx.get(toast$);

  const message =
    patchScope === "section"
      ? intl.formatMessage({
          id: "codex.section.patch.missing",
          defaultMessage: "Unable to build patch for this section.",
          description:
            "Message displayed when unable to build patch for a section",
        })
      : patchScope === "file"
        ? intl.formatMessage({
            id: "codex.file.patch.missing",
            defaultMessage: "Unable to build patch for this file.",
            description:
              "Message displayed when unable to build patch for a file",
          })
        : intl.formatMessage({
            id: "codex.hunk.patch.missing",
            defaultMessage: "Unable to build patch for this hunk.",
            description:
              "Message displayed when unable to build patch for a hunk",
          });

  toast.danger(message);
}

function logPatchActionResult(
  ctx: Scope<typeof ThreadRouteScope>,
  params: HunkActionParams,
  status: "success" | "partial-success" | "error",
): void {
  ctx.get(productEventLogger$).log({
    eventName: "codex_patch_action_result",
    metadata: {
      action: params.action,
      scope: params.scope ?? "hunk",
      status,
    },
  });
}
