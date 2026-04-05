import type {
  CommandExecutionOutput,
  GitCwd,
  GitPushRequest,
  GitPushStatus,
} from "protocol";
import { createGitCwd } from "protocol";
import type { IntlShape } from "react-intl";

import { toast$ } from "@/components/toaster/toast-signal";
import type { AppScopeHandle } from "@/scopes/app-scope";

import {
  quickGitWorkflowMessages,
  showQuickWorkflowTerminalErrorToast,
} from "./quick-workflow-messages";

type PendingMutation<TVariables, TResult> = {
  isPending: boolean;
  mutateAsync: (variables: TVariables) => Promise<TResult>;
};

type GitCommandResult =
  | {
      status: "success";
    }
  | {
      status: "error";
      error: string;
      execOutput?: CommandExecutionOutput;
    };

type CommitMutation = PendingMutation<
  {
    cwd: GitCwd;
    message: string;
    includeUnstaged: boolean;
    commitAttribution?: string | null;
  },
  GitCommandResult
>;

type PushMutation = PendingMutation<GitPushRequest, GitCommandResult>;

type GeneratePullRequestMessageMutation = PendingMutation<
  {
    hostId: string;
    prompt: string;
    cwd: GitCwd;
    conversationId?: string | null;
    model: string;
  },
  {
    title: string | null;
    body: string | null;
  }
>;

type CreatePullRequestMutation = PendingMutation<
  {
    cwd: GitCwd;
    headBranch: string;
    baseBranch: string;
    isDraft: boolean;
    titleOverride: string | null;
    bodyOverride: string | null;
  },
  GitCommandResult
>;

export async function runQuickCommitStep({
  cwd,
  intl,
  scope,
  commitMutation,
  resolveCommitMessage,
  includeUnstaged,
  commitAttribution,
}: {
  cwd: GitCwd;
  intl: IntlShape;
  scope: AppScopeHandle;
  commitMutation: CommitMutation;
  resolveCommitMessage: () => Promise<string | null>;
  includeUnstaged: boolean;
  commitAttribution?: string | null;
}): Promise<boolean> {
  const toaster = scope.get(toast$);
  const message = (await resolveCommitMessage())?.trim() ?? "";
  if (message.length === 0) {
    toaster.danger(
      intl.formatMessage(quickGitWorkflowMessages.commitMessageEmpty),
    );
    return false;
  }

  try {
    const result = await commitMutation.mutateAsync({
      cwd: createGitCwd(cwd),
      message,
      includeUnstaged,
      commitAttribution,
    });
    if (result.status === "error") {
      showQuickWorkflowTerminalErrorToast({
        toaster,
        title: intl.formatMessage(quickGitWorkflowMessages.commitErrorTitle),
        message: result.execOutput != null ? null : result.error,
        execOutput: result.execOutput,
      });
      return false;
    }
  } catch {
    showQuickWorkflowTerminalErrorToast({
      toaster,
      title: intl.formatMessage(quickGitWorkflowMessages.commitErrorTitle),
      message: null,
    });
    return false;
  }

  return true;
}

export async function runQuickPushStep({
  cwd,
  intl,
  scope,
  pushMutation,
  pushStatus,
  forcePush = false,
}: {
  cwd: GitCwd;
  intl: IntlShape;
  scope: AppScopeHandle;
  pushMutation: PushMutation;
  pushStatus: GitPushStatus | undefined;
  forcePush?: boolean;
}): Promise<boolean> {
  const toaster = scope.get(toast$);
  const pushErrorTitle = intl.formatMessage(
    forcePush
      ? quickGitWorkflowMessages.forcePushErrorTitle
      : quickGitWorkflowMessages.pushErrorTitle,
  );
  if (pushStatus == null) {
    showQuickWorkflowTerminalErrorToast({
      toaster,
      title: pushErrorTitle,
      message: null,
    });
    return false;
  }

  const pushRequest: GitPushRequest = { cwd, force: forcePush };
  if (!pushStatus.upstreamRef && pushStatus.branch) {
    pushRequest.refspec = `HEAD:refs/heads/${pushStatus.branch}`;
    pushRequest.setUpstream = true;
  }

  try {
    const pushResult = await pushMutation.mutateAsync(pushRequest);
    if (pushResult.status === "error") {
      showQuickWorkflowTerminalErrorToast({
        toaster,
        title: pushErrorTitle,
        message:
          pushResult.execOutput != null
            ? null
            : intl.formatMessage(quickGitWorkflowMessages.pushErrorTitle),
        execOutput: pushResult.execOutput,
      });
      return false;
    }
  } catch {
    showQuickWorkflowTerminalErrorToast({
      toaster,
      title: pushErrorTitle,
      message: null,
    });
    return false;
  }

  return true;
}

