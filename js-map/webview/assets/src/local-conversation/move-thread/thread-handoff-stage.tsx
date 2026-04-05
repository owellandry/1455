import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { TerminalOutputBlock } from "@/components/terminal-output-block";
import CheckIcon from "@/icons/check-md.svg";
import ExclamationMarkCircleIcon from "@/icons/exclamation-mark-circle.svg";
import SortIcon from "@/icons/sort.svg";
import XCircleIcon from "@/icons/x-circle.svg";
import XIcon from "@/icons/x.svg";

import type {
  ThreadHandoffOperation,
  ThreadHandoffStep,
} from "./thread-handoff-store";

type VisibleThreadHandoffStep =
  | ThreadHandoffStep
  | {
      id: "rolling-back-changes";
      status: "running";
    };

export function ThreadHandoffStage({
  operation,
  onClose,
  onRetry,
}: {
  operation: ThreadHandoffOperation;
  onClose: () => void;
  onRetry: () => void;
}): ReactElement {
  if (operation.status === "queued" || operation.status === "running") {
    return <ThreadHandoffProgressStage operation={operation} />;
  }
  if (operation.status === "warning") {
    return (
      <ThreadHandoffWarningStage operation={operation} onClose={onClose} />
    );
  }
  if (operation.status === "success") {
    return <ThreadHandoffSuccessStage operation={operation} />;
  }
  return (
    <ThreadHandoffErrorStage
      operation={operation}
      onClose={onClose}
      onRetry={onRetry}
    />
  );
}

function ThreadHandoffProgressStage({
  operation,
}: {
  operation: ThreadHandoffOperation;
}): ReactElement {
  const visibleSteps = getVisibleProgressSteps(operation);

  return (
    <DialogBody className="gap-0 px-6 py-5">
      <DialogSection className="gap-0">
        <DialogHeader
          icon={getDirectionIcon(operation)}
          title={getRunningTitle(operation)}
          className="gap-4"
          iconClassName="h-10 w-10 rounded-2xl p-0"
          iconBackgroundClassName="bg-token-foreground/5"
          titleClassName="font-semibold"
          subtitleClassName="text-[13px] leading-6 tracking-[-0.13px]"
          subtitle={
            <FormattedMessage
              id="localConversation.threadHandoff.progress.subtitle"
              defaultMessage="Hang tight, this may take a few moments. You can close this modal, we’ll let you know when the hand-off is finished."
              description="Subtitle shown while a thread handoff is running"
            />
          }
        />
      </DialogSection>
      <DialogSection className="gap-4 pt-5">
        {visibleSteps.map((step) => (
          <ThreadHandoffStepRow
            key={step.id}
            step={step}
            operation={operation}
          />
        ))}
      </DialogSection>
    </DialogBody>
  );
}

function ThreadHandoffSuccessStage({
  operation,
}: {
  operation: ThreadHandoffOperation;
}): ReactElement {
  return (
    <DialogBody className="gap-0 px-6 py-5">
      <DialogSection className="gap-0">
        <DialogHeader
          icon={<CheckIcon className="icon-md text-token-charts-green" />}
          className="gap-4"
          iconClassName="h-10 w-10 rounded-2xl p-0"
          iconBackgroundClassName="bg-token-charts-green/20"
          title={getSuccessTitle(operation)}
          titleClassName="font-semibold"
          subtitle={getSuccessSubtitle(operation)}
          subtitleClassName="text-[13px] leading-6 tracking-[-0.13px]"
        />
      </DialogSection>
    </DialogBody>
  );
}

function ThreadHandoffWarningStage({
  operation,
  onClose,
}: {
  operation: ThreadHandoffOperation;
  onClose: () => void;
}): ReactElement {
  return (
    <DialogBody className="gap-0 px-6 py-5">
      <DialogSection>
        <DialogHeader
          icon={
            <ExclamationMarkCircleIcon className="icon-md text-token-editor-warning-foreground" />
          }
          className="gap-4"
          iconClassName="h-10 w-10 rounded-2xl p-0"
          iconBackgroundClassName="bg-token-editor-warning-foreground/15"
          title={getWarningTitle(operation)}
          titleClassName="font-semibold"
          subtitle={operation.warningMessage}
          subtitleClassName="text-[13px] leading-6 tracking-[-0.13px]"
        />
      </DialogSection>
      <DialogSection className="pt-6">
        <DialogFooter>
          <Button
            color="primary"
            className="h-8 rounded-full px-4 text-[13px] font-medium"
            onClick={onClose}
          >
            <FormattedMessage
              id="localConversation.threadHandoff.warning.close"
              defaultMessage="Close"
              description="Button label to dismiss the warning thread handoff modal"
            />
          </Button>
        </DialogFooter>
      </DialogSection>
    </DialogBody>
  );
}

