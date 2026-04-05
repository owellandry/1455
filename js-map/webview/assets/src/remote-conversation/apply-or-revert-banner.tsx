import type { ApplyPatchResult, CodeEnvironment } from "protocol";
import { FormattedMessage, useIntl } from "react-intl";

import { Banner } from "@/components/banner";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { Tooltip } from "@/components/tooltip";
import CodexIcon from "@/icons/codex.svg";
import DockOffIcon from "@/icons/dock-off.svg";

import { useApplyRemoteDiff } from "./use-apply-remote-diff";

export function ApplyOrRevertBanner({
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
  } = useApplyRemoteDiff({
    turnId,
    diff,
    taskEnvironment,
  });

  function DifferentEnvironmentIcon({
    className,
  }: {
    className?: string;
  }): React.ReactElement {
    if (!taskEnvironmentLabel) {
      return <DockOffIcon className={className} />;
    }
    return (
      <Tooltip
        tooltipContent={
          <div className="max-w-[200px]">
            <FormattedMessage
              id="codex.applyOrRevertBanner.applyMessageDifferentEnvironment.tooltip"
              defaultMessage="Changes made in {environment} so may not apply cleanly."
              description="Banner warning the user that the Codex code changes they are viewing were made in a different environment and may not apply cleanly."
              values={{
                environment: (
                  <code className="whitespace-nowrap">
                    {taskEnvironmentLabel}
                  </code>
                ),
              }}
            />
          </div>
        }
      >
        <DockOffIcon className={className} />
      </Tooltip>
    );
  }

  if (hasAppliedCodeLocally) {
    return (
      <>
        <Banner
          Icon={
            isNonWorkspaceEnvironment ? DifferentEnvironmentIcon : CodexIcon
          }
          content={
            <div className="flex flex-col gap-0.5">
              <div className="truncate text-base">
                <FormattedMessage
                  id="codex.applyOrRevertBanner.revertMessage"
                  defaultMessage="Revert applied changes?"
                  description="Banner message for reverting applied changes from Codex Cloud"
                />
              </div>
              {isNonWorkspaceEnvironment && taskEnvironmentLabel && (
                <BannerEnvironmentWarningText
                  taskEnvironmentName={taskEnvironmentLabel}
                />
              )}
            </div>
          }
          primaryCtaText={
            <FormattedMessage
              id="codex.applyOrRevertBanner.revert"
              defaultMessage="Revert"
              description="Label to revert applied code changes from Codex"
            />
          }
          onPrimaryCtaClick={() => {
            revert();
          }}
          isPrimaryCtaDisabled={isApplying || !canApply}
          secondaryCtaText={
            <FormattedMessage
              id="codex.applyOrRevertBanner.reapply"
              defaultMessage="Reapply"
              description="Label to reapply code changes to Codex"
            />
          }
          onSecondaryCtaClick={() => {
            apply();
          }}
          isSecondaryCtaDisabled={isApplying || !canApply}
        />
        <ApplyResultsDialog
          open={results.open}
          result={results.result}
          onOpenChange={setResultsOpen}
        />
      </>
    );
  }

  return (
    <>
      <Banner
        Icon={isNonWorkspaceEnvironment ? DifferentEnvironmentIcon : CodexIcon}
        content={
          <div className="flex flex-col gap-0.5">
            <div className="text-base">
              <FormattedMessage
                id="codex.applyOrRevertBanner.applyMessage"
                defaultMessage="Apply changes and continue locally?"
                description="Banner message for applying changes to Codex locally"
              />
            </div>
            {isNonWorkspaceEnvironment && taskEnvironmentLabel && (
              <BannerEnvironmentWarningText
                taskEnvironmentName={taskEnvironmentLabel}
              />
            )}
          </div>
        }
        primaryCtaText={
          <FormattedMessage
            id="codex.applyOrRevertBanner.apply"
            defaultMessage="Apply"
            description="Label to apply code changes from Codex"
          />
        }
        onPrimaryCtaClick={() => {
          apply();
        }}
        isPrimaryCtaDisabled={isApplying || !canApply}
      />

      <ApplyResultsDialog
        open={results.open}
        result={results.result}
        onOpenChange={setResultsOpen}
      />
    </>
  );
}

