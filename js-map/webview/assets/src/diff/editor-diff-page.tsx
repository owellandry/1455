import { useScope, useSignal } from "maitai";
import { createGitCwd, type LocalOrRemoteConversationId } from "protocol";
import { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useLocation } from "react-router";

import { Button } from "@/components/button";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { Tooltip } from "@/components/tooltip";
import SplitDiffIcon from "@/icons/diff-split.svg";
import UnifiedDiffIcon from "@/icons/diff-unified.svg";
import ImageSquareIcon from "@/icons/image-square.svg";
import JsonIcon from "@/icons/json.svg";
import { AppScope } from "@/scopes/app-scope";
import { useFetchFromVSCode } from "@/vscode-api";

import { CodeDiff } from "./code-diff";
import { getDiffSummary } from "./diff-summary";
import { diffViewMode$, richDiffPreview$ } from "./diff-view-mode";
import { parseDiff } from "./parse-diff";
import { useDiffCommentSources } from "./use-diff-comment-sources";

const AUTO_OPEN_MAX_FILES = 25;
const AUTO_OPEN_MAX_LINES = 2000;

export function EditorDiffPage(): React.ReactElement {
  const result = useDiffContent();
  if ("error" in result) {
    return (
      <div className="p-4 text-token-error-foreground">{result.error}</div>
    );
  }

  return (
    <EditorDiffPageContent
      diffContent={result.diffContent}
      conversationId={result.conversationId}
    />
  );
}

export function EditorDiffPageContent({
  diffContent,
  conversationId,
}: {
  diffContent: string;
  conversationId: LocalOrRemoteConversationId;
}): React.ReactElement {
  const scope = useScope(AppScope);
  const { commentProps } = useDiffCommentSources({ conversationId });
  const diffFiles = useMemo(() => parseDiff(diffContent), [diffContent]);
  const diffSummary = getDiffSummary(diffFiles);
  const diffViewMode = useSignal(diffViewMode$);
  const richPreviewEnabled = useSignal(richDiffPreview$);
  const intl = useIntl();
  const { data: workspaceRoots } = useFetchFromVSCode("active-workspace-roots");
  const location = useLocation();
  const cwd = location.state?.cwd || workspaceRoots?.roots?.[0];

  const { fileCount, linesAdded, linesDeleted } = diffSummary;
  const shouldAutoOpenDiffs =
    fileCount <= AUTO_OPEN_MAX_FILES &&
    linesAdded + linesDeleted <= AUTO_OPEN_MAX_LINES;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between py-2 pr-2 pl-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-token-input-foreground">
            <FormattedMessage
              id="codex.diffView.filesChanged"
              defaultMessage="{fileCount, plural, one {# file changed} other {# files changed}}"
              description="Label for the number of files changed in DiffView"
              values={{ fileCount }}
            />
          </span>
          {(linesAdded > 0 || linesDeleted > 0) && (
            <div className="flex items-center gap-1">
              <span className="text-token-charts-green">
                <FormattedMessage
                  id="codex.diffView.linesAdded"
                  defaultMessage="+{linesAdded}"
                  description="Label for lines added in DiffView"
                  values={{ linesAdded }}
                />
              </span>
              <span className="text-token-charts-red">
                <FormattedMessage
                  id="codex.diffView.linesDeleted"
                  defaultMessage="-{linesDeleted}"
                  description="Label for lines deleted in DiffView"
                  values={{ linesDeleted }}
                />
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <SegmentedToggle
            options={[
              {
                id: "left",
                label: <UnifiedDiffIconWithTooltip className="icon-xs" />,
              },
              {
                id: "right",
                label: <SplitDiffIconWithTooltip className="icon-xs" />,
              },
            ]}
            selectedId={diffViewMode === "unified" ? "left" : "right"}
            onSelect={(s) =>
              scope.set(diffViewMode$, s === "left" ? "unified" : "split")
            }
            size="toolbar"
          />
          <Tooltip
            tooltipContent={
              <FormattedMessage
                id="codex.diffView.richPreviewToggle"
                defaultMessage="Toggle rich preview"
                description="Tooltip to toggle rich previews in the diff view"
              />
            }
          >
            <Button
              aria-label={intl.formatMessage({
                id: "codex.diffView.richPreviewToggle",
                defaultMessage: "Toggle rich preview",
                description: "Tooltip to toggle rich previews in the diff view",
              })}
              aria-pressed={richPreviewEnabled}
              color={richPreviewEnabled ? "ghostActive" : "ghost"}
              size="icon"
              onClick={() => scope.set(richDiffPreview$, !richPreviewEnabled)}
            >
              {richPreviewEnabled ? (
                <ImageSquareIcon className="icon-xs text-token-description-foreground" />
              ) : (
                <JsonIcon className="icon-xs text-token-description-foreground" />
              )}
            </Button>
          </Tooltip>
        </div>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto p-[var(--padding-panel)] pt-0">
        {diffFiles.map((f, i) => (
          <CodeDiff
            key={i}
            diff={f}
            hunkSeparators="line-info"
            viewType={diffViewMode}
            richPreviewEnabled={richPreviewEnabled}
            stickyHeader
            diffViewWrap={false}
            defaultOpen={shouldAutoOpenDiffs}
            cwd={cwd != null ? createGitCwd(cwd) : undefined}
            conversationId={conversationId}
            {...commentProps}
          />
        ))}
      </div>
    </div>
  );
}

function useDiffContent():
  | {
      error: string;
    }
  | {
      diffContent: string;
      conversationId: LocalOrRemoteConversationId;
    } {
  const intl = useIntl();
  const location = useLocation();

  return useMemo(() => {
    const state = location.state;

    if (state?.unifiedDiff && state.conversationId) {
      try {
        return {
          diffContent: state.unifiedDiff,
          conversationId: state.conversationId ?? null,
        };
      } catch {
        return {
          error: intl.formatMessage({
            id: "codex.diffView.failedToDecodeBase64Diff",
            defaultMessage: "Couldn’t load this diff",
            description:
              "Error message displayed when the diff cannot be decoded",
          }),
        };
      }
    }

    return {
      error: intl.formatMessage({
        id: "codex.diffView.noDiffData",
        defaultMessage: "No diff available",
        description: "Error message displayed when there is no diff data",
      }),
    };
  }, [intl, location.state]);
}

function UnifiedDiffIconWithTooltip({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          id="codex.diffView.switchToUnified"
          defaultMessage="Switch to unified diff"
          description="Tooltip to switch to unified diff view"
        />
      }
    >
      <UnifiedDiffIcon className={className} />
    </Tooltip>
  );
}

function SplitDiffIconWithTooltip({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          id="codex.diffView.switchToUnified"
          defaultMessage="Switch to unified diff"
          description="Tooltip to switch to unified diff view"
        />
      }
    >
      <SplitDiffIcon className={className} />
    </Tooltip>
  );
}
