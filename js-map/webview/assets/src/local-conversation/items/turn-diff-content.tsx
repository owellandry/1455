import { useScope, useSignal } from "maitai";
import type {
  ApplyPatchResult,
  GitCwd,
  LocalOrRemoteConversationId,
} from "protocol";
import { useMemo, useState } from "react";
import { FormattedMessage, defineMessages, useIntl } from "react-intl";

import { useAppServerManagerForConversationIdOrDefault } from "@/app-server/app-server-manager-hooks";
import { Button } from "@/components/button";
import { toast$ } from "@/components/toaster/toast-signal";
import { TracedView } from "@/components/traced-view";
import { WithWindow } from "@/components/with-window";
import { TaskDiffStats } from "@/diff-stats";
import { CodeDiff } from "@/diff/code-diff";
import { getDiffSummary } from "@/diff/diff-summary";
import { parseDiff, type CodexDiffFile } from "@/diff/parse-diff";
import { useDiffCommentSources } from "@/diff/use-diff-comment-sources";
import ArrowTopRightIcon from "@/icons/arrow-top-right.svg";
import RegenerateIcon from "@/icons/regenerate.svg";
import UndoIcon from "@/icons/undo.svg";
import { messageBus } from "@/message-bus";
import { productEventLogger$ } from "@/product-event-signal";
import { dispatchCheckGitIndexForChangesEvent } from "@/review/check-git-index-for-changes";
import { reviewLayoutMode$ } from "@/review/review-preferences-model";
import { AppScope } from "@/scopes/app-scope";
import { useHostConfig } from "@/shared-objects/use-host-config";
import { getPathBasename } from "@/utils/path";
import { useMutationFromVSCode } from "@/vscode-api";

import { InProgressFixedContentItem } from "../in-progress-fixed-content-item";
import type { TurnDiffLocalConversationItem } from "./local-conversation-item";
import { TurnDiffPatchActionFailureDialog } from "./turn-diff-patch-action-failure-dialog";

type PatchAction = "undo" | "reapply";

const MAX_INLINE_RENDERED_DIFF_LINES = 5000;

export function TurnDiffContent({
  isInProgress,
  item,
  showRevertButton = true,
  conversationId,
  cwd,
}: {
  isInProgress: boolean;
  item: TurnDiffLocalConversationItem;
  showRevertButton?: boolean;
  conversationId?: LocalOrRemoteConversationId;
  cwd: GitCwd | null;
}): React.ReactElement | null {
  if (!conversationId) {
    return null;
  }
  const resolvedCwd = item.cwd ?? cwd ?? null;
  if (isInProgress) {
    return (
      <InProgressTurnDiffContent
        item={item}
        conversationId={conversationId}
        cwd={resolvedCwd}
      />
    );
  }

  return (
    <CompletedTurnDiffContent
      item={item}
      showRevertButton={showRevertButton}
      conversationId={conversationId}
      cwd={resolvedCwd}
    />
  );
}

function InProgressTurnDiffContent({
  item,
  conversationId,
  cwd,
}: {
  item: TurnDiffLocalConversationItem;
  conversationId: LocalOrRemoteConversationId;
  cwd: TurnDiffLocalConversationItem["cwd"];
}): React.ReactElement | null {
  const intl = useIntl();
  const reviewLayoutMode = useSignal(reviewLayoutMode$);
  const isReviewOpen = reviewLayoutMode !== "collapsed";
  const diffs = useMemo(() => parseDiff(item.unifiedDiff), [item.unifiedDiff]);
  const diffSummary = getDiffSummary(diffs);
  const { fileCount, linesAdded, linesDeleted } = diffSummary;

  if (!diffSummary.hasChanges) {
    return null;
  }

  return (
    <TracedView
      name="TurnDiffContent"
      attributes={{ "codex.turn_diff.state": "in_progress" }}
    >
      <InProgressFixedContentItem action={null}>
        <div className="text-size-chat flex w-full items-center justify-between">
          <div className="flex min-w-0 items-center gap-1">
            <span className="block min-w-0 truncate text-token-input-placeholder-foreground">
              {intl.formatMessage(diffMessages.filesChanged, { fileCount })}
            </span>
            <span className="text-token-charts-green">
              {intl.formatMessage(diffMessages.linesAdded, { linesAdded })}
            </span>
            <span className="text-token-charts-red">
              {intl.formatMessage(diffMessages.linesDeleted, { linesDeleted })}
            </span>
          </div>
          <WithWindow electron>
            {!isReviewOpen ? (
              <ReviewChangesButton
                item={item}
                conversationId={conversationId}
                cwd={cwd}
              />
            ) : null}
          </WithWindow>
          <WithWindow extension browser>
            <ReviewChangesButton
              item={item}
              conversationId={conversationId}
              cwd={cwd}
            />
          </WithWindow>
        </div>
      </InProgressFixedContentItem>
    </TracedView>
  );
}