function BannerEnvironmentWarningText({
  taskEnvironmentName,
}: {
  taskEnvironmentName: string;
}): React.ReactElement {
  return (
    <div className="truncate text-base text-token-editor-warning-foreground">
      <FormattedMessage
        id="codex.applyOrRevertBanner.applyMessageDifferentEnvironment"
        defaultMessage="This task was made in {environment} so may not apply cleanly."
        description="Banner warning the user that the Codex code changes they are viewing were made in a different environment and may not apply cleanly."
        values={{
          environment: (
            <code className="whitespace-nowrap">{taskEnvironmentName}</code>
          ),
        }}
      />
    </div>
  );
}

export function ApplyResultsDialog({
  open,
  onOpenChange,
  result,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ApplyPatchResult | null;
}): React.ReactElement {
  const intl = useIntl();
  const applied = result?.appliedPaths ?? [];
  const conflicted = result?.conflictedPaths ?? [];
  const skipped = result?.skippedPaths ?? [];
  const isNotGitRepo = result?.errorCode === "not-git-repo";

  const hasAny =
    applied.length > 0 || conflicted.length > 0 || skipped.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} triggerAsChild={false}>
      <DialogBody>
        <DialogSection>
          <DialogHeader
            title={
              <FormattedMessage
                id="codex.applyResultsDialog.title"
                defaultMessage="Apply results"
                description="Title for dialog showing apply patch results"
              />
            }
          />
        </DialogSection>
        {!hasAny ? (
          <DialogSection className="text-token-description-foreground">
            <p>
              {isNotGitRepo ? (
                <FormattedMessage
                  id="codex.applyResultsDialog.notGitRepo"
                  defaultMessage="This action only works when running in a Git repository."
                  description="Shown when apply/revert fails because the workspace is not in a Git repository"
                />
              ) : (
                <FormattedMessage
                  id="codex.applyResultsDialog.noDetails"
                  defaultMessage="No file details available."
                  description="Shown when there are no file-level results to display"
                />
              )}
            </p>
          </DialogSection>
        ) : (
          <DialogSection className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
            {applied.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="font-medium">
                  <FormattedMessage
                    id="codex.applyResultsDialog.applied"
                    defaultMessage="Applied cleanly ({count})"
                    description="Heading for applied paths"
                    values={{ count: applied.length }}
                  />
                </div>
                <ul>
                  {applied.map((p) => (
                    <li key={p} className="truncate" title={p}>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {conflicted.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="font-medium text-token-charts-red">
                  {intl.formatMessage(
                    {
                      id: "codex.applyResultsDialog.conflicted",
                      defaultMessage: "Conflicted ({count})",
                      description: "Heading for conflicted paths",
                    },
                    { count: conflicted.length },
                  )}
                </div>
                <ul>
                  {conflicted.map((p) => (
                    <li key={p} className="truncate" title={p}>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {skipped.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="font-medium text-token-description-foreground">
                  {intl.formatMessage(
                    {
                      id: "codex.applyResultsDialog.skipped",
                      defaultMessage: "Skipped ({count})",
                      description: "Heading for skipped paths",
                    },
                    { count: skipped.length },
                  )}
                </div>
                <ul>
                  {skipped.map((p) => (
                    <li key={p} className="truncate" title={p}>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DialogSection>
        )}
        <DialogSection>
          <DialogFooter>
            <Button color="outline" onClick={() => onOpenChange(false)}>
              <FormattedMessage
                id="codex.applyResultsDialog.close"
                defaultMessage="Close"
                description="Close button for apply results dialog"
              />
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}