function ThreadHandoffErrorStage({
  operation,
  onClose,
  onRetry,
}: {
  operation: ThreadHandoffOperation;
  onClose: () => void;
  onRetry: () => void;
}): ReactElement {
  const execOutput = operation.execOutput;

  return (
    <DialogBody className="gap-0 px-6 py-5">
      <DialogSection>
        <DialogHeader
          icon={<XCircleIcon className="icon-md text-token-danger -ml-2" />}
          className="gap-4"
          iconClassName="h-auto w-auto rounded-none p-0"
          iconBackgroundClassName="bg-transparent"
          title={getErrorTitle(operation)}
          titleClassName="font-semibold"
          subtitle={operation.errorMessage}
          subtitleClassName="text-[13px] leading-6 tracking-[-0.13px]"
        />
      </DialogSection>
      {execOutput != null && execOutput.output.length > 0 ? (
        <DialogSection className="pt-5">
          <TerminalOutputBlock
            command={execOutput?.command}
            output={execOutput.output}
          />
        </DialogSection>
      ) : null}
      <DialogSection className="pt-5">
        <DialogFooter>
          <Button
            color="secondary"
            className="h-8 rounded-full px-4 text-[13px] font-medium"
            onClick={onClose}
          >
            <FormattedMessage
              id="localConversation.threadHandoff.error.close"
              defaultMessage="Close"
              description="Button label to close the failed thread handoff modal"
            />
          </Button>
          <Button
            color="primary"
            className="h-8 rounded-full px-4 text-[13px] font-medium"
            onClick={onRetry}
          >
            <FormattedMessage
              id="localConversation.threadHandoff.error.retry"
              defaultMessage="Try again"
              description="Button label to retry a failed thread handoff"
            />
          </Button>
        </DialogFooter>
      </DialogSection>
    </DialogBody>
  );
}

function ThreadHandoffStepRow({
  step,
  operation,
}: {
  step: VisibleThreadHandoffStep;
  operation: ThreadHandoffOperation;
}): ReactElement {
  return (
    <div className="flex items-center gap-3">
      <ThreadHandoffStepIcon status={step.status} />
      <div
        className={clsx("text-[13px] leading-6 tracking-[-0.13px]", {
          "font-medium text-token-foreground": step.status === "running",
          "text-token-foreground": step.status === "done",
          "text-token-editor-error-foreground": step.status === "failed",
          "text-token-description-foreground": step.status === "pending",
        })}
      >
        {getStepLabel(step.id, operation)}
      </div>
    </div>
  );
}

function ThreadHandoffStepIcon({
  status,
}: {
  status: ThreadHandoffStep["status"];
}): ReactElement {
  if (status === "running") {
    return (
      <span className="relative h-4 w-4 shrink-0">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-token-foreground border-r-token-foreground" />
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="border-token-success/40 bg-token-success/15 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border">
        <CheckIcon className="icon-2xs text-token-success" />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-token-editor-error-foreground/40 bg-token-editor-error-foreground/15">
        <XIcon className="icon-2xs text-token-editor-error-foreground" />
      </span>
    );
  }
  return (
    <span className="border-token-border-subtle h-4 w-4 shrink-0 rounded-full border-2" />
  );
}

function getDirectionIcon(_operation: ThreadHandoffOperation): ReactNode {
  return <SortIcon className="icon-md rotate-90 text-token-foreground" />;
}

