import clsx from "clsx";
import type { ApplyPatchResult, GitCwd } from "protocol";
import type React from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import ArrowTopRightIcon from "@/icons/arrow-top-right.svg";
import XCircleIcon from "@/icons/x-circle.svg";
import { useMutationFromVSCode } from "@/vscode-api";

export function TurnDiffPatchActionFailureDialog({
  open,
  onOpenChange,
  failure,
  cwd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cwd: GitCwd | null;
  failure: {
    action: "undo" | "reapply";
    result: Pick<
      ApplyPatchResult,
      | "status"
      | "appliedPaths"
      | "skippedPaths"
      | "conflictedPaths"
      | "errorCode"
      | "execOutput"
    >;
  } | null;
}): React.ReactElement | null {
  if (failure == null) {
    return null;
  }

  const { action, result } = failure;
  const hasAnyPaths =
    result.appliedPaths.length > 0 ||
    result.skippedPaths.length > 0 ||
    result.conflictedPaths.length > 0;
  const fallbackErrorLine = getPatchErrorOutputLine(result.execOutput?.output);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      triggerAsChild={false}
      size="compact"
    >
      <DialogBody>
        <DialogSection>
          <DialogHeader
            icon={<XCircleIcon className="icon-sm text-token-charts-red" />}
            iconBackgroundClassName="bg-token-charts-red/10"
            title={<PatchActionFailureTitle action={action} result={result} />}
          />
        </DialogSection>
        <DialogSection>
          <div className="text-sm text-token-description-foreground">
            <PatchActionFailureDescription
              action={action}
              result={result}
              hasAnyPaths={hasAnyPaths}
              fallbackErrorLine={fallbackErrorLine}
            />
          </div>
        </DialogSection>
        {hasAnyPaths ? (
          <DialogSection className="max-h-[40vh] overflow-y-auto">
            <div className="flex flex-col gap-3">
              <PatchPathSection
                cwd={cwd}
                toneClassName="text-token-foreground"
                heading={
                  <FormattedMessage
                    id="codex.unifiedDiff.patchAppliedPathsHeading"
                    defaultMessage="Applied cleanly ({count})"
                    description="Heading for files where a patch action was applied cleanly"
                    values={{ count: result.appliedPaths.length }}
                  />
                }
                paths={result.appliedPaths}
              />
              <PatchPathSection
                cwd={cwd}
                toneClassName="text-token-description-foreground"
                heading={
                  <FormattedMessage
                    id="codex.unifiedDiff.patchSkippedPathsHeading"
                    defaultMessage="Skipped ({count})"
                    description="Heading for files skipped during a patch action"
                    values={{ count: result.skippedPaths.length }}
                  />
                }
                paths={result.skippedPaths}
              />
              <PatchPathSection
                cwd={cwd}
                toneClassName="text-token-charts-red"
                heading={
                  <FormattedMessage
                    id="codex.unifiedDiff.patchConflictedPathsHeading"
                    defaultMessage="Conflicts ({count})"
                    description="Heading for files with conflicts during a patch action"
                    values={{ count: result.conflictedPaths.length }}
                  />
                }
                paths={result.conflictedPaths}
              />
            </div>
          </DialogSection>
        ) : null}
        <DialogSection>
          <DialogFooter>
            <Button
              color="primary"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              <FormattedMessage
                id="codex.unifiedDiff.patchFailureDialogClose"
                defaultMessage="Close"
                description="Close button label for the patch action failure dialog"
              />
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}