function ReviewChangesButton({
  item,
  conversationId,
  cwd,
}: {
  item: TurnDiffLocalConversationItem;
  conversationId: LocalOrRemoteConversationId;
  cwd: TurnDiffLocalConversationItem["cwd"];
}): React.ReactElement {
  return (
    <button
      type="button"
      className="group text-size-chat ml-auto flex cursor-pointer items-center gap-1 text-token-input-foreground focus-visible:outline-none"
      onClick={() => {
        messageBus.dispatchMessage("show-diff", {
          unifiedDiff: item.unifiedDiff,
          conversationId,
          cwd: cwd ?? null,
        });
      }}
    >
      <span className="flex items-center gap-0.5">
        <FormattedMessage
          id="codex.unifiedDiff.reviewShort"
          defaultMessage="Review"
          description="Short label for the button to view (and follow changes) in the diff for a Codex task"
        />
        <span className="max-[480px]:hidden">
          <FormattedMessage
            id="codex.unifiedDiff.reviewChangesSuffix"
            defaultMessage="changes"
            description="Suffix appended to the review label in the diff banner (hidden on small screens)"
          />
        </span>
      </span>
      <ArrowTopRightIcon className="icon-2xs translate-y-[1px] text-token-input-placeholder-foreground transition-colors group-hover:text-token-foreground" />
    </button>
  );
}

