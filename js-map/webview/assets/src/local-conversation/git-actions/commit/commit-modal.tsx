import { useAtomValue } from "jotai";
import { useScope } from "maitai";
import type {
  CommandExecutionOutput,
  ConversationId,
  GitBranchChangesResult,
  GitCwd,
  GitPushError,
  GitPushRequest,
  HostConfig,
} from "protocol";
import { GlobalStateKey, createGitCwd } from "protocol";
import type { ReactElement } from "react";
import { useRef, useState } from "react";
import { useIntl, type IntlShape } from "react-intl";

import { Dialog } from "@/components/dialog";
import { TerminalToastCard } from "@/components/toaster/terminal-toast-card";
import { toast$ } from "@/components/toaster/toast-signal";
import { mergeUnifiedDiffs } from "@/diff/merge-unified-diffs";
import type { CodexDiffFile } from "@/diff/parse-diff";
import { parseDiff } from "@/diff/parse-diff";
import { useGitBranchChanges } from "@/git-rpc/use-git-branch-changes";
import { useGitMergedUncommittedChanges } from "@/git-rpc/use-git-merged-uncommitted-changes";
import { useGitPushStatus } from "@/git-rpc/use-git-push-status";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useGitStagedAndUnstagedChanges } from "@/git-rpc/use-git-staged-and-unstaged-changes";
import { useGlobalState } from "@/hooks/use-global-state";
import { useCommitMutation } from "@/local-conversation/git-actions/commit/use-commit-mutation";
import { useCreatePullRequestAction } from "@/local-conversation/git-actions/create-pull-request/use-create-pull-request-action";
import { useGeneratePullRequestMessageMutation } from "@/local-conversation/git-actions/create-pull-request/use-generate-pull-request-message";
import { usePushAction } from "@/local-conversation/git-actions/push/use-push-action";
import { useGitWorkflowMutationState } from "@/local-conversation/git-actions/shared/use-git-workflow-mutation-state";
import { dispatchCheckGitIndexForChangesEvent } from "@/review/check-git-index-for-changes";
import { AppScope } from "@/scopes/app-scope";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useTokenUsageInfo } from "@/utils/use-token-usage-info";
import { useFetchFromVSCode } from "@/vscode-api";

import { aIncludeUnstagedChanges } from "../atoms";
import { buildPullRequestMessagePrompt } from "../create-pull-request/pull-request-message-prompt";
import { useGhCreatePr } from "../create-pull-request/use-gh-create-pr";
import { useGitPushMutation } from "../push/use-git-push-mutation";
import { getGitActionSourceConversationId } from "../shared/get-git-action-source-conversation-id";
import type { GitActionModalVariant } from "../types";
import { CommitModalForm } from "./commit-modal-form";
import type {
  CommitDiffSummary,
  CommitFlowStep,
  CommitNextStep,
} from "./commit-types";
import { getUnifiedDiff, summarizeFiles } from "./commit-utils";