function PatchActionFailureTitle({
  action,
  result,
}: {
  action: "undo" | "reapply";
  result: Pick<
    ApplyPatchResult,
    "status" | "appliedPaths" | "skippedPaths" | "conflictedPaths" | "errorCode"
  >;
}): React.ReactElement {
  if (result.errorCode === "not-git-repo") {
    return action === "undo" ? (
      <FormattedMessage
        id="codex.unifiedDiff.revertPatchNotGitRepo"
        defaultMessage="Undo requires a Git repository"
        description="Dialog title shown when trying to undo a diff outside a Git repository"
      />
    ) : (
      <FormattedMessage
        id="codex.unifiedDiff.reapplyPatchNotGitRepo"
        defaultMessage="Reapply requires a Git repository"
        description="Dialog title shown when trying to reapply a diff outside a Git repository"
      />
    );
  }

  if (result.appliedPaths.length > 0) {
    return action === "undo" ? (
      <FormattedMessage
        id="codex.unifiedDiff.revertPatchPartial"
        defaultMessage="Some changes reverted"
        description="Dialog title shown when reverting a diff partially succeeds"
      />
    ) : (
      <FormattedMessage
        id="codex.unifiedDiff.reapplyPatchPartial"
        defaultMessage="Some changes reapplied"
        description="Dialog title shown when reapplying a diff partially succeeds"
      />
    );
  }

  if (result.skippedPaths.length > 0 && result.conflictedPaths.length === 0) {
    return action === "undo" ? (
      <FormattedMessage
        id="codex.unifiedDiff.revertPatchNoChanges"
        defaultMessage="No changes reverted"
        description="Dialog title shown when reverting a diff made no changes"
      />
    ) : (
      <FormattedMessage
        id="codex.unifiedDiff.reapplyPatchNoChanges"
        defaultMessage="No changes reapplied"
        description="Dialog title shown when reapplying a diff made no changes"
      />
    );
  }

  return action === "undo" ? (
    <FormattedMessage
      id="codex.unifiedDiff.revertPatchError"
      defaultMessage="Failed to revert changes"
      description="Dialog title shown when reverting a diff fails"
    />
  ) : (
    <FormattedMessage
      id="codex.unifiedDiff.reapplyPatchError"
      defaultMessage="Failed to reapply changes"
      description="Dialog title shown when reapplying a diff fails"
    />
  );
}

function PatchActionFailureDescription({
  action,
  result,
  hasAnyPaths,
  fallbackErrorLine,
}: {
  action: "undo" | "reapply";
  result: Pick<
    ApplyPatchResult,
    "appliedPaths" | "skippedPaths" | "conflictedPaths" | "errorCode"
  >;
  hasAnyPaths: boolean;
  fallbackErrorLine: string | null;
}): React.ReactElement {
  if (result.errorCode === "not-git-repo") {
    return (
      <FormattedMessage
        id="codex.unifiedDiff.patchNotGitRepoDescription"
        defaultMessage="This action only works when running in a Git repository."
        description="Dialog description shown when patch apply/revert is attempted outside a Git repository"
      />
    );
  }

  if (hasAnyPaths) {
    return action === "undo" ? (
      <FormattedMessage
        id="codex.unifiedDiff.patchFailureDetailsIntroRevert"
        defaultMessage="There were issues reverting some files"
        description="Intro text for the patch action failure dialog when file details are available"
      />
    ) : (
      <FormattedMessage
        id="codex.unifiedDiff.patchFailureDetailsIntroReapply"
        defaultMessage="There were issues reapplying some files"
        description="Intro text for the patch action failure dialog when file details are available"
      />
    );
  }

  if (fallbackErrorLine) {
    return (
      <FormattedMessage
        id="codex.unifiedDiff.patchErrorOutputSummary"
        defaultMessage="Git apply error: {message}"
        description="Dialog details showing a short git apply error line when file-level patch details are unavailable"
        values={{ message: fallbackErrorLine }}
      />
    );
  }

  return (
    <FormattedMessage
      id="codex.unifiedDiff.patchFailureNoDetails"
      defaultMessage="No file details were returned for this patch action."
      description="Fallback dialog text when patch action fails without file details"
    />
  );
}

function PatchPathSection({
  toneClassName,
  heading,
  paths,
  cwd,
}: {
  toneClassName: string;
  heading: React.ReactNode;
  paths: Array<string>;
  cwd: GitCwd | null;
}): React.ReactElement | null {
  const openFile = useMutationFromVSCode("open-file");

  if (paths.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className={clsx("text-sm font-medium", toneClassName)}>
        {heading}
      </div>
      <ul className="flex flex-col gap-0.5 text-sm">
        {paths.map((path) => (
          <li key={path}>
            <button
              type="button"
              className="group w-full cursor-interaction rounded px-1 py-0.5 text-left focus-visible:ring-1 focus-visible:ring-token-focus-border focus-visible:outline-none"
              title={path}
              onClick={() => {
                openFile.mutate({
                  path,
                  cwd,
                });
              }}
            >
              <span className="flex items-center gap-1">
                <span className="group-hover:text-token-link-foreground group-focus-visible:text-token-link-foreground min-w-0 truncate transition-colors">
                  {path}
                </span>
                <ArrowTopRightIcon className="text-token-link-foreground icon-2xs hidden shrink-0 group-hover:block group-focus-visible:block" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getPatchErrorOutputLine(output: string | undefined): string | null {
  if (!output) {
    return null;
  }

  const line = output
    .split(/\r?\n/)
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.length > 0);
  if (!line) {
    return null;
  }

  if (line.length <= 180) {
    return line;
  }

  return `${line.slice(0, 179)}…`;
}