function getRunningTitle(operation: ThreadHandoffOperation): ReactNode {
  if (operation.direction === "to-worktree") {
    return (
      <FormattedMessage
        id="localConversation.threadHandoff.progress.worktree.title"
        defaultMessage="Handing off to worktree"
        description="Title shown while a thread is being handed off to a worktree"
      />
    );
  }
  return (
    <FormattedMessage
      id="localConversation.threadHandoff.progress.local.title"
      defaultMessage="Handing off to local"
      description="Title shown while a thread is being handed off to local"
    />
  );
}

function getWarningTitle(operation: ThreadHandoffOperation): ReactNode {
  if (operation.direction === "to-worktree") {
    return (
      <FormattedMessage
        id="localConversation.threadHandoff.warning.worktree.title"
        defaultMessage="Hand-off to worktree needs attention"
        description="Title shown when move to worktree finishes with a warning"
      />
    );
  }
  return (
    <FormattedMessage
      id="localConversation.threadHandoff.warning.local.title"
      defaultMessage="Hand-off to local needs attention"
      description="Title shown when move to local finishes with a warning"
    />
  );
}

function getErrorTitle(operation: ThreadHandoffOperation): ReactNode {
  if (operation.direction === "to-worktree") {
    return (
      <FormattedMessage
        id="localConversation.threadHandoff.error.worktree.title"
        defaultMessage="Hand-off to worktree failed"
        description="Title shown when move to worktree fails"
      />
    );
  }
  return (
    <FormattedMessage
      id="localConversation.threadHandoff.error.local.title"
      defaultMessage="Hand-off to local failed"
      description="Title shown when move to local fails"
    />
  );
}

function getSuccessTitle(operation: ThreadHandoffOperation): ReactNode {
  if (operation.direction === "to-worktree") {
    return (
      <FormattedMessage
        id="localConversation.threadHandoff.success.worktree.title"
        defaultMessage="Handed-off to worktree"
        description="Title shown when move to worktree succeeds while the modal is open"
      />
    );
  }
  return (
    <FormattedMessage
      id="localConversation.threadHandoff.success.local.title"
      defaultMessage="Handed-off to local"
      description="Title shown when move to local succeeds while the modal is open"
    />
  );
}

function getSuccessSubtitle(operation: ThreadHandoffOperation): ReactNode {
  if (operation.direction === "to-local") {
    return (
      <FormattedMessage
        id="localConversation.threadHandoff.success.local.subtitle"
        defaultMessage="You are now working on {branch} locally."
        description="Subtitle shown when move to local succeeds while the modal is open"
        values={{ branch: operation.sourceBranch }}
      />
    );
  }

  const worktreeBranch = operation.worktreeBranch ?? operation.sourceBranch;
  const localBranch =
    operation.localBranch != null &&
    operation.localBranch !== operation.sourceBranch
      ? operation.localBranch
      : null;
  const worktreeDescription =
    operation.request.existingWorktreeGitRoot == null ? (
      <FormattedMessage
        id="localConversation.threadHandoff.success.worktreeDescription.new"
        defaultMessage="new worktree"
        description="Noun phrase describing a newly created worktree in the thread handoff success message"
      />
    ) : (
      <FormattedMessage
        id="localConversation.threadHandoff.success.worktreeDescription.existing"
        defaultMessage="worktree"
        description="Noun phrase describing an existing worktree in the thread handoff success message"
      />
    );

  if (localBranch == null) {
    return (
      <FormattedMessage
        id="localConversation.threadHandoff.success.worktree.subtitle"
        defaultMessage="You are now working on {worktreeBranch} in a {worktreeDescription}."
        description="Subtitle shown when move to worktree succeeds while the modal is open and no local checkout branch was changed"
        values={{ worktreeBranch, worktreeDescription }}
      />
    );
  }

  return (
    <FormattedMessage
      id="localConversation.threadHandoff.success.worktree.subtitle.localBranch"
      defaultMessage="You are now working on {worktreeBranch} in a {worktreeDescription}. Branch {localBranch} was checked out locally."
      description="Subtitle shown when move to worktree succeeds while the modal is open and a local checkout branch was changed"
      values={{ worktreeBranch, worktreeDescription, localBranch }}
    />
  );
}