export function CommitModal({
  open,
  onOpenChange,
  conversationId,
  currentModel,
  cwd,
  hostConfig,
  onGenerateMessage,
  pullRequestInstructions,
  message,
  setMessage,
  commitAttribution,
  branchUpdateWarning = null,
  clearDraft,
  onBeforeCommit,
  onPullRequestCreated,
  onStatusChange,
  onRequestReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: ConversationId | null;
  currentModel: string;
  cwd: GitCwd;
  hostConfig: HostConfig;
  onGenerateMessage: () => Promise<string | null>;
  pullRequestInstructions: string | null;
  message: string;
  setMessage: (message: string) => void;
  commitAttribution?: string | null;
  branchUpdateWarning?: {
    checkedOutBranch: string;
    threadBranch: string;
  } | null;
  clearDraft: () => void;
  onBeforeCommit?: () => Promise<boolean>;
  onPullRequestCreated?: (headBranch: string) => Promise<void>;
  onStatusChange?: (status: "idle" | "loading" | "success" | "error") => void;
  onRequestReset: () => void;
}): ReactElement {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const { data: gitMetadata } = useGitStableMetadata(cwd, hostConfig);
  const { data: alwaysForcePush } = useGlobalState(
    GlobalStateKey.GIT_ALWAYS_FORCE_PUSH,
  );
  const {
    data: createPullRequestAsDraft,
    setData: setCreatePullRequestAsDraft,
  } = useGlobalState(GlobalStateKey.GIT_CREATE_PULL_REQUEST_AS_DRAFT);
  const [nextStep, setNextStep] = useState<CommitNextStep>("commit");
  const includeUnstaged = useAtomValue(aIncludeUnstagedChanges(cwd));
  const trimmedMessage = message.trim();
  const pullRequestMessageRef = useRef<{
    title: string;
    body: string;
  } | null>(null);
  const tokenUsageInfo = useTokenUsageInfo(conversationId ?? null);
  const pullRequestGenerationErrorMessage = intl.formatMessage({
    id: "localConversationPage.generatePullRequestMessageError",
    defaultMessage: "Failed to generate pull request title and body",
    description:
      "Error message shown when pull request generation fails in commit modal",
  });

  const {
    data: pushStatus,
    refetch: refetchPushStatus,
    isSuccess: pushStatusLoaded,
  } = useGitPushStatus(cwd, hostConfig);
  const { data: branchChanges } = useGitBranchChanges(cwd, hostConfig);
  const { data: ghStatus } = useFetchFromVSCode("gh-cli-status", {
    params: { hostId: hostConfig.id },
  });
  const {
    data: ghPrStatus,
    isLoading: isLoadingPRStatus,
    refetch: refetchGhPrStatus,
  } = useFetchFromVSCode("gh-pr-status", {
    params: {
      cwd,
      headBranch: pushStatus?.branch ?? "",
      hostId: hostConfig.id,
    },
    queryConfig: {
      enabled:
        pushStatusLoaded &&
        ghStatus &&
        ghStatus.isInstalled &&
        ghStatus.isAuthenticated &&
        !!pushStatus?.branch,
      staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
    },
  });
  const resolvedPullRequestStatus =
    ghPrStatus?.status === "success" ? ghPrStatus : null;
  const hasOpenPr = resolvedPullRequestStatus?.hasOpenPr ?? false;
  const pushMutation = useGitPushMutation({ cwd, hostConfig });
  const createPullRequestMutation = useGhCreatePr({
    cwd,
    hostId: hostConfig.id,
  });
  const pullRequestSourceConversationId = getGitActionSourceConversationId({
    conversationId: conversationId ?? null,
    tokenUsageInfo,
  });
  const generatePullRequestMessageMutation =
    useGeneratePullRequestMessageMutation({
      cwd,
      hostId: hostConfig.id,
      conversationId: pullRequestSourceConversationId,
    });
  const commitMutation = useCommitMutation({
    cwd,
    hostConfig,
    gitMetadata,
  });
  const { isPushMutating, hasGitWorkflowMutating } =
    useGitWorkflowMutationState({
      cwd,
      hostId: hostConfig.id,
      conversationId,
    });
  const pushAction = usePushAction({
    pushStatus,
    ignoreNothingToPush: true,
    isPending: isPushMutating,
  });
  const createPullRequestAction = useCreatePullRequestAction({
    ghStatus,
    pushStatus,
    isLoadingPRStatus,
    hasOpenPr,
    createPullRequestMutation,
    allowMissingUpstream: true,
    ignoreExistingPullRequest: true,
  });
  const commitAndPushTooltipText = pushAction.tooltipText;
  const canCommitAndPush =
    !pushAction.loading && commitAndPushTooltipText == null;
  const commitAndCreatePullRequestTooltipText =
    createPullRequestAction.tooltipText;
  const canCommitAndCreatePullRequest =
    !createPullRequestAction.disabled && !hasOpenPr;

  const { data: stagedAndUnstagedChanges, isFetching: isFetchingChanges } =
    useGitStagedAndUnstagedChanges(cwd, hostConfig);

  const {
    uncommittedDiff,
    uncommittedFiles,
    isFetchingTracked: isFetchingTrackedUncommittedChanges,
    isFetchingUntracked: isFetchingUntrackedChanges,
  } = useGitMergedUncommittedChanges(cwd, hostConfig, {
    enabled: includeUnstaged,
  });

  const stagedUnified = getUnifiedDiff(stagedAndUnstagedChanges?.stagedChanges);
  const unstagedUnified = getUnifiedDiff(
    stagedAndUnstagedChanges?.unstagedChanges,
  );
  const stagedFiles: Array<CodexDiffFile> = stagedUnified
    ? parseDiff(stagedUnified)
    : [];
  // Use whatever diffs are already available to avoid blocking the commit flow,
  // even if we might miss newly added files while the diff is still loading.
  const fallbackUnified = mergeUnifiedDiffs([stagedUnified, unstagedUnified]);
  const fallbackFiles = fallbackUnified ? parseDiff(fallbackUnified) : [];

  let selectionSummary: CommitDiffSummary | null = null;
  if (includeUnstaged) {
    const uncommittedSummary = summarizeFiles(
      uncommittedFiles ?? fallbackFiles,
    );
    if (uncommittedSummary.files.length > 0) {
      selectionSummary = uncommittedSummary;
    }
  } else {
    if (stagedFiles.length > 0) {
      selectionSummary = summarizeFiles(stagedFiles);
    }
  }

  const buildBranchPullRequestPrompt = (
    branchState: GitBranchChangesResult | null | undefined,
  ): string => {
    const branchUnified =
      branchState?.branchChanges.type === "success"
        ? branchState.branchChanges.unifiedDiff
        : null;
    const branchFiles = branchUnified ? parseDiff(branchUnified) : [];
    return buildPullRequestMessagePrompt({
      pullRequestInstructions,
      uncommittedDiff: branchUnified,
      filePaths: branchFiles.map((file) => file.metadata.name),
      baseBranch: branchState?.baseBranch ?? pushStatus?.defaultBranch ?? null,
      headBranch: branchState?.branch ?? pushStatus?.branch ?? null,
    });
  };
  const hasStagedChanges = stagedUnified?.trim().length ? true : false;

  let hasSomeUncommittedChangesFromDiff: boolean | null = null;
  if (includeUnstaged) {
    if (uncommittedDiff != null) {
      hasSomeUncommittedChangesFromDiff = uncommittedDiff.trim().length > 0;
    } else if (fallbackUnified != null) {
      hasSomeUncommittedChangesFromDiff = fallbackUnified.trim().length > 0;
    }
  } else if (stagedUnified != null) {
    hasSomeUncommittedChangesFromDiff = hasStagedChanges;
  }

  const hasSomeUncommittedChanges = hasSomeUncommittedChangesFromDiff ?? true;

  let commitTarget: string | null = null;
  if (pushStatus) {
    commitTarget = pushStatus.branch ?? pushStatus.upstreamRef ?? null;
  }

  const isFetchingSelectionChanges =
    isFetchingChanges ||
    (includeUnstaged && isFetchingTrackedUncommittedChanges);
  const isFetchingUntrackedSelectionChanges =
    includeUnstaged && isFetchingUntrackedChanges;
  const hasSelectedChanges = selectionSummary
    ? selectionSummary.files.length > 0
    : isFetchingSelectionChanges || isFetchingUntrackedSelectionChanges;

  const isCommitting = hasGitWorkflowMutating;

  const getCommitFlowSteps = (
    requestedNextStep: CommitNextStep,
  ): Array<CommitFlowStep> => {
    const steps: Array<CommitFlowStep> = [];
    if (requestedNextStep === "commit-and-push") {
      if (!canCommitAndPush) {
        steps.push("commit");
        return steps;
      }
      steps.push("commit", "push");
      return steps;
    }
    if (requestedNextStep === "commit-and-create-pr") {
      if (!canCommitAndCreatePullRequest) {
        steps.push("commit");
        return steps;
      }
      steps.push("commit", "push", "create-pr");
      return steps;
    }
    steps.push("commit");
    return steps;
  };

  const handleWorkflowError = (
    step: CommitFlowStep,
    nextErrorMessage: string,
    nextExecOutput?: CommandExecutionOutput,
  ): void => {
    scope.get(toast$).custom({
      duration: 7,
      content: ({ close }) => (
        <TerminalToastCard
          title={getCommitErrorToastMessage(step, intl)}
          message={
            nextExecOutput != null && step === "commit"
              ? null
              : nextErrorMessage
          }
          execOutput={nextExecOutput}
          onClose={close}
        />
      ),
    });
    resetState();
    onStatusChange?.("error");
    onRequestReset();
  };

  const resetState = (): void => {
    pullRequestMessageRef.current = null;
    setNextStep("commit");
  };

  const handleWorkflowSuccess = (
    steps: Array<CommitFlowStep>,
    { forcePush }: { forcePush: boolean },
  ): void => {
    const nextSuccessVariant = getSuccessVariantFromSteps(steps);
    scope
      .get(toast$)
      .success(
        getCommitSuccessToastMessage(
          nextSuccessVariant,
          { commitTarget, forcePush },
          intl,
        ),
      );
    resetState();
    onStatusChange?.("success");
    onRequestReset();
  };

  const handleCommitSuccess = (): void => {
    dispatchCheckGitIndexForChangesEvent();
    clearDraft();
  };

  const resolvePullRequestMessage = async (): Promise<{
    title: string;
    body: string;
  } | null> => {
    if (pullRequestMessageRef.current) {
      return pullRequestMessageRef.current;
    }
    const prompt = buildBranchPullRequestPrompt(branchChanges);
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0) {
      scope.get(toast$).danger(pullRequestGenerationErrorMessage);
      return null;
    }
    let response: { title: string | null; body: string | null };
    try {
      response = await generatePullRequestMessageMutation.mutateAsync({
        hostId: hostConfig.id,
        prompt: trimmedPrompt,
        cwd,
        conversationId: pullRequestSourceConversationId,
        model: currentModel,
      });
      const nextTitle = response.title?.trim() ?? "";
      const nextBody = response.body?.trim() ?? "";
      if (nextTitle.length === 0 || nextBody.length === 0) {
        scope.get(toast$).danger(pullRequestGenerationErrorMessage);
        return null;
      }
      const nextMessage = { title: nextTitle, body: nextBody };
      pullRequestMessageRef.current = nextMessage;
      return nextMessage;
    } catch {
      scope.get(toast$).danger(pullRequestGenerationErrorMessage);
      return null;
    }
  };

  const runCommitWorkflow = async (
    steps: Array<CommitFlowStep>,
    message: string,
  ): Promise<void> => {
    const didForcePush = alwaysForcePush;

    try {
      const result = await commitMutation.mutateAsync({
        cwd: createGitCwd(cwd),
        message,
        includeUnstaged,
        commitAttribution,
      });
      if (result.status === "error") {
        handleWorkflowError("commit", result.error, result.execOutput);
        return;
      }
    } catch {
      handleWorkflowError(
        "commit",
        intl.formatMessage({
          id: "review.commit.error",
          defaultMessage: "Failed to commit changes",
          description: "Toast shown when a commit fails",
        }),
      );
      return;
    }

    handleCommitSuccess();
    if (!steps.includes("push")) {
      handleWorkflowSuccess(steps, { forcePush: didForcePush });
      return;
    }

    const pushErrorMessage = didForcePush
      ? intl.formatMessage({
          id: "localConversationPage.forcePushError",
          defaultMessage: "Failed to force push",
          description: "Error message when force push fails",
        })
      : intl.formatMessage({
          id: "localConversationPage.pushError",
          defaultMessage: "Failed to push changes",
          description: "Error message when git push fails",
        });
    if (!cwd || !pushStatus) {
      handleWorkflowError("push", pushErrorMessage);
      return;
    }

    const request: GitPushRequest = { cwd, force: didForcePush };
    if (!pushStatus.upstreamRef && pushStatus.branch) {
      request.refspec = `HEAD:refs/heads/${pushStatus.branch}`;
      request.setUpstream = true;
    }
    try {
      const response = await pushMutation.mutateAsync(request);
      if (response.status === "error") {
        handleWorkflowError(
          "push",
          didForcePush
            ? pushErrorMessage
            : getPushErrorMessage(response.error, intl),
          response.execOutput,
        );
        return;
      }
      void refetchPushStatus();
      void refetchGhPrStatus();
    } catch {
      handleWorkflowError("push", pushErrorMessage);
      return;
    }

    if (!steps.includes("create-pr")) {
      handleWorkflowSuccess(steps, { forcePush: didForcePush });
      return;
    }

    const createPullRequestErrorMessage = intl.formatMessage({
      id: "localConversationPage.createPullRequestError",
      defaultMessage: "Failed to create pull request",
      description: "Error message when creating a pull request fails",
    });
    if (!cwd || !pushStatus.branch || !pushStatus.defaultBranch) {
      handleWorkflowError("create-pr", createPullRequestErrorMessage);
      return;
    }

    const resolvedPullRequestMessage = await resolvePullRequestMessage();
    if (!resolvedPullRequestMessage) {
      handleWorkflowError("create-pr", pullRequestGenerationErrorMessage);
      return;
    }

    try {
      const result = await createPullRequestMutation.mutateAsync({
        cwd,
        headBranch: pushStatus.branch,
        baseBranch: pushStatus.defaultBranch,
        isDraft: createPullRequestAsDraft,
        titleOverride: resolvedPullRequestMessage.title,
        bodyOverride: resolvedPullRequestMessage.body,
      });
      if (result.status !== "success") {
        handleWorkflowError(
          "create-pr",
          result.execOutput != null
            ? createPullRequestErrorMessage
            : result.error,
          result.execOutput,
        );
        return;
      }
      if (pushStatus.branch != null) {
        await onPullRequestCreated?.(pushStatus.branch);
      }
    } catch {
      handleWorkflowError("create-pr", createPullRequestErrorMessage);
      return;
    }

    handleWorkflowSuccess(steps, { forcePush: didForcePush });
  };

  const startWorkflow = async (
    requestedNextStep: CommitNextStep = nextStep,
  ): Promise<void> => {
    if (isCommitting) {
      return;
    }
    if (!hasSomeUncommittedChanges || !hasSelectedChanges) {
      return;
    }
    if (onBeforeCommit) {
      const canContinue = await onBeforeCommit();
      if (!canContinue) {
        return;
      }
    }
    const steps = getCommitFlowSteps(requestedNextStep);
    pullRequestMessageRef.current = null;
    onOpenChange(false);
    onStatusChange?.("loading");
    let nextMessage = trimmedMessage;
    if (nextMessage.length === 0) {
      const generatedMessage = await onGenerateMessage();
      if (!generatedMessage) {
        return;
      }
      nextMessage = generatedMessage.trim();
      if (nextMessage.length === 0) {
        scope.get(toast$).danger(
          intl.formatMessage({
            id: "review.commit.generate.emptyResponse",
            defaultMessage: "Couldn't generate a commit message.",
            description:
              "Toast shown when commit message generation returns no result",
          }),
        );
        return;
      }
    }
    await runCommitWorkflow(steps, nextMessage);
  };

  const handleCommit = (): void => {
    void startWorkflow();
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen && !isCommitting) {
      onRequestReset();
      return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} size="compact">
      <CommitModalForm
        cwd={cwd}
        isFetchingChanges={isFetchingSelectionChanges}
        isFetchingUntrackedChanges={isFetchingUntrackedSelectionChanges}
        isCommitting={isCommitting}
        target={commitTarget}
        selectionSummary={selectionSummary}
        message={message}
        setMessage={setMessage}
        commitDisabled={
          !hasSomeUncommittedChanges || !hasSelectedChanges || isCommitting
        }
        hasSomeUncomittedChanges={hasSomeUncommittedChanges}
        hasSelectedChanges={hasSelectedChanges}
        nextStep={nextStep}
        setNextStep={setNextStep}
        canCommitAndPush={canCommitAndPush}
        canCommitAndCreatePullRequest={canCommitAndCreatePullRequest}
        createPullRequestAsDraft={createPullRequestAsDraft}
        setCreatePullRequestAsDraft={setCreatePullRequestAsDraft}
        showCreatePullRequestHint={!!ghStatus && !ghStatus.isInstalled}
        commitAndPushTooltipText={commitAndPushTooltipText}
        commitAndCreatePullRequestTooltipText={
          commitAndCreatePullRequestTooltipText
        }
        branchUpdateWarning={branchUpdateWarning}
        onCommit={handleCommit}
      />
    </Dialog>
  );
}

