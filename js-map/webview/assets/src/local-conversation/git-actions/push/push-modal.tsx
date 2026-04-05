import type { UseMutationResult } from "@tanstack/react-query";
import { useScope } from "maitai";
import type {
  CommandExecutionOutput,
  ConversationId,
  GitPushError,
  GitPushRequest,
  GitPushResponse,
  GitPushStatus,
} from "protocol";
import { GlobalStateKey } from "protocol";
import type { ReactElement } from "react";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";

import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { TerminalToastCard } from "@/components/toaster/terminal-toast-card";
import { toast$ } from "@/components/toaster/toast-signal";
import { useGlobalState } from "@/hooks/use-global-state";
import { AppScope } from "@/scopes/app-scope";

import { PushModalInitial } from "./push-modal-initial";

export function PushModal({
  open,
  onOpenChange,
  cwd,
  pushStatus,
  pushMutation,
  refetchPushStatus,
  refetchGhPrStatus,
  conversationId: _conversationId,
  onRequestReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cwd: string | null;
  pushStatus: GitPushStatus | undefined;
  pushMutation: UseMutationResult<GitPushResponse, Error, GitPushRequest>;
  refetchPushStatus: () => void;
  refetchGhPrStatus: () => void;
  conversationId: ConversationId | null;
  onRequestReset: () => void;
}): ReactElement {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const { data: alwaysForcePush } = useGlobalState(
    GlobalStateKey.GIT_ALWAYS_FORCE_PUSH,
  );
  const pushErrorToastMessage = intl.formatMessage({
    id: "localConversationPage.pushError",
    defaultMessage: "Failed to push changes",
    description: "Error message when git push fails",
  });

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen && !pushMutation.isPending) {
      onRequestReset();
      return;
    }
    onOpenChange(nextOpen);
  };

  const showPushErrorToast = (
    errorMessage: string,
    execOutput?: CommandExecutionOutput,
  ): void => {
    scope.get(toast$).custom({
      duration: 7,
      content: ({ close }) => (
        <TerminalToastCard
          title={pushErrorToastMessage}
          message={errorMessage}
          execOutput={execOutput}
          onClose={close}
          actions={
            <>
              <Button
                color="ghost"
                className="h-7 border-transparent px-2.5 text-[12px] leading-4"
                onClick={close}
              >
                <FormattedMessage
                  id="localConversationPage.gitActionResult.cancel"
                  defaultMessage="Cancel"
                  description="Button label to dismiss a git action error toast"
                />
              </Button>
              <Button
                color="secondary"
                className="h-7 border-transparent px-2.5 text-[12px] leading-4"
                onClick={() => {
                  close();
                  runPush(true);
                }}
              >
                <FormattedMessage
                  id="localConversationPage.pushModal.forcePush"
                  defaultMessage="Force push"
                  description="Button label to retry a failed push as a force push from the error toast"
                />
              </Button>
            </>
          }
        />
      ),
    });
  };

  const runPush = (force: boolean): void => {
    if (!cwd || !pushStatus || pushMutation.isPending) {
      return;
    }

    const shouldForcePush = force || alwaysForcePush;
    onOpenChange(false);
    const request: GitPushRequest = { cwd };
    if (shouldForcePush) {
      request.force = true;
    }

    if (!pushStatus.upstreamRef && pushStatus.branch) {
      request.refspec = `HEAD:refs/heads/${pushStatus.branch}`;
      request.setUpstream = true;
    }

    pushMutation.mutate(request, {
      onSuccess: (response): void => {
        if (response.status === "error") {
          showPushErrorToast(
            shouldForcePush
              ? intl.formatMessage({
                  id: "localConversationPage.forcePushError",
                  defaultMessage: "Failed to force push",
                  description: "Error message when force push fails",
                })
              : getPushErrorMessage(response.error, intl),
            response.execOutput,
          );
          onRequestReset();
          return;
        }

        const target =
          pushStatus?.branch ??
          extractBranchFromRefspec(response.refspec) ??
          response.refspec ??
          response.remote ??
          null;
        refetchPushStatus();
        refetchGhPrStatus();
        scope.get(toast$).success(getPushSuccessMessage(target, intl));
        onRequestReset();
      },
      onError: (): void => {
        showPushErrorToast(
          shouldForcePush
            ? intl.formatMessage({
                id: "localConversationPage.forcePushError",
                defaultMessage: "Failed to force push",
                description: "Error message when force push fails",
              })
            : intl.formatMessage({
                id: "localConversationPage.pushError",
                defaultMessage: "Failed to push changes",
                description: "Error message when git push fails",
              }),
        );
        onRequestReset();
      },
    });
  };

  const handlePush = (): void => {
    runPush(false);
  };

  const isPending = pushMutation.isPending;
  const isDialogOpen = open && !isPending;

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange} size="compact">
      <PushModalInitial
        target={pushStatus?.branch ?? pushStatus?.upstreamRef ?? null}
        isLoading={isPending}
        canPush={!!cwd && !!pushStatus && !isPending}
        onPush={handlePush}
      />
    </Dialog>
  );
}

function getPushSuccessMessage(target: string | null, intl: IntlShape): string {
  return intl.formatMessage(
    {
      id: "localConversationPage.pushSuccessToast",
      defaultMessage: "Pushed {branch}",
      description: "Toast shown when a push succeeds",
    },
    {
      branch:
        target ??
        intl.formatMessage({
          id: "localConversationPage.gitAction.unknownBranch",
          defaultMessage: "your branch",
          description: "Fallback branch name for git action success toasts",
        }),
    },
  );
}

function extractBranchFromRefspec(refspec?: string | null): string | null {
  if (!refspec) {
    return null;
  }
  const parts = refspec.split(":");
  const target = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const match = target.match(/refs\/heads\/(.+)$/);
  return (match?.[1] ?? target)?.trim() || null;
}

function getPushErrorMessage(error: GitPushError, intl: IntlShape): string {
  switch (error) {
    case "remote-updated":
      return intl.formatMessage({
        id: "localConversationPage.pushRemoteChangedError",
        defaultMessage: "Push failed: remote has new commits",
        description: "Error message when git push fails due to remote updates",
      });
    case "no-upstream":
      return intl.formatMessage({
        id: "localConversationPage.pushNoUpstreamError",
        defaultMessage: "Push failed: no upstream configured",
        description:
          "Error message when git push fails with no upstream configured",
      });
    case "auth":
      return intl.formatMessage({
        id: "localConversationPage.pushAuthError",
        defaultMessage: "Push failed: authentication required",
        description:
          "Error message when git push fails due to missing authentication",
      });
    case "remote-rejected":
      return intl.formatMessage({
        id: "localConversationPage.pushRemoteRejectedError",
        defaultMessage: "Push rejected by remote",
        description: "Error message when git push is rejected by the remote",
      });
    case "unknown":
      return intl.formatMessage({
        id: "localConversationPage.pushError",
        defaultMessage: "Failed to push changes",
        description: "Error message when git push fails",
      });
  }
}
