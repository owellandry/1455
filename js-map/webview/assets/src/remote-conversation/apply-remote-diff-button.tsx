import path from "path";

import type { CodeEnvironment } from "protocol";
import { useMemo } from "react";
import { FormattedMessage } from "react-intl";

import { ApplyDropdown } from "@/components/apply-dropdown";
import { Button } from "@/components/button";
import { Dropdown } from "@/components/dropdown";
import { TaskDiffStats } from "@/diff-stats";
import { parseDiff } from "@/diff/parse-diff";
import FolderMoveIcon from "@/icons/folder-move.svg";

import { ApplyResultsDialog } from "./apply-or-revert-banner";
import { useApplyRemoteDiff } from "./use-apply-remote-diff";

/**
 * Toolbar button for applying a remote diff with the same flow as the banner.
 */
export function ApplyRemoteDiffButton({
  turnId,
  diff,
  taskEnvironment,
}: {
  turnId: string;
  diff: string;
  taskEnvironment: CodeEnvironment | null | undefined;
}): React.ReactElement {
  const {
    hasAppliedCodeLocally,
    canApply,
    isApplying,
    apply,
    revert,
    results,
    setResultsOpen,
    isNonWorkspaceEnvironment,
    taskEnvironmentLabel,
    gitRootPath,
    branchName,
  } = useApplyRemoteDiff({
    turnId,
    diff,
    taskEnvironment,
  });

  const triggerLabelId = hasAppliedCodeLocally
    ? "codex.remoteConversation.applyDiff.revert"
    : "codex.remoteConversation.applyDiff.apply";
  const triggerMessage = hasAppliedCodeLocally
    ? {
        id: triggerLabelId,
        defaultMessage: "Revert",
        description: "Button to revert a remote diff locally",
      }
    : {
        id: triggerLabelId,
        defaultMessage: "Apply",
        description: "Button to apply a remote diff locally",
      };
  const changeStats = useMemo((): {
    fileCount: number;
    linesAdded: number;
    linesRemoved: number;
  } | null => {
    if (!diff) {
      return null;
    }
    const diffFiles = parseDiff(diff);
    let linesAdded = 0;
    let linesRemoved = 0;
    for (const diffFile of diffFiles) {
      linesAdded += diffFile.additions;
      linesRemoved += diffFile.deletions;
    }
    return {
      fileCount: diffFiles.length,
      linesAdded,
      linesRemoved,
    };
  }, [diff]);
  const showHeader = !results.result && !hasAppliedCodeLocally;
  const header = showHeader ? (
    <div className="flex flex-col gap-3 pt-2 pb-1">
      <FolderMoveIcon className="icon-lg text-token-foreground" />
      <div className="heading-lg text-token-foreground">
        <FormattedMessage
          id="codex.applyDropdown.header.title"
          defaultMessage="Apply changes"
          description="Title for the apply dropdown header"
        />
      </div>
      {changeStats ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-token-description-foreground">
            <FormattedMessage
              id="codex.applyDropdown.header.changes"
              defaultMessage="Changes"
              description="Label for the apply dropdown change summary"
            />
          </span>
          <span className="font-medium text-token-foreground">
            <FormattedMessage
              id="codex.applyDropdown.header.fileCount"
              defaultMessage="{count, plural, one {# file} other {# files}}"
              description="File count summary in apply dropdown header"
              values={{ count: changeStats.fileCount }}
            />
          </span>
          <span className="flex items-center gap-1">
            <TaskDiffStats
              linesAdded={changeStats.linesAdded}
              linesRemoved={changeStats.linesRemoved}
            />
            <span className="text-token-description-foreground">
              <FormattedMessage
                id="codex.applyDropdown.header.rows"
                defaultMessage="rows"
                description="Label for line change totals in apply dropdown header"
              />
            </span>
          </span>
        </div>
      ) : null}
      <Dropdown.Separator paddingClassName="py-2" />
      <div className="mb-1 text-sm text-token-description-foreground">
        <FormattedMessage
          id="codex.applyDropdown.header.workspace"
          defaultMessage="Project"
          description="Label for the workspace list in apply dropdown header"
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      <ApplyDropdown
        align="end"
        disabled={isApplying}
        contentWidth="panelWide"
        header={header}
        context={{
          targets: gitRootPath
            ? [
                {
                  label: branchName ?? path.basename(gitRootPath),
                  subtitle: path.basename(gitRootPath),
                  gitRoot: gitRootPath,
                  workspaceRoot: gitRootPath,
                },
              ]
            : [],
          results: results.result
            ? {
                appliedPaths: results.result.appliedPaths ?? [],
                skippedPaths: results.result.skippedPaths ?? [],
                conflictedPaths: results.result.conflictedPaths ?? [],
              }
            : null,
        }}
        trigger={
          <Button
            size="toolbar"
            color="outline"
            loading={isApplying}
            disabled={!canApply || isApplying}
          >
            <FolderMoveIcon className="icon-xs" />
            <FormattedMessage {...triggerMessage} />
          </Button>
        }
        title={
          <FormattedMessage
            id="codex.remoteConversation.applyDiff.dropdownTitle"
            defaultMessage="Apply changes to a local branch"
            description="Dropdown title for applying remote diff"
          />
        }
        actions={
          hasAppliedCodeLocally
            ? {
                primary: {
                  label: (
                    <FormattedMessage
                      id="codex.remoteConversation.applyDiff.revertCta"
                      defaultMessage="Revert changes"
                      description="Dropdown button to revert a remote diff locally"
                    />
                  ),
                  onClick: revert,
                  color: "secondary",
                  disabled: !canApply || isApplying,
                  loading: isApplying,
                },
                secondary: {
                  label: (
                    <FormattedMessage
                      id="codex.applyOrRevertBanner.reapply"
                      defaultMessage="Reapply"
                      description="Label to reapply code changes to Codex"
                    />
                  ),
                  onClick: apply,
                  color: "ghost",
                  disabled: !canApply || isApplying,
                  loading: isApplying,
                },
              }
            : {
                primary: {
                  label: (
                    <FormattedMessage
                      id="codex.remoteConversation.applyDiff.applyCta"
                      defaultMessage="Apply changes"
                      description="Dropdown button to apply a remote diff locally"
                    />
                  ),
                  onClick: apply,
                  color: "secondary",
                  disabled: !canApply || isApplying,
                  loading: isApplying,
                },
              }
        }
        footer={
          isNonWorkspaceEnvironment && taskEnvironmentLabel ? (
            <div className="text-center text-sm text-balance text-token-editor-warning-foreground">
              <FormattedMessage
                id="codex.applyOrRevertBanner.applyMessageDifferentEnvironment"
                defaultMessage="This task was made in {environment} so may not apply cleanly."
                description="Banner warning the user that the Codex code changes they are viewing were made in a different environment and may not apply cleanly."
                values={{
                  environment: (
                    <span className="font-medium">{taskEnvironmentLabel}</span>
                  ),
                }}
              />
            </div>
          ) : null
        }
      />
      <ApplyResultsDialog
        open={results.open}
        result={results.result}
        onOpenChange={setResultsOpen}
      />
    </>
  );
}