function getSuccessVariantFromSteps(
  steps: Array<CommitFlowStep>,
): GitActionModalVariant {
  if (steps.includes("create-pr")) {
    return "commit-and-create-pr";
  }
  if (steps.includes("push")) {
    return "commit-and-push";
  }
  return "commit";
}

function getCommitSuccessToastMessage(
  variant: GitActionModalVariant,
  context: {
    commitTarget: string | null;
    forcePush: boolean;
  },
  intl: IntlShape,
): string {
  const branch =
    context.commitTarget ??
    intl.formatMessage({
      id: "localConversationPage.gitAction.unknownBranch",
      defaultMessage: "your branch",
      description: "Fallback branch name for git action success toasts",
    });

  if (variant === "commit-and-create-pr") {
    return intl.formatMessage(
      {
        id: "localConversationPage.commitAndCreatePrToast",
        defaultMessage: "Created PR for {branch}",
        description: "Toast shown when commit and create PR succeeds",
      },
      {
        branch,
      },
    );
  }
  if (variant === "commit-and-push") {
    return intl.formatMessage(
      {
        id: "localConversationPage.commitAndPushToast",
        defaultMessage: "Pushed {branch}",
        description: "Toast shown when commit and push succeeds",
      },
      {
        branch,
      },
    );
  }
  return intl.formatMessage(
    {
      id: "review.commit.successToast",
      defaultMessage: "Committed to {branch}",
      description: "Toast shown when a commit succeeds",
    },
    {
      branch,
    },
  );
}

