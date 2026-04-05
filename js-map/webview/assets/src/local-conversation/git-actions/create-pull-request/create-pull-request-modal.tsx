import type { UseMutationResult } from "@tanstack/react-query";
import { useScope } from "maitai";
import { GlobalStateKey } from "protocol";
import type {
  CommandExecutionOutput,
  ConversationId,
  GlobalStateValueByKey,
  GhCreatePullRequestRequest,
  GhCreatePullRequestResponse,
  GitCwd,
  GitPushRequest,
  GitPushStatus,
  HostConfig,
} from "protocol";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";

import { Dialog } from "@/components/dialog";
import { TerminalToastCard } from "@/components/toaster/terminal-toast-card";
import { toast$ } from "@/components/toaster/toast-signal";
import { useGitOrigin } from "@/git-rpc/use-git-origin";
import { useGlobalState } from "@/hooks/use-global-state";
import { messageBus } from "@/message-bus";
import { AppScope } from "@/scopes/app-scope";
import { useTokenUsageInfo } from "@/utils/use-token-usage-info";

import type { CommitDiffSummary } from "../commit/commit-types";
import { useGitPushMutation } from "../push/use-git-push-mutation";
import { getGitActionSourceConversationId } from "../shared/get-git-action-source-conversation-id";
import { CreatePullRequestModalInitial } from "./create-pull-request-modal-initial";
import { buildCreatePullRequestUrl } from "./pull-request-url";
import { useGeneratePullRequestMessageMutation } from "./use-generate-pull-request-message";

