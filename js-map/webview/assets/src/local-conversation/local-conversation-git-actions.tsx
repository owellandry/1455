import type * as AppServer from "app-server-types";
import { useAtomValue } from "jotai";
import { useScope } from "maitai";
import type { ConversationId, GitCwd } from "protocol";
import { GlobalStateKey } from "protocol";
import { useRef, useState, type ReactElement } from "react";
import { useIntl } from "react-intl";

import {
  useAppServerManagerForHost,
  useAppServerManagerForConversationIdOrDefault,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import { toast$ } from "@/components/toaster/toast-signal";
import { WithWindow } from "@/components/with-window";
import { mergeUnifiedDiffs } from "@/diff/merge-unified-diffs";
import { parseDiff } from "@/diff/parse-diff";
import { useGitQuery } from "@/git-rpc/git-api";
import { useGitBranchChanges } from "@/git-rpc/use-git-branch-changes";
import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { useGitMergedUncommittedChanges } from "@/git-rpc/use-git-merged-uncommitted-changes";
import { useGitPushStatus } from "@/git-rpc/use-git-push-status";
import { useGitStagedAndUnstagedChanges } from "@/git-rpc/use-git-staged-and-unstaged-changes";
import { useGitSyncedBranch } from "@/git-rpc/use-git-synced-branch";
import { useGitUntrackedChanges } from "@/git-rpc/use-git-untracked-changes";
import { useGlobalState } from "@/hooks/use-global-state";
import { useModelSettings } from "@/hooks/use-model-settings";
import BranchIcon from "@/icons/branch.svg";
import {
  getPullRequestButtonStatus,
  getPullRequestVisualState,
} from "@/pull-requests/pull-request-visual-state";
import { dispatchCheckGitIndexForChangesEvent } from "@/review/check-git-index-for-changes";
import { AppScope } from "@/scopes/app-scope";
import { useHostConfig } from "@/shared-objects/use-host-config";
import { useGate } from "@/statsig/statsig";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useSavedUserconfig } from "@/utils/use-saved-user-configuration";
import { useTokenUsageInfo } from "@/utils/use-token-usage-info";
import { useFetchFromVSCode } from "@/vscode-api";

import { getLocalConversationTitle } from "./get-local-conversation-title";
import { aIncludeUnstagedChanges } from "./git-actions/atoms";
import { buildCommitMessagePrompt } from "./git-actions/commit/commit-message-prompt";
import { CommitModal } from "./git-actions/commit/commit-modal";
import type {
  CommitDiffSummary,
  CommitNextStep,
} from "./git-actions/commit/commit-types";
import {
  getUnifiedDiff,
  summarizeFiles,
  summarizeUnifiedDiff,
} from "./git-actions/commit/commit-utils";
import { useCommitAction } from "./git-actions/commit/use-commit-action";
import { useGenerateCommitMessageMutation } from "./git-actions/commit/use-generate-commit-message";
import { useQuickCommitAndPushMutation } from "./git-actions/commit/use-quick-commit-and-push-mutation";
import { useQuickCommitMutation } from "./git-actions/commit/use-quick-commit-mutation";
import { useQuickCommitPushAndCreatePullRequestMutation } from "./git-actions/commit/use-quick-commit-push-and-create-pull-request-mutation";
import { CreatePullRequestModal } from "./git-actions/create-pull-request/create-pull-request-modal";
import { buildPullRequestMessagePrompt } from "./git-actions/create-pull-request/pull-request-message-prompt";
import { useCreatePullRequestAction } from "./git-actions/create-pull-request/use-create-pull-request-action";
import { useGhCreatePr } from "./git-actions/create-pull-request/use-gh-create-pr";
import { useQuickPushAndCreatePullRequestMutation } from "./git-actions/create-pull-request/use-quick-push-and-create-pull-request-mutation";
import {
  GitActionMenu,
  type ViewPullRequestAction,
} from "./git-actions/git-action-menu";
import type { PullRequestFixDisabledReason } from "./git-actions/pull-request/use-pull-request-fix-action";
import { PushModal } from "./git-actions/push/push-modal";
import { useGitPushMutation } from "./git-actions/push/use-git-push-mutation";
import { usePushAction } from "./git-actions/push/use-push-action";
import { getGitActionSourceConversationId } from "./git-actions/shared/get-git-action-source-conversation-id";
import { useGitWorkflowMutationState } from "./git-actions/shared/use-git-workflow-mutation-state";
import { WorktreeBranchSetupModal } from "./git-actions/sync/worktree-branch-setup-modal";
import type { GitAction, GitActionId } from "./git-actions/types";
import { MoveThreadButton } from "./move-thread/move-thread-button";

