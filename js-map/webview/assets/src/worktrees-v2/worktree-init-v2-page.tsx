import { useMutation } from "@tanstack/react-query";
import { useScope } from "maitai";
import {
  buildLocalConversationRoute,
  maybeErrorToString,
  type ConversationId,
} from "protocol";
import { useEffect, useEffectEvent, useRef } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Navigate, useNavigate, useParams } from "react-router";

import { useAppServerRegistry } from "@/app-server/app-server-manager-hooks";
import { AnsiBlock } from "@/components/ansi-block";
import { Button } from "@/components/button";
import { toast$ } from "@/components/toaster/toast-signal";
import { UserMessage } from "@/components/user-message";
import { WithWindow } from "@/components/with-window";
import { useStartNewConversation } from "@/hooks/use-start-new-conversation";
import { AppScope } from "@/scopes/app-scope";
import { ThreadLayout } from "@/thread-layout/thread-layout";
import { ThreadPageHeader } from "@/thread-layout/thread-page-header";
import { ThreadScrollLayout } from "@/thread-layout/thread-scroll-layout";
import { logger } from "@/utils/logger";
import { launchPendingWorktreeConversation } from "@/worktrees-v2/pending-worktree-conversation";
import {
  usePendingWorktreeConversationStarts,
  usePendingWorktreeConversationStartActions,
} from "@/worktrees-v2/pending-worktree-conversation-starts";
import { getPendingWorktreeAppServerManager } from "@/worktrees-v2/pending-worktree-host";
import {
  usePendingWorktree,
  usePendingWorktreeActions,
} from "@/worktrees-v2/pending-worktree-store";