function CompletedTurnDiffContent({
  item,
  showRevertButton,
  conversationId,
  cwd,
}: {
  item: TurnDiffLocalConversationItem;
  showRevertButton: boolean;
  conversationId: LocalOrRemoteConversationId;
  cwd: TurnDiffLocalConversationItem["cwd"];
}): React.ReactElement | null {
  const scope = useScope(AppScope);
  const intl = useIntl();
  const { commentProps } = useDiffCommentSources({ conversationId });
  const appServerManager =
    useAppServerManagerForConversationIdOrDefault(conversationId);
  const hostConfig = useHostConfig(appServerManager.getHostId());
  const [lastSuccessfulPatchAction, setLastSuccessfulPatchAction] = useState<{
    action: PatchAction;
    diff: string;
  } | null>(null);
  const [patchActionFailure, setPatchActionFailure] = useState<{
    action: PatchAction;
    result: ApplyPatchResult;
  } | null>(null);
  const revertPatchMutation = useMutationFromVSCode("apply-patch", {
    onSuccess(result, variables) {
      const patchAction: PatchAction =
        variables.revert === false ? "reapply" : "undo";
      if (result.status !== "success") {
        if (
          result.status === "partial-success" ||
          result.appliedPaths.length > 0
        ) {
          dispatchCheckGitIndexForChangesEvent();
        }
        setPatchActionFailure({
          action: patchAction,
          result,
        });
        return;
      }

      setPatchActionFailure(null);
      setLastSuccessfulPatchAction({
        action: patchAction,
        diff: variables.diff,
      });
      dispatchCheckGitIndexForChangesEvent();
      scope.get(toast$).success(
        intl.formatMessage(
          patchAction === "undo"
            ? {
                id: "codex.unifiedDiff.revertPatchSuccess",
                defaultMessage: "Changes reverted",
                description: "Toast shown when reverting a diff succeeds",
              }
            : {
                id: "codex.unifiedDiff.reapplyPatchSuccess",
                defaultMessage: "Changes reapplied",
                description: "Toast shown when reapplying a diff succeeds",
              },
        ),
        {
          id: "turnDiffPatchAction",
        },
      );
    },
    onError(_error, variables) {
      const patchAction: PatchAction =
        variables?.revert === false ? "reapply" : "undo";
      scope.get(toast$).danger(
        intl.formatMessage(
          patchAction === "undo"
            ? {
                id: "codex.unifiedDiff.revertPatchError",
                defaultMessage: "Failed to revert changes",
                description: "Toast shown when reverting a diff fails",
              }
            : {
                id: "codex.unifiedDiff.reapplyPatchError",
                defaultMessage: "Failed to reapply changes",
                description: "Toast shown when reapplying a diff fails",
              },
        ),
        {
          id: "turnDiffPatchAction",
        },
      );
    },
  });
  const diffs = useMemo(() => parseDiff(item.unifiedDiff), [item.unifiedDiff]);

  const diffSummary = getDiffSummary(diffs);
  const { fileCount, linesAdded, linesDeleted } = diffSummary;
  const filesChangedLabel = intl.formatMessage(diffMessages.filesChanged, {
    fileCount,
  });
  const linesAddedLabel = intl.formatMessage(diffMessages.linesAdded, {
    linesAdded,
  });
  const linesDeletedLabel = intl.formatMessage(diffMessages.linesDeleted, {
    linesDeleted,
  });

  if (!diffSummary.hasChanges) {
    return null;
  }

  const showTopLevelDiffStats = fileCount > 1;
  const canRevert = cwd != null;
  const primaryPatchAction =
    lastSuccessfulPatchAction?.diff === item.unifiedDiff
      ? lastSuccessfulPatchAction.action === "undo"
        ? "reapply"
        : "undo"
      : "undo";

  const runPatchAction = (
    patchAction: PatchAction,
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    event.stopPropagation();
    if (revertPatchMutation.isPending) {
      return;
    }
    if (cwd == null) {
      return;
    }
    if (patchAction === "undo") {
      scope.get(productEventLogger$).log({
        eventName: "codex_undo_clicked",
        metadata: { source: "turn_diff" },
      });
    }
    revertPatchMutation.mutate({
      diff: item.unifiedDiff,
      cwd,
      hostConfig,
      revert: patchAction === "undo",
    });
  };

  return (
    <TracedView
      name="TurnDiffContent"
      attributes={{ "codex.turn_diff.state": "completed" }}
    >
      <div className="mb-2 flex flex-col overflow-hidden rounded-xl bg-token-list-hover-background/60 text-base">
        <div className="flex items-center gap-2">
          <div className="flex w-full min-w-0 flex-nowrap items-center gap-1 pr-1 pl-3">
            <span className="text-size-chat min-w-0 truncate py-2 text-token-input-foreground">
              {filesChangedLabel}
            </span>
            {showTopLevelDiffStats && (
              <>
                <span className="text-token-charts-green">
                  {linesAddedLabel}
                </span>
                <span className="text-token-charts-red">
                  {linesDeletedLabel}
                </span>
              </>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-0">
              {showRevertButton && (
                <div className="flex items-center gap-0.5">
                  <Button
                    color="ghost"
                    className="px-1.5 text-token-foreground"
                    disabled={!canRevert || revertPatchMutation.isPending}
                    onClick={(e) => {
                      runPatchAction(primaryPatchAction, e);
                    }}
                  >
                    {primaryPatchAction === "undo" ? (
                      <FormattedMessage
                        id="codex.unifiedDiff.revertChangesTooltip"
                        defaultMessage="Undo"
                        description="Label for button that reverts the diff in a Codex task"
                      />
                    ) : (
                      <FormattedMessage
                        id="codex.unifiedDiff.reapplyChangesTooltip"
                        defaultMessage="Reapply"
                        description="Label for button that reapplies the diff in a Codex task"
                      />
                    )}
                    {primaryPatchAction === "undo" ? (
                      <UndoIcon className="size-3.5 text-token-input-placeholder-foreground" />
                    ) : (
                      <RegenerateIcon className="size-3.5 text-token-input-placeholder-foreground" />
                    )}
                  </Button>
                </div>
              )}
              {/* In electron, the diff is in the review panel. */}
              <WithWindow extension>
                <Button
                  color="ghost"
                  className="px-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    messageBus.dispatchMessage("show-diff", {
                      unifiedDiff: item.unifiedDiff,
                      conversationId,
                      cwd: cwd ?? null,
                    });
                  }}
                >
                  <span className="whitespace-nowrap text-token-foreground max-xs:hidden">
                    <FormattedMessage
                      id="codex.unifiedDiff.viewDiffTooltip"
                      defaultMessage="Review"
                      description="Label for button that views the diff of a Codex task in an editor view"
                    />
                  </span>
                  <ArrowTopRightIcon className="icon-2xs text-token-input-placeholder-foreground" />
                </Button>
              </WithWindow>
            </div>
          </div>
        </div>

        <div className="flex flex-col divide-y-[0.5px] divide-token-border">
          {diffs.map((diff, index) => {
            const diffKey = `${diff.metadata.cacheKey ?? diff.metadata.name}:${index}`;
            if (exceedsInlineRenderBudget(diff)) {
              return (
                <TurnDiffLargeFileRow
                  key={diffKey}
                  diff={diff}
                  unifiedDiff={item.unifiedDiff}
                  conversationId={conversationId}
                  cwd={cwd}
                />
              );
            }

            return (
              <div key={diffKey} className="thread-diff-virtualized">
                <CodeDiff
                  hunkSeparators="simple"
                  diffViewClassName="composer-diff-simple-line max-h-[250px] overflow-y-auto"
                  diff={diff}
                  viewType="unified"
                  stickyHeader={false}
                  defaultOpen={false}
                  roundedCorners={false}
                  background={true}
                  conversationId={conversationId}
                  hostConfig={hostConfig}
                  cwd={cwd ?? undefined}
                  loadFullContent={false}
                  {...commentProps}
                />
              </div>
            );
          })}
        </div>
      </div>
      <TurnDiffPatchActionFailureDialog
        open={patchActionFailure != null}
        cwd={cwd}
        onOpenChange={(open) => {
          if (open) {
            return;
          }
          setPatchActionFailure(null);
        }}
        failure={patchActionFailure}
      />
    </TracedView>
  );
}