type ActivePanel = "worktree-branch-setup" | GitActionId | null;

const MAX_COMMIT_MESSAGE_CHANGED_LINES = 1000;

export function LocalConversationGitActions({
  conversationId = null,
  cwd,
  hostId,
  codexWorktree,
}: {
  conversationId?: ConversationId | null;
  cwd: GitCwd;
  hostId?: string;
  codexWorktree: boolean;
}): ReactElement | null {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const moveThreadToWorktreeEnabled = useGate(
    __statsigName("codex-app-worktree-workflow-v3"),
  );
  const conversationAppServerManager =
    useAppServerManagerForConversationIdOrDefault(conversationId);
  const effectiveHostId = hostId ?? conversationAppServerManager.getHostId();
  const appServerManager =
    useAppServerManagerForHost(effectiveHostId) ?? conversationAppServerManager;
  const hostConfig = useHostConfig(effectiveHostId);
  const conversationTitle = useLocalConversationSelector(
    conversationId,
    (conversation) => getLocalConversationTitle(conversation),
  );
  const tokenUsageInfo = useTokenUsageInfo(conversationId);
  const [isWorktreeBranchSetupOpen, setIsWorktreeBranchSetupOpen] =
    useState(false);
  const [commitOpen, setCommitOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [createPullRequestOpen, setCreatePullRequestOpen] = useState(false);
  const [draftMessageState, setDraftMessageState] = useState<string>("");
  const includeUnstagedChanges = useAtomValue(aIncludeUnstagedChanges(cwd));
  const draftMessageRef = useRef(draftMessageState);
  function setDraftMessage(nextMessage: string): void {
    draftMessageRef.current = nextMessage;
    setDraftMessageState(nextMessage);
  }

  const { data: commitInstructions } = useGlobalState(
    GlobalStateKey.GIT_COMMIT_INSTRUCTIONS,
  );
  const { data: pullRequestInstructions } = useGlobalState(
    GlobalStateKey.GIT_PR_INSTRUCTIONS,
  );
  const { data: savedUserConfig } = useSavedUserconfig(appServerManager, cwd);
  const pullRequestStatusSectionEnabled = useGate(
    __statsigName("codex-app-pr-compound-button"),
  );
  const commitAttribution =
    parseCommitAttributionForCommitModal(savedUserConfig);

  const {
    data: pushStatus,
    refetch: refetchPushStatus,
    isSuccess: pushStatusLoaded,
  } = useGitPushStatus(cwd, hostConfig);
  const currentBranchQuery = useGitCurrentBranch(cwd, hostConfig, {
    enabled: codexWorktree,
  });
  const worktreeCurrentBranch = currentBranchQuery.data;
  const storedThreadBranch = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.gitInfo?.branch,
  );
  const storedThreadBranchName = storedThreadBranch?.trim() ?? "";
  const { data: branchChanges, refetch: refetchBranchChanges } =
    useGitBranchChanges(cwd, hostConfig, {
      enabled: createPullRequestOpen,
    });
  const { data: syncedBranchInfo, isLoading: isSyncedBranchLoading } =
    useGitSyncedBranch(codexWorktree ? cwd : null, hostConfig);
  const { data: stagedAndUnstagedChanges } = useGitStagedAndUnstagedChanges(
    cwd,
    hostConfig,
  );
  const { data: stagedReviewSummary } = useGitQuery(
    cwd,
    hostConfig,
    "review-summary",
    {
      cwd,
      includeUntrackedFiles: false,
      source: "staged",
    },
    {
      staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
    },
  );
  const { data: unstagedReviewSummary } = useGitQuery(
    cwd,
    hostConfig,
    "review-summary",
    {
      cwd,
      includeUntrackedFiles: false,
      source: "unstaged",
    },
    {
      enabled: includeUnstagedChanges,
      staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
    },
  );
  const { data: untrackedChanges } = useGitUntrackedChanges(cwd, hostConfig);
  const stagedUnified = getUnifiedDiff(stagedAndUnstagedChanges?.stagedChanges);
  const unstagedUnified = getUnifiedDiff(
    stagedAndUnstagedChanges?.unstagedChanges,
  );
  const untrackedUnified = getUnifiedDiff(untrackedChanges?.untrackedChanges);
  const { uncommittedDiff } = useGitMergedUncommittedChanges(cwd, hostConfig, {
    includeFiles: false,
  });
  const hasSomeUncommittedChanges =
    (stagedUnified?.trim().length ? true : false) ||
    (unstagedUnified?.trim().length ? true : false) ||
    (untrackedUnified?.trim().length ? true : false);

  const { data: ghStatus } = useFetchFromVSCode("gh-cli-status", {
    params: { hostId: hostConfig.id },
  });
  const shouldFetchPullRequestStatus =
    ghStatus &&
    ghStatus.isInstalled &&
    ghStatus.isAuthenticated &&
    storedThreadBranchName.length > 0;
  const {
    data: ghPrStatus,
    isLoading: isLoadingPRStatus,
    refetch: refetchGhPrStatus,
  } = useFetchFromVSCode("gh-pr-status", {
    params: {
      cwd,
      headBranch: storedThreadBranchName,
      hostId: hostConfig.id,
    },
    queryConfig: {
      enabled: shouldFetchPullRequestStatus,
      staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
    },
  });
  const resolvedPullRequestStatus =
    ghPrStatus?.status === "success" ? ghPrStatus : null;
  const existingPullRequestUrl = resolvedPullRequestStatus?.url ?? null;
  const existingPullRequestNumber = resolvedPullRequestStatus?.number ?? null;
  const hasOpenPr = resolvedPullRequestStatus?.hasOpenPr ?? false;
  const pullRequestButtonStatus = getPullRequestButtonStatus({
    hasOpenPr,
    isDraft: resolvedPullRequestStatus?.isDraft ?? false,
    url: existingPullRequestUrl,
  });
  const viewPullRequestAction: ViewPullRequestAction | null =
    pullRequestButtonStatus != null
      ? {
          canMerge: resolvedPullRequestStatus?.canMerge ?? false,
          ciStatus: resolvedPullRequestStatus?.ciStatus ?? "none",
          checks: resolvedPullRequestStatus?.checks ?? [],
          commentAttachments:
            resolvedPullRequestStatus?.commentAttachments ?? [],
          isLoadingUrl: existingPullRequestUrl == null,
          number: existingPullRequestNumber,
          repo: resolvedPullRequestStatus?.repo ?? null,
          reviewers: resolvedPullRequestStatus?.reviewers ?? {
            approved: [],
            commentCounts: [],
            commented: [],
            changesRequested: [],
            requested: [],
            unresolvedCommentCount: 0,
          },
          reviewStatus: resolvedPullRequestStatus?.reviewStatus ?? "none",
          pullRequestState: getPullRequestVisualState({
            canMerge: resolvedPullRequestStatus?.canMerge ?? false,
            ciStatus: resolvedPullRequestStatus?.ciStatus ?? "none",
            status: pullRequestButtonStatus,
          }),
          status: pullRequestButtonStatus,
          url: existingPullRequestUrl,
        }
      : null;
  const pushMutation = useGitPushMutation({ cwd, hostConfig });
  const { modelSettings } = useModelSettings(conversationId);
  const currentModel = modelSettings.model;
  // Use whatever diffs are already available to avoid delaying commit message
  // generation, even if we might miss newly added files while diffs load.
  const fallbackUnified = mergeUnifiedDiffs([stagedUnified, unstagedUnified]);
  const promptUnified = includeUnstagedChanges
    ? (uncommittedDiff ?? fallbackUnified)
    : stagedUnified;
  const branchUnified =
    branchChanges?.branchChanges.type === "success"
      ? branchChanges.branchChanges.unifiedDiff
      : null;
  const branchFiles = branchUnified ? parseDiff(branchUnified) : [];
  const branchSummary =
    branchFiles.length > 0 ? summarizeFiles(branchFiles) : null;
  const promptNumstatSummary = includeUnstagedChanges
    ? mergeNumstatSummaries([
        stagedReviewSummary?.type === "success"
          ? stagedReviewSummary.files
          : [],
        unstagedReviewSummary?.type === "success"
          ? unstagedReviewSummary.files
          : [],
      ])
    : stagedReviewSummary?.type === "success"
      ? summarizeNumstatFiles(stagedReviewSummary.files)
      : null;
  const untrackedUnifiedSummary = includeUnstagedChanges
    ? summarizeUnifiedDiff(untrackedUnified)
    : null;
  const promptLinesAdded =
    (promptNumstatSummary?.totalAdditions ?? 0) +
    (untrackedUnifiedSummary?.linesAdded ?? 0);
  const promptLinesRemoved =
    (promptNumstatSummary?.totalDeletions ?? 0) +
    (untrackedUnifiedSummary?.linesRemoved ?? 0);
  const oversizedDiffSummary =
    promptLinesAdded + promptLinesRemoved > MAX_COMMIT_MESSAGE_CHANGED_LINES
      ? {
          filesChanged:
            (promptNumstatSummary?.files.length ?? 0) +
            (untrackedUnifiedSummary?.filesChanged ?? 0),
          linesAdded: promptLinesAdded,
          linesRemoved: promptLinesRemoved,
        }
      : null;
  const generateCommitMessageMutation = useGenerateCommitMessageMutation({
    cwd,
    hostId: hostConfig.id,
    conversationId,
    onError: (error) => {
      scope.get(toast$).danger(
        intl.formatMessage(
          {
            id: "review.commit.generate.failed",
            defaultMessage: "Failed to generate commit message: {error}",
            description: "Toast shown when commit message generation fails",
          },
          { error: error instanceof Error ? error.message : String(error) },
        ),
      );
    },
  });
  const createPullRequestMutation = useGhCreatePr({
    cwd,
    hostId: hostConfig.id,
    onSuccess: (_result, variables) => {
      void handlePullRequestCreated(variables.headBranch);
    },
  });
  const {
    isCommitMutating,
    isGeneratingCommitMessageMutating,
    isPushMutating,
    isCreatePullRequestFlowMutating,
    pendingQuickPrimaryMode,
  } = useGitWorkflowMutationState({
    cwd,
    hostId: hostConfig.id,
    conversationId,
  });

  const commitAction = useCommitAction({
    cwd,
    hostConfig,
    hasSomeUncommittedChanges,
    isPending: isCommitMutating || isGeneratingCommitMessageMutating,
  });
  const isGeneratingCommitMessage =
    generateCommitMessageMutation.isPending ||
    isGeneratingCommitMessageMutating;
  const commitMessageConversationId = getGitActionSourceConversationId({
    conversationId,
    tokenUsageInfo,
  });
  const handleGenerateCommitMessage = async (): Promise<string | null> => {
    const commitMessagePrompt = buildCommitMessagePrompt({
      commitInstructions: commitInstructions ?? null,
      draftMessage: draftMessageRef.current,
      oversizedDiffSummary,
      uncommittedDiff: oversizedDiffSummary == null ? promptUnified : null,
    });
    if (isGeneratingCommitMessage) {
      return null;
    }
    const startedWithMessage = draftMessageRef.current;
    let response: { message?: string | null };
    try {
      response = await generateCommitMessageMutation.mutateAsync({
        hostId: hostConfig.id,
        prompt: commitMessagePrompt,
        cwd,
        conversationId: commitMessageConversationId,
        model: currentModel,
      });
    } catch {
      return null;
    }
    const nextMessage = response.message?.trim() ?? "";
    if (nextMessage.length === 0) {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "review.commit.generate.emptyResponse",
          defaultMessage: "Couldn't generate a commit message.",
          description:
            "Toast shown when commit message generation returns no result",
        }),
      );
      return null;
    }
    const currentMessage = draftMessageRef.current;
    const shouldReplace =
      currentMessage.trim().length === 0 ||
      currentMessage === startedWithMessage;
    if (shouldReplace) {
      setDraftMessage(nextMessage);
    }
    return nextMessage;
  };
  const pushAction = usePushAction({
    pushStatus,
    isPending: isPushMutating,
  });
  const quickCommitAndPushAction = usePushAction({
    pushStatus,
    isPending: isPushMutating,
    ignoreNothingToPush: true,
  });
  const createPullRequestAction = useCreatePullRequestAction({
    ghStatus,
    pushStatus,
    isLoadingPRStatus,
    hasOpenPr,
    createPullRequestMutation,
    isPending: isCreatePullRequestFlowMutating,
    ignoreExistingPullRequest: true,
  });
  const quickCreatePullRequestAction = useCreatePullRequestAction({
    ghStatus,
    pushStatus,
    isLoadingPRStatus,
    hasOpenPr,
    createPullRequestMutation,
    isPending: isCreatePullRequestFlowMutating,
    allowMissingUpstream: true,
    ignoreExistingPullRequest: true,
  });

  const currentBranch = worktreeCurrentBranch ?? pushStatus?.branch ?? null;
  const currentBranchName = currentBranch?.trim() ?? "";
  const hasThreadBranchMismatch =
    storedThreadBranchName.length > 0 &&
    currentBranchName.length > 0 &&
    storedThreadBranchName !== currentBranchName;
  const isCurrentBranchLoading = codexWorktree && currentBranchQuery.isLoading;

  const commitActive =
    commitOpen || isCommitMutating || isGeneratingCommitMessageMutating;
  const pushActive = pushOpen || isPushMutating;
  const createPullRequestActive =
    createPullRequestOpen || isCreatePullRequestFlowMutating;
  const pullRequestPrompt = createPullRequestActive
    ? buildPullRequestMessagePrompt({
        pullRequestInstructions: pullRequestInstructions ?? null,
        uncommittedDiff: branchUnified,
        filePaths: branchFiles.map((file) => file.metadata.name),
        baseBranch:
          branchChanges?.baseBranch ?? pushStatus?.defaultBranch ?? null,
        headBranch: branchChanges?.branch ?? pushStatus?.branch ?? null,
      })
    : "";
  const resolveQuickPullRequestPrompt = async (): Promise<string> => {
    if (pullRequestPrompt.trim().length > 0) {
      return pullRequestPrompt;
    }

    const refreshedBranchChanges = (await refetchBranchChanges()).data;
    const refreshedBranchUnified =
      refreshedBranchChanges?.branchChanges.type === "success"
        ? refreshedBranchChanges.branchChanges.unifiedDiff
        : null;
    const refreshedBranchFiles = refreshedBranchUnified
      ? parseDiff(refreshedBranchUnified)
      : [];
    return buildPullRequestMessagePrompt({
      pullRequestInstructions: pullRequestInstructions ?? null,
      uncommittedDiff: refreshedBranchUnified,
      filePaths: refreshedBranchFiles.map((file) => file.metadata.name),
      baseBranch:
        refreshedBranchChanges?.baseBranch ?? pushStatus?.defaultBranch ?? null,
      headBranch: refreshedBranchChanges?.branch ?? pushStatus?.branch ?? null,
    });
  };
  const isPushStatusLoading = !pushStatusLoaded;
  const shouldShowLoadingButton =
    !isWorktreeBranchSetupOpen &&
    !commitActive &&
    !pushActive &&
    !createPullRequestActive &&
    (isPushStatusLoading || isCurrentBranchLoading || isSyncedBranchLoading);

  const latestTurn = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.turns[conversation.turns.length - 1],
  );
  const isTurnInProgress = latestTurn?.status === "inProgress";
  const pullRequestFixDisabledReason: PullRequestFixDisabledReason | null =
    conversationId == null
      ? "missing-conversation"
      : hasThreadBranchMismatch
        ? "branch-mismatch"
        : null;
  const openExclusivePanel = (panel: ActivePanel): void => {
    setIsWorktreeBranchSetupOpen(panel === "worktree-branch-setup");
    setCommitOpen(panel === "commit");
    setPushOpen(panel === "push");
    setCreatePullRequestOpen(panel === "create-pr");
  };

  const resetGitActionModal = (): void => {
    openExclusivePanel(null);
  };

  async function handleCommitThreadBranchUpdate(): Promise<boolean> {
    if (
      !hasThreadBranchMismatch ||
      conversationId == null ||
      currentBranchName.length === 0
    ) {
      return true;
    }

    const didUpdate = await appServerManager.updateThreadGitBranch(
      conversationId,
      currentBranchName,
    );
    if (didUpdate) {
      return true;
    }

    scope.get(toast$).danger(
      intl.formatMessage({
        id: "localConversation.commit.threadBranchUpdateFailed",
        defaultMessage: "Failed to update the thread branch.",
        description:
          "Toast shown when updating the thread branch fails before commit",
      }),
    );
    return false;
  }

  async function handlePullRequestCreated(headBranch: string): Promise<void> {
    if (conversationId == null || headBranch.trim().length === 0) {
      return;
    }

    await appServerManager.updateThreadGitBranch(conversationId, headBranch);
  }

  const quickCommitMutation = useQuickCommitMutation({
    cwd,
    hostConfig,
    resolveCommitMessage: handleGenerateCommitMessage,
    canCommit: hasSomeUncommittedChanges,
    includeUnstaged: includeUnstagedChanges,
    commitAttribution,
    onBeforeCommit: handleCommitThreadBranchUpdate,
    onCommitSuccess: () => {
      dispatchCheckGitIndexForChangesEvent();
      setDraftMessage("");
    },
  });
  const quickCommitAndPushMutation = useQuickCommitAndPushMutation({
    cwd,
    hostConfig,
    resolveCommitMessage: handleGenerateCommitMessage,
    canCommit: hasSomeUncommittedChanges,
    includeUnstaged: includeUnstagedChanges,
    commitAttribution,
    onBeforeCommit: handleCommitThreadBranchUpdate,
    onCommitSuccess: () => {
      dispatchCheckGitIndexForChangesEvent();
      setDraftMessage("");
    },
    onPushSuccess: () => {
      void refetchPushStatus();
      void refetchGhPrStatus();
    },
  });
  const quickCommitPushAndCreatePullRequestMutation =
    useQuickCommitPushAndCreatePullRequestMutation({
      cwd,
      hostConfig,
      resolveCommitMessage: handleGenerateCommitMessage,
      canCommit: hasSomeUncommittedChanges,
      includeUnstaged: includeUnstagedChanges,
      commitAttribution,
      resolvePullRequestPrompt: resolveQuickPullRequestPrompt,
      conversationId,
      onBeforeCommit: handleCommitThreadBranchUpdate,
      onCommitSuccess: () => {
        dispatchCheckGitIndexForChangesEvent();
        setDraftMessage("");
      },
      onPushSuccess: () => {
        void refetchPushStatus();
        void refetchGhPrStatus();
      },
      onPullRequestCreated: handlePullRequestCreated,
    });
  const quickPushAndCreatePullRequestMutation =
    useQuickPushAndCreatePullRequestMutation({
      cwd,
      hostConfig,
      resolvePullRequestPrompt: resolveQuickPullRequestPrompt,
      conversationId,
      onPullRequestCreated: handlePullRequestCreated,
    });

  const startQuickCommitFlow = (flow: CommitNextStep): void => {
    openExclusivePanel(null);
    if (flow === "commit-and-push") {
      void quickCommitAndPushMutation.mutateAsync();
      return;
    }
    if (flow === "commit-and-create-pr") {
      void quickCommitPushAndCreatePullRequestMutation.mutateAsync();
      return;
    }
    void quickCommitMutation.mutateAsync();
  };

  const startQuickPushAndCreatePullRequest = (): void => {
    openExclusivePanel(null);
    void quickPushAndCreatePullRequestMutation.mutateAsync();
  };

  const createBranchAction: GitAction = {
    id: "create-branch",
    label: intl.formatMessage({
      id: "localConversation.gitActions.createBranch",
      defaultMessage: "Create branch",
      description:
        "Label for the create branch action in the git actions dropdown",
    }),
    icon: BranchIcon,
    disabled: false,
    loading: false,
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <WithWindow electron>
        {moveThreadToWorktreeEnabled && (
          <MoveThreadButton
            conversationId={conversationId}
            conversationTitle={conversationTitle}
            currentBranch={currentBranch}
            cwd={cwd}
            disabled={isTurnInProgress}
          />
        )}
      </WithWindow>

      {!shouldShowLoadingButton ? (
        <GitActionMenu
          baseBranch={
            pushStatus?.defaultBranch ?? syncedBranchInfo?.base ?? null
          }
          commitAction={commitAction}
          canQuickCommitAndPush={
            !commitAction.disabled && !quickCommitAndPushAction.disabled
          }
          canQuickCommitAndCreatePullRequest={
            !commitAction.disabled && !quickCreatePullRequestAction.disabled
          }
          canQuickPushAndCreatePullRequest={
            !pushAction.disabled && !quickCreatePullRequestAction.disabled
          }
          canQuickCreateBranchAndCommit={currentBranch == null}
          conversationId={conversationId}
          createBranchAction={createBranchAction}
          cwd={cwd}
          hostId={hostConfig.id}
          pendingQuickPrimaryMode={pendingQuickPrimaryMode}
          createPullRequestAction={
            viewPullRequestAction == null
              ? createPullRequestAction
              : {
                  ...createPullRequestAction,
                  hidden: true,
                }
          }
          fixDisabledReason={pullRequestFixDisabledReason}
          headBranch={storedThreadBranchName || null}
          hasCurrentBranch={currentBranch != null}
          pullRequestStatusSectionEnabled={pullRequestStatusSectionEnabled}
          pushAction={pushAction}
          viewPullRequestAction={viewPullRequestAction}
          onOpenCreateBranch={() => openExclusivePanel("worktree-branch-setup")}
          onOpenActionModal={openExclusivePanel}
          onQuickCreateBranchAndCommit={() => {
            openExclusivePanel("worktree-branch-setup");
          }}
          onQuickCommitFlow={startQuickCommitFlow}
          onQuickPushAndCreatePullRequest={startQuickPushAndCreatePullRequest}
        />
      ) : null}
      {isWorktreeBranchSetupOpen ? (
        <WorktreeBranchSetupModal
          conversationId={conversationId ?? undefined}
          cwd={cwd}
          hostConfig={hostConfig}
          open={isWorktreeBranchSetupOpen}
          onOpenChange={setIsWorktreeBranchSetupOpen}
          onRequestOpenCommit={() => openExclusivePanel("commit")}
        />
      ) : null}
      {commitActive && (
        <CommitModal
          open={commitOpen}
          onOpenChange={setCommitOpen}
          conversationId={conversationId}
          currentModel={currentModel}
          cwd={cwd}
          hostConfig={hostConfig}
          onGenerateMessage={handleGenerateCommitMessage}
          pullRequestInstructions={pullRequestInstructions ?? null}
          message={draftMessageState}
          setMessage={setDraftMessage}
          commitAttribution={commitAttribution}
          branchUpdateWarning={
            hasThreadBranchMismatch
              ? {
                  checkedOutBranch: currentBranchName,
                  threadBranch: storedThreadBranchName,
                }
              : null
          }
          clearDraft={() => setDraftMessage("")}
          onBeforeCommit={handleCommitThreadBranchUpdate}
          onPullRequestCreated={handlePullRequestCreated}
          onRequestReset={resetGitActionModal}
        />
      )}
      {pushActive && (
        <PushModal
          open={pushOpen}
          onOpenChange={setPushOpen}
          conversationId={conversationId}
          cwd={cwd}
          pushStatus={pushStatus}
          pushMutation={pushMutation}
          refetchPushStatus={refetchPushStatus}
          refetchGhPrStatus={refetchGhPrStatus}
          onRequestReset={resetGitActionModal}
        />
      )}
      {createPullRequestActive && (
        <CreatePullRequestModal
          open={createPullRequestOpen}
          onOpenChange={setCreatePullRequestOpen}
          conversationId={conversationId}
          currentModel={currentModel}
          cwd={cwd}
          hostConfig={hostConfig}
          pushStatus={pushStatus}
          targetHeadBranch={pushStatus?.branch ?? null}
          branchSummary={branchSummary}
          existingPullRequestUrl={existingPullRequestUrl}
          hasOpenPr={hasOpenPr}
          createPullRequestMutation={createPullRequestMutation}
          pullRequestPrompt={pullRequestPrompt}
          allowMissingUpstream={false}
          onRequestReset={resetGitActionModal}
        />
      )}
    </div>
  );
}