export function WorktreeInitPage({
  header,
  homePath = "/",
  conversationPathBuilder = buildLocalConversationRoute,
  onConversationReady,
}: {
  header?: React.ReactNode | null;
  homePath?: string;
  conversationPathBuilder?: (conversationId: ConversationId) => string;
  onConversationReady?: (conversationId: ConversationId) => void;
} = {}): React.ReactElement | null {
  const navigate = useNavigate();
  const startNewConversation = useStartNewConversation();
  const scope = useScope(AppScope);
  const intl = useIntl();
  const { pendingWorktreeId } = useParams();
  const outputRef = useRef<HTMLDivElement | null>(null);
  const {
    cancelPendingWorktree,
    clearPendingWorktreeAttention,
    retryPendingWorktree,
  } = usePendingWorktreeActions();
  const { retryPendingWorktreeConversationStart } =
    usePendingWorktreeConversationStartActions();
  const pendingWorktree = usePendingWorktree(pendingWorktreeId);
  const pendingConversationStart = usePendingWorktreeConversationStarts().find(
    (entry) => entry.pendingWorktreeId === pendingWorktreeId,
  );
  const appServerRegistry = useAppServerRegistry();
  const mcpManager = getPendingWorktreeAppServerManager(
    appServerRegistry,
    pendingWorktree,
  );

  const cancelMutation = useMutation({
    mutationFn: async ({
      continueLocally,
    }: {
      continueLocally: boolean;
    }): Promise<void> => {
      if (!pendingWorktree) {
        return;
      }
      cancelPendingWorktree(pendingWorktree.id);

      if (continueLocally) {
        try {
          if (mcpManager == null) {
            throw new Error(
              `Pending worktree host ${pendingWorktree.hostId} is unavailable`,
            );
          }
          const conversationId = await launchPendingWorktreeConversation({
            entry: pendingWorktree,
            mcpManager,
            workspaceRoot: pendingWorktree.sourceWorkspaceRoot,
          });
          onConversationReady?.(conversationId);
          if (onConversationReady == null) {
            void navigate(conversationPathBuilder(conversationId));
          }
        } catch (error) {
          cancelPendingWorktree(pendingWorktree.id);
          logger.error(`Error creating local task from worktree`, {
            safe: {},
            sensitive: {
              error: error,
            },
          });
          scope.get(toast$).danger(
            intl.formatMessage(
              {
                id: "composer.localTaskError.v2",
                defaultMessage: "Error starting thread{br}{error}",
                description:
                  "Toast text shown when we failed to start a thread",
              },
              {
                br: <br />,
                error: maybeErrorToString(error),
              },
            ),
          );
          throw error;
        }
      } else {
        startNewConversation({ prefillPrompt: pendingWorktree.prompt.trim() });
      }
    },
  });

  const clearAttentionForActive = useEffectEvent(() => {
    if (!pendingWorktreeId) {
      return;
    }
    clearPendingWorktreeAttention(pendingWorktreeId);
  });

  useEffect(() => {
    clearAttentionForActive();
  }, [pendingWorktreeId]);

  useEffect((): void => {
    const container = outputRef.current;
    if (!container || !pendingWorktree) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [pendingWorktree]);

  if (
    cancelMutation.isPending ||
    cancelMutation.isSuccess ||
    pendingWorktree === undefined
  ) {
    return null;
  } else if (pendingConversationStart?.state === "succeeded") {
    return (
      <Navigate
        to={conversationPathBuilder(pendingConversationStart.conversationId)}
        replace
      />
    );
  } else if (!pendingWorktree) {
    return <Navigate to={homePath} replace />;
  }

  const isCancelable =
    pendingWorktree.phase === "queued" || pendingWorktree.phase === "creating";
  const isConversationStartFailed =
    pendingConversationStart?.state === "failed";
  const isConversationStarting = pendingConversationStart?.state === "starting";
  const isRetryable =
    pendingWorktree.phase === "failed" || isConversationStartFailed;
  const isStableWorktreeCreate =
    pendingWorktree.launchMode === "create-stable-worktree";

  return (
    <ThreadLayout
      header={
        header ?? (
          <WithWindow electron>
            <ThreadPageHeader
              start={
                <FormattedMessage
                  id="worktreeInitV2.title"
                  defaultMessage="Creating worktree"
                  description="Title for the worktree init v2 page"
                />
              }
            />
          </WithWindow>
        )
      }
    >
      <ThreadScrollLayout>
        <div className="flex flex-col gap-4">
          <UserMessage message={pendingWorktree.prompt} alwaysShowActions />
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-token-description-foreground">
              {isConversationStarting && (
                <FormattedMessage
                  id="worktreeInitV2.status.startingConversation"
                  defaultMessage="Starting conversation."
                  description="Status shown while the renderer starts the conversation after the worktree is ready"
                />
              )}
              {!isConversationStarting &&
                pendingWorktree.phase === "worktree-ready" && (
                  <FormattedMessage
                    id="worktreeInitV2.status.success"
                    defaultMessage="Worktree ready."
                    description="Status shown when worktree creation succeeds"
                  />
                )}
              {isConversationStartFailed && (
                <FormattedMessage
                  id="worktreeInitV2.status.startConversationError"
                  defaultMessage="Worktree ready, but failed to start the conversation."
                  description="Status shown when the worktree was created but the renderer failed to start the conversation"
                />
              )}
              {!isConversationStartFailed &&
                pendingWorktree.phase === "failed" && (
                  <FormattedMessage
                    id="worktreeInitV2.status.error"
                    defaultMessage="Worktree setup failed."
                    description="Status shown when worktree creation fails"
                  />
                )}
              {(pendingWorktree.phase === "queued" ||
                pendingWorktree.phase === "creating") && (
                <>
                  {pendingWorktree.launchMode === "fork-conversation" ? (
                    <FormattedMessage
                      id="worktreeInitV2.status.runningFork"
                      defaultMessage="Creating a worktree to fork this conversation."
                      description="Status shown while worktree creation is running in fork mode"
                    />
                  ) : (
                    <FormattedMessage
                      id="worktreeInitV2.status.running"
                      defaultMessage="Creating a worktree and running setup."
                      description="Status shown while worktree creation is running"
                    />
                  )}
                </>
              )}
            </div>
            {(isCancelable || isRetryable) && (
              <div className="flex items-center gap-2">
                {isCancelable && !isStableWorktreeCreate ? (
                  <Button
                    color="ghost"
                    loading={cancelMutation.isPending}
                    onClick={() => {
                      cancelMutation.mutate({ continueLocally: true });
                    }}
                  >
                    <FormattedMessage
                      id="worktreeInitV2.workLocallyInstead"
                      defaultMessage="Work locally instead"
                      description="Button that cancels worktree setup and starts a local conversation"
                    />
                  </Button>
                ) : null}
                {isCancelable ? (
                  <Button
                    color="ghost"
                    loading={cancelMutation.isPending}
                    onClick={() => {
                      cancelMutation.mutate({ continueLocally: false });
                    }}
                  >
                    <FormattedMessage
                      id="worktreeInitV2.cancel"
                      defaultMessage="Cancel"
                      description="Cancel button for worktree creation"
                    />
                  </Button>
                ) : null}
                {isRetryable && (
                  <>
                    {pendingWorktree.phase === "failed" && (
                      <Button
                        color="ghost"
                        onClick={() => {
                          const params = new URLSearchParams({
                            workspaceRoot: pendingWorktree.sourceWorkspaceRoot,
                          });
                          if (
                            pendingWorktree.localEnvironmentConfigPath != null
                          ) {
                            params.set(
                              "configPath",
                              pendingWorktree.localEnvironmentConfigPath,
                            );
                            params.set("mode", "edit");
                          }
                          void navigate(
                            `/settings/local-environments?${params.toString()}`,
                          );
                        }}
                      >
                        <FormattedMessage
                          id="worktreeInitV2.editEnvironment"
                          defaultMessage="Edit environment"
                          description="Button label to open local environment settings after worktree setup fails"
                        />
                      </Button>
                    )}
                    <Button
                      color="ghost"
                      onClick={() => {
                        if (pendingWorktree.phase === "failed") {
                          retryPendingWorktree(pendingWorktree.id);
                          return;
                        }
                        retryPendingWorktreeConversationStart(
                          pendingWorktree.id,
                        );
                      }}
                    >
                      <FormattedMessage
                        id="codex.common.retry"
                        defaultMessage="Retry"
                        description="Retry button"
                      />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          <div
            ref={outputRef}
            className="vertical-scroll-fade-mask text-size-code flex max-h-[500px] min-h-[500px] flex-1 flex-col overflow-x-auto overflow-y-auto rounded-lg border border-token-border bg-token-editor-background p-3 font-mono text-sm whitespace-pre text-token-input-placeholder-foreground"
          >
            {pendingWorktree.outputText.length > 0 ? (
              <AnsiBlock className="text-sm">
                {pendingWorktree.outputText}
              </AnsiBlock>
            ) : (
              <span className="text-token-input-placeholder-foreground">
                <FormattedMessage
                  id="worktreeInitV2.output.empty"
                  defaultMessage="Waiting for output…"
                  description="Placeholder text before output starts streaming"
                />
              </span>
            )}
          </div>
        </div>
      </ThreadScrollLayout>
    </ThreadLayout>
  );
}