export function CreatePullRequestModal({
  open,
  onOpenChange,
  conversationId,
  currentModel,
  cwd,
  hostConfig,
  pushStatus,
  targetHeadBranch,
  branchSummary,
  existingPullRequestUrl,
  hasOpenPr,
  createPullRequestMutation,
  pullRequestPrompt,
  allowMissingUpstream = false,
  onRequestReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: ConversationId | null;
  currentModel: string;
  cwd: GitCwd | null;
  hostConfig: HostConfig;
  pushStatus: GitPushStatus | undefined;
  targetHeadBranch: string | null | undefined;
  branchSummary: CommitDiffSummary | null;
  existingPullRequestUrl: string | null;
  hasOpenPr: boolean;
  createPullRequestMutation: UseMutationResult<
    GhCreatePullRequestResponse,
    Error,
    GhCreatePullRequestRequest
  >;
  pullRequestPrompt: string;
  allowMissingUpstream?: boolean;
  onRequestReset: () => void;
}): ReactElement {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const createPullRequestErrorMessage = intl.formatMessage({
    id: "localConversationPage.createPullRequestError",
    defaultMessage: "Failed to create pull request",
    description: "Error message when creating a pull request fails",
  });
  const pushMutation = useGitPushMutation({ cwd, hostConfig });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const {
    data: createPullRequestAsDraft,
    setData: setCreatePullRequestAsDraft,
  } = useGlobalState(GlobalStateKey.GIT_CREATE_PULL_REQUEST_AS_DRAFT);
  const originUrl = useGitOrigin(cwd ?? null, hostConfig.id);
  const tokenUsageInfo = useTokenUsageInfo(conversationId ?? null);
  const generatedMessageRef = useRef<{
    prompt: string;
    title: string;
    body: string;
  } | null>(null);
  const pullRequestSourceConversationId = getGitActionSourceConversationId({
    conversationId: conversationId ?? null,
    tokenUsageInfo,
  });
  const generatePullRequestMessageMutation =
    useGeneratePullRequestMessageMutation({
      cwd,
      hostId: hostConfig.id,
      conversationId: pullRequestSourceConversationId,
      onError: () => {
        scope.get(toast$).danger(
          intl.formatMessage({
            id: "localConversationPage.generatePullRequestMessageFailed",
            defaultMessage: "Failed to generate pull request title and body.",
            description:
              "Toast shown when pull request generation fails in the modal",
          }),
        );
      },
    });
  const isPending =
    createPullRequestMutation.isPending ||
    pushMutation.isPending ||
    generatePullRequestMessageMutation.isPending;
  const openRef = useRef(open);
  const pushErrorMessage = intl.formatMessage({
    id: "localConversationPage.pushError",
    defaultMessage: "Failed to push changes",
    description: "Error message when git push fails",
  });
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const resetState = (): void => {
    generatedMessageRef.current = null;
    setTitle("");
    setDescription("");
  };

  const handleClose = (): void => {
    openRef.current = false;
    if (!isPending) {
      onRequestReset();
      return;
    }
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    openRef.current = nextOpen;
    if (!nextOpen && !isPending) {
      onRequestReset();
      return;
    }
    onOpenChange(nextOpen);
  };

  const showCreatePullRequestErrorToast = (
    errorMessage: string,
    execOutput?: CommandExecutionOutput,
  ): void => {
    scope.get(toast$).custom({
      duration: 7,
      content: ({ close }) => (
        <TerminalToastCard
          title={createPullRequestErrorMessage}
          message={errorMessage}
          execOutput={execOutput}
          onClose={close}
        />
      ),
    });
  };

  const showPushErrorToast = (
    errorMessage: string,
    execOutput?: CommandExecutionOutput,
  ): void => {
    scope.get(toast$).custom({
      duration: 7,
      content: ({ close }) => (
        <TerminalToastCard
          title={pushErrorMessage}
          message={errorMessage}
          execOutput={execOutput}
          onClose={close}
        />
      ),
    });
  };

  const resolvePullRequestMessage = async (): Promise<{
    title: string;
    body: string;
  } | null> => {
    const trimmedPrompt = pullRequestPrompt.trim();
    const cachedMessage = getCachedTitleAndBody(trimmedPrompt);
    if (cachedMessage) {
      return cachedMessage;
    }
    if (trimmedPrompt.length === 0) {
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
        return null;
      }
      generatedMessageRef.current = {
        prompt: trimmedPrompt,
        title: nextTitle,
        body: nextBody,
      };
      return { title: nextTitle, body: nextBody };
    } catch {
      return null;
    }
  };

  const getCachedTitleAndBody = (
    prompt: string,
  ): { title: string; body: string } | null => {
    const cachedMessage = generatedMessageRef.current;
    if (!cachedMessage || cachedMessage.prompt !== prompt) {
      return null;
    }
    return {
      title: cachedMessage.title,
      body: cachedMessage.body,
    };
  };

  const resolvePullRequestOverrides = async (): Promise<{
    titleOverride: string | null;
    bodyOverride: string | null;
  }> => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (trimmedTitle.length > 0 && trimmedDescription.length > 0) {
      return {
        titleOverride: trimmedTitle,
        bodyOverride: trimmedDescription,
      };
    }

    const generatedMessage =
      trimmedTitle.length === 0 || trimmedDescription.length === 0
        ? await resolvePullRequestMessage()
        : null;

    return {
      titleOverride: trimmedTitle || (generatedMessage?.title ?? null),
      bodyOverride: trimmedDescription || (generatedMessage?.body ?? null),
    };
  };

  const runCreatePullRequest = async (): Promise<void> => {
    if (!cwd || !targetHeadBranch || !pushStatus?.defaultBranch) {
      return;
    }

    openRef.current = false;
    onOpenChange(false);
    const { titleOverride, bodyOverride } = await resolvePullRequestOverrides();
    createPullRequestMutation.mutate(
      {
        cwd,
        headBranch: targetHeadBranch,
        baseBranch: pushStatus.defaultBranch,
        isDraft: createPullRequestAsDraft,
        titleOverride,
        bodyOverride,
      },
      {
        onSuccess: (result): void => {
          if (result.status !== "success") {
            showCreatePullRequestErrorToast(
              result.execOutput != null
                ? createPullRequestErrorMessage
                : result.error,
              result.execOutput,
            );
            resetState();
            onRequestReset();
            return;
          }

          scope.get(toast$).success(
            intl.formatMessage(
              {
                id: "localConversationPage.createPullRequestSuccessToast",
                defaultMessage: "Created PR for {branch}",
                description:
                  "Toast shown when creating a pull request succeeds",
              },
              {
                branch:
                  targetHeadBranch ??
                  intl.formatMessage({
                    id: "localConversationPage.gitAction.unknownBranch",
                    defaultMessage: "your branch",
                    description:
                      "Fallback branch name for git action success toasts",
                  }),
              },
            ),
          );
          resetState();
          onRequestReset();
        },
        onError: (): void => {
          showCreatePullRequestErrorToast(createPullRequestErrorMessage);
          resetState();
          onRequestReset();
        },
      },
    );
  };

  const handleCreatePullRequest = (): void => {
    if (!cwd || !targetHeadBranch || !pushStatus?.defaultBranch) {
      return;
    }

    if (allowMissingUpstream && pushStatus) {
      const request: GitPushRequest = { cwd };
      if (!pushStatus.upstreamRef && pushStatus.branch) {
        request.refspec = `HEAD:refs/heads/${pushStatus.branch}`;
        request.setUpstream = true;
      }

      pushMutation.mutate(request, {
        onSuccess: (response): void => {
          if (response.status === "error") {
            showPushErrorToast(pushErrorMessage, response.execOutput);
            resetState();
            onRequestReset();
            return;
          }
          void runCreatePullRequest();
        },
        onError: (): void => {
          showPushErrorToast(pushErrorMessage);
          resetState();
          onRequestReset();
        },
      });
      return;
    }

    void runCreatePullRequest();
  };
  const handleOpenExistingPullRequest = (): void => {
    if (!existingPullRequestUrl) {
      return;
    }
    messageBus.dispatchMessage("open-in-browser", {
      url: existingPullRequestUrl,
    });
    handleClose();
  };
  const handleDraftChange = (
    nextValue: GlobalStateValueByKey[typeof GlobalStateKey.GIT_CREATE_PULL_REQUEST_AS_DRAFT],
  ): void => {
    void setCreatePullRequestAsDraft(nextValue).catch(() => {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "localConversationPage.createPrModal.draftSaveError",
          defaultMessage: "Failed to save draft pull request setting",
          description:
            "Toast shown when saving the draft pull request toggle from the create PR modal fails",
        }),
      );
    });
  };
  const createPullRequestPageUrl = buildCreatePullRequestUrl({
    originUrl,
    baseBranch: pushStatus?.defaultBranch ?? null,
    headBranch: targetHeadBranch ?? null,
  });
  const handleOpenCreatePullRequestPage = (): void => {
    if (!createPullRequestPageUrl) {
      return;
    }
    messageBus.dispatchMessage("open-in-browser", {
      url: createPullRequestPageUrl,
    });
  };
  const isDialogOpen = open && !isPending;

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange} size="compact">
      <CreatePullRequestModalInitial
        baseBranch={pushStatus?.defaultBranch ?? null}
        headBranch={targetHeadBranch ?? null}
        branchSummary={branchSummary}
        title={title}
        description={description}
        isDraft={createPullRequestAsDraft}
        existingPullRequestUrl={existingPullRequestUrl}
        hasOpenPr={hasOpenPr}
        isPending={isPending}
        hasCwd={cwd != null}
        canOpenCreatePullRequestPage={createPullRequestPageUrl != null}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onDraftChange={handleDraftChange}
        onCreate={handleCreatePullRequest}
        onOpenCreatePullRequestPage={handleOpenCreatePullRequestPage}
        onOpenPullRequest={handleOpenExistingPullRequest}
      />
    </Dialog>
  );
}