function mergeNumstatSummaries(
  fileGroups: Array<
    Array<{ path: string; additions: number | null; deletions: number | null }>
  >,
): CommitDiffSummary | null {
  const files = fileGroups.flat();
  if (files.length === 0) {
    return null;
  }

  return summarizeNumstatFiles(files);
}

function summarizeNumstatFiles(
  files: Array<{
    path: string;
    additions: number | null;
    deletions: number | null;
  }>,
): CommitDiffSummary {
  const map = new Map<
    string,
    { path: string; additions: number; deletions: number }
  >();
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const file of files) {
    const additions = file.additions ?? 0;
    const deletions = file.deletions ?? 0;
    totalAdditions += additions;
    totalDeletions += deletions;
    const existing = map.get(file.path);
    if (existing != null) {
      existing.additions += additions;
      existing.deletions += deletions;
      continue;
    }
    map.set(file.path, {
      path: file.path,
      additions,
      deletions,
    });
  }

  return {
    files: Array.from(map.values()).sort((a, b) =>
      a.path.localeCompare(b.path),
    ),
    totalAdditions,
    totalDeletions,
  };
}

function parseCommitAttributionForCommitModal(
  config: AppServer.v2.Config | null | undefined,
): string | null | undefined {
  if (!isCodexGitCommitFeatureEnabled(config)) {
    return null;
  }
  return parseCommitAttributionFromConfig(config);
}

function isCodexGitCommitFeatureEnabled(
  config: AppServer.v2.Config | null | undefined,
): boolean {
  const flatFlag = config?.["features.codex_git_commit"];
  if (typeof flatFlag === "boolean") {
    return flatFlag;
  }

  const features = config?.features;
  if (
    typeof features !== "object" ||
    features == null ||
    Array.isArray(features)
  ) {
    return false;
  }

  const nestedFlag = features.codex_git_commit;
  return typeof nestedFlag === "boolean" ? nestedFlag : false;
}

function parseCommitAttributionFromConfig(
  config: AppServer.v2.Config | null | undefined,
): string | null | undefined {
  const value = config?.commit_attribution;
  if (value == null) {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