function getVisibleProgressSteps(
  operation: ThreadHandoffOperation,
): Array<VisibleThreadHandoffStep> {
  const failedStepIndex = operation.steps.findIndex(
    (step) => step.status === "failed",
  );
  if (failedStepIndex === -1) {
    return operation.steps;
  }

  const visibleSteps = operation.steps.slice(0, failedStepIndex + 1);
  if (failedStepIndex === operation.steps.length - 1) {
    return visibleSteps;
  }

  return [
    ...visibleSteps,
    {
      id: "rolling-back-changes",
      status: "running",
    },
  ];
}

function getStepLabel(
  stepId: VisibleThreadHandoffStep["id"],
  operation: ThreadHandoffOperation,
): ReactNode {
  if (stepId === "rolling-back-changes") {
    return (
      <FormattedMessage
        id="localConversation.threadHandoff.step.rollingBackChanges"
        defaultMessage="Rolling back changes"
        description="Progress step shown after a thread handoff step fails while cleanup is still in progress"
      />
    );
  }

  switch (stepId) {
    case "create-new-worktree":
      return (
        <FormattedMessage
          id="localConversation.threadHandoff.step.createNewWorktree"
          defaultMessage="Creating a new worktree"
          description="Progress step shown while creating a new worktree during thread handoff"
        />
      );
    case "reuse-existing-worktree":
      return (
        <FormattedMessage
          id="localConversation.threadHandoff.step.reuseExistingWorktree"
          defaultMessage="Reusing the existing worktree"
          description="Progress step shown while reusing an existing worktree during thread handoff"
        />
      );
    case "stash-source-changes":
      return (
        <FormattedMessage
          id="localConversation.threadHandoff.step.stashSourceChanges"
          defaultMessage="Stashing uncommitted changes"
          description="Progress step shown while stashing source changes during thread handoff"
        />
      );
    case "checkout-local-branch":
      return (
        <FormattedMessage
          id="localConversation.threadHandoff.step.checkoutLocalBranch"
          defaultMessage="Checking out {branch} locally"
          description="Progress step shown while checking out a branch locally during thread handoff"
          values={{ branch: operation.localBranch ?? operation.sourceBranch }}
        />
      );
    case "stash-target-worktree-changes":
      return (
        <FormattedMessage
          id="localConversation.threadHandoff.step.stashTargetWorktreeChanges"
          defaultMessage="Stashing worktree changes"
          description="Progress step shown while stashing pre-existing worktree changes during thread handoff"
        />
      );
    case "checkout-worktree-branch":
      return (
        <FormattedMessage
          id="localConversation.threadHandoff.step.checkoutWorktreeBranch"
          defaultMessage="Checking out {branch} in worktree"
          description="Progress step shown while checking out a branch in the worktree during thread handoff"
          values={{
            branch: operation.worktreeBranch ?? operation.sourceBranch,
          }}
        />
      );
    case "detach-worktree-branch":
      return (
        <FormattedMessage
          id="localConversation.threadHandoff.step.detachWorktreeBranch"
          defaultMessage="Detaching branch from worktree"
          description="Progress step shown while detaching the worktree branch during handoff back to local"
        />
      );
    case "apply-changes-to-worktree":
      return (
        <FormattedMessage
          id="localConversation.threadHandoff.step.applyChangesToWorktree"
          defaultMessage="Applying uncommitted changes to worktree"
          description="Progress step shown while applying changes to the worktree during thread handoff"
        />
      );
    case "apply-changes-to-local":
      return (
        <FormattedMessage
          id="localConversation.threadHandoff.step.applyChangesToLocal"
          defaultMessage="Applying uncommitted changes locally"
          description="Progress step shown while applying changes locally during thread handoff"
        />
      );
    case "switching-thread":
      if (operation.direction === "to-worktree") {
        return (
          <FormattedMessage
            id="localConversation.threadHandoff.step.moveThreadToWorktree"
            defaultMessage="Moving thread to worktree"
            description="Progress step shown while moving the thread to a worktree after the git handoff"
          />
        );
      }
      return (
        <FormattedMessage
          id="localConversation.threadHandoff.step.moveThreadToLocal"
          defaultMessage="Moving thread to local"
          description="Progress step shown while moving the thread to local after the git handoff"
        />
      );
  }
}