export async function runQuickCreatePullRequestStep({
  cwd,
  hostId,
  intl,
  scope,
  generatePullRequestMessageMutation,
  createPullRequestMutation,
  resolvePullRequestPrompt,
  sourceConversationId,
  currentModel,
  pushStatus,
  createPullRequestAsDraft,
  onPullRequestCreated,
}: {
  cwd: GitCwd;
  hostId: string;
  intl: IntlShape;
  scope: AppScopeHandle;
  generatePullRequestMessageMutation: GeneratePullRequestMessageMutation;
  createPullRequestMutation: CreatePullRequestMutation;
  resolvePullRequestPrompt: () => Promise<string>;
  sourceConversationId?: string | null;
  currentModel: string;
  pushStatus: GitPushStatus | undefined;
  createPullRequestAsDraft: boolean;
  onPullRequestCreated?: (headBranch: string) => Promise<void>;
}): Promise<boolean> {
  const toaster = scope.get(toast$);
  if (pushStatus?.branch == null || pushStatus.defaultBranch == null) {
    showQuickWorkflowTerminalErrorToast({
      toaster,
      title: intl.formatMessage(
        quickGitWorkflowMessages.createPullRequestErrorTitle,
      ),
      message: null,
    });
    return false;
  }

  const trimmedPrompt = (await resolvePullRequestPrompt()).trim();
  if (trimmedPrompt.length === 0) {
    toaster.danger(
      intl.formatMessage(quickGitWorkflowMessages.pullRequestGenerationError),
    );
    return false;
  }

  let titleOverride: string | null = null;
  let bodyOverride: string | null = null;
  try {
    const generatedMessage =
      await generatePullRequestMessageMutation.mutateAsync({
        hostId,
        prompt: trimmedPrompt,
        cwd,
        conversationId: sourceConversationId,
        model: currentModel,
      });
    titleOverride = generatedMessage.title?.trim() || null;
    bodyOverride = generatedMessage.body?.trim() || null;
  } catch {
    toaster.danger(
      intl.formatMessage(quickGitWorkflowMessages.pullRequestGenerationError),
    );
    return false;
  }
  if (titleOverride == null || bodyOverride == null) {
    toaster.danger(
      intl.formatMessage(quickGitWorkflowMessages.pullRequestGenerationError),
    );
    return false;
  }

  try {
    const prResult = await createPullRequestMutation.mutateAsync({
      cwd,
      headBranch: pushStatus.branch,
      baseBranch: pushStatus.defaultBranch,
      isDraft: createPullRequestAsDraft,
      titleOverride,
      bodyOverride,
    });
    if (prResult.status !== "success") {
      showQuickWorkflowTerminalErrorToast({
        toaster,
        title: intl.formatMessage(
          quickGitWorkflowMessages.createPullRequestErrorTitle,
        ),
        message: prResult.execOutput != null ? null : prResult.error,
        execOutput: prResult.execOutput,
      });
      return false;
    }
    await onPullRequestCreated?.(pushStatus.branch);
  } catch {
    showQuickWorkflowTerminalErrorToast({
      toaster,
      title: intl.formatMessage(
        quickGitWorkflowMessages.createPullRequestErrorTitle,
      ),
      message: null,
    });
    return false;
  }

  return true;
}