function TurnDiffLargeFileRow({
  diff,
  unifiedDiff,
  conversationId,
  cwd,
}: {
  diff: CodexDiffFile;
  unifiedDiff: string;
  conversationId: LocalOrRemoteConversationId;
  cwd: TurnDiffLocalConversationItem["cwd"];
}): React.ReactElement {
  const displayPath = diff.metadata.name;
  const displayName = getPathBasename(displayPath);

  return (
    <div className="thread-diff-virtualized bg-token-foreground/5">
      <div className="bg-token-side-bar-background">
        <div className="text-size-chat flex items-center gap-2 bg-token-foreground/5 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-token-input-foreground">
            {displayName}
          </span>
          <TaskDiffStats
            linesAdded={diff.additions}
            linesRemoved={diff.deletions}
          />
          <span className="text-token-description-foreground/80 max-[720px]:hidden">
            <FormattedMessage
              id="codex.unifiedDiff.inlineLargeFile"
              defaultMessage="Too large to render inline"
              description="Label shown when a file diff is too large to render inline in the thread view"
            />
          </span>
          <Button
            className="px-1.5"
            color="ghost"
            onClick={() => {
              messageBus.dispatchMessage("show-diff", {
                unifiedDiff,
                conversationId,
                cwd: cwd ?? null,
              });
            }}
          >
            <span className="whitespace-nowrap text-token-foreground max-xs:hidden">
              <FormattedMessage
                id="codex.unifiedDiff.viewDiffTooltip"
                defaultMessage="Review"
                description="Label for button that views the diff of a Codex task in an editor view"
              />
            </span>
            <ArrowTopRightIcon className="icon-2xs text-token-input-placeholder-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function exceedsInlineRenderBudget(diff: CodexDiffFile): boolean {
  const renderedLineEstimate = Math.max(
    diff.metadata.unifiedLineCount,
    diff.metadata.splitLineCount,
    diff.additions + diff.deletions,
  );
  return renderedLineEstimate > MAX_INLINE_RENDERED_DIFF_LINES;
}

const diffMessages = defineMessages({
  filesChanged: {
    id: "codex.unifiedDiff.filesChanged",
    defaultMessage:
      "{fileCount, plural, one {# file changed} other {# files changed}}",
    description: "Label for the number of files changed in a Codex task",
  },
  linesAdded: {
    id: "codex.unifiedDiff.linesAdded",
    defaultMessage: "+{linesAdded}",
    description: "Label for the number of lines added in a Codex task",
  },
  linesDeleted: {
    id: "codex.unifiedDiff.linesDeleted",
    defaultMessage: "-{linesDeleted}",
    description: "Label for the number of lines deleted in a Codex task",
  },
});
