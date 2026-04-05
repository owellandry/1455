import { useFamilySignal, useScope, useSignal } from "maitai";
import { createGitCwd } from "protocol";

import { CodeDiff } from "@/diff/code-diff";
import { richDiffPreview$, wrapCodeDiff$ } from "@/diff/diff-view-mode";
import { useDiffCommentSources } from "@/diff/use-diff-comment-sources";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { reviewDiffFilter$ } from "./diff-filter";
import { estimateReviewDiffRowHeightPx } from "./review-diff-row-height";
import { reviewFileEntryByPath$ } from "./review-files-model";
import { requestReviewPatchAction } from "./review-patch-actions";

export function ReviewFileDiffItem({
  defaultOpen,
  diffMode,
  diffRefs,
  isCappedMode,
  path,
  showReviewGitActions,
  skipFindHighlight,
}: {
  defaultOpen: boolean;
  diffMode: "unified" | "split";
  diffRefs: React.RefObject<Map<string, HTMLDivElement | null>>;
  isCappedMode: boolean;
  path: string;
  showReviewGitActions: boolean;
  skipFindHighlight?: boolean;
}): React.ReactElement | null {
  const scope = useScope(ThreadRouteScope);
  const diffFilter = useSignal(reviewDiffFilter$);
  const fileEntry = useFamilySignal(reviewFileEntryByPath$, path);
  const richPreviewEnabled = useSignal(richDiffPreview$);
  const wrap = useSignal(wrapCodeDiff$);
  const conversationId = scope.value.threadId;
  const cwd = scope.value.cwd;
  const hostConfig = scope.value.hostConfig;
  const { commentProps } = useDiffCommentSources({
    conversationId,
    enableComments: true,
  });
  const diffViewWrap = isCappedMode ? false : wrap;
  const viewType = isCappedMode ? "unified" : diffMode;
  const estimatedRowHeightPx =
    fileEntry == null
      ? undefined
      : estimateReviewDiffRowHeightPx({
          additions: fileEntry.diff.additions,
          deletions: fileEntry.diff.deletions,
          viewType,
        });

  if (fileEntry == null) {
    return null;
  }

  return (
    <div
      className="review-diff-virtualized"
      data-review-path={path}
      data-thread-find-skip={skipFindHighlight ? "" : undefined}
      ref={(node) => {
        if (node) {
          diffRefs.current.set(path, node);
          return;
        }
        diffRefs.current.delete(path);
      }}
      style={{
        containIntrinsicSize:
          estimatedRowHeightPx != null
            ? `auto ${estimatedRowHeightPx}px`
            : undefined,
      }}
    >
      <CodeDiff
        {...commentProps}
        conversationId={conversationId}
        cwd={cwd != null ? createGitCwd(cwd) : undefined}
        defaultOpen={defaultOpen}
        diff={fileEntry.diff}
        diffViewWrap={diffViewWrap}
        expandScope="review"
        hostConfig={hostConfig}
        hunkActionsVariant={diffFilter === "staged" ? "staged" : "unstaged"}
        hunkSeparators={
          fileEntry.diff.metadata.additionLines ? "line-info" : "metadata"
        }
        onHunkAction={(params) => requestReviewPatchAction(scope, params)}
        onToggleWrap={() => {
          if (isCappedMode) {
            return;
          }
          scope.set(wrapCodeDiff$, !wrap);
        }}
        richPreviewEnabled={richPreviewEnabled}
        roundedCorners
        showHunkActions={showReviewGitActions}
        stickyHeader
        viewType={viewType}
      />
    </div>
  );
}