function getCommitErrorToastMessage(
  step: CommitFlowStep,
  intl: IntlShape,
): string {
  if (step === "push") {
    return intl.formatMessage({
      id: "localConversationPage.pushError",
      defaultMessage: "Failed to push changes",
      description: "Error message when git push fails",
    });
  } else if (step === "create-pr") {
    return intl.formatMessage({
      id: "localConversationPage.createPullRequestError",
      defaultMessage: "Failed to create pull request",
      description: "Error message when creating a pull request fails",
    });
  } else {
    return intl.formatMessage({
      id: "review.commit.error",
      defaultMessage: "Failed to commit changes",
      description: "Toast shown when a commit fails",
    });
  }
}

function getPushErrorMessage(error: GitPushError, intl: IntlShape): string {
  if (error === "remote-updated") {
    return intl.formatMessage({
      id: "localConversationPage.pushRemoteChangedError",
      defaultMessage: "Push failed: remote has new commits",
      description: "Error message when git push fails due to remote updates",
    });
  } else if (error === "no-upstream") {
    return intl.formatMessage({
      id: "localConversationPage.pushNoUpstreamError",
      defaultMessage: "Push failed: no upstream configured",
      description:
        "Error message when git push fails with no upstream configured",
    });
  } else if (error === "auth") {
    return intl.formatMessage({
      id: "localConversationPage.pushAuthError",
      defaultMessage: "Push failed: authentication required",
      description:
        "Error message when git push fails due to missing authentication",
    });
  } else if (error === "remote-rejected") {
    return intl.formatMessage({
      id: "localConversationPage.pushRemoteRejectedError",
      defaultMessage: "Push rejected by remote",
      description: "Error message when git push is rejected by the remote",
    });
  } else {
    return intl.formatMessage({
      id: "localConversationPage.pushError",
      defaultMessage: "Failed to push changes",
      description: "Error message when git push fails",
    });
  }
}
