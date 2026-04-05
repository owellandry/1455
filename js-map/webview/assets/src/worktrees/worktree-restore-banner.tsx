import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useScope } from "maitai";
import {
  createGitCwd,
  createGitRoot,
  isCodexWorktree,
  type ConversationId,
  type WorkerRequestResult,
} from "protocol";
import { FormattedMessage, useIntl } from "react-intl";

import { useLocalConversationSelector } from "@/app-server/app-server-manager-hooks";
import { Banner } from "@/components/banner";
import { Button } from "@/components/button";
import { toast$ } from "@/components/toaster/toast-signal";
import { GIT_QUERY_KEY_PREFIX, useGitMutation } from "@/git-rpc/git-api";
import { getHostKey } from "@/git-rpc/host-config-utils";
import { useHasGitRpc } from "@/git-rpc/use-git-stable-metadata";
import { AppScope } from "@/scopes/app-scope";
import {
  DEFAULT_HOST_ID,
  useHostConfig,
} from "@/shared-objects/use-host-config";
import { terminalService } from "@/terminal/terminal-service";
import { logger } from "@/utils/logger";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { getQueryKey, useFetchFromVSCode } from "@/vscode-api";
import { workerRpcClient } from "@/worker-rpc";
import {
  codexWorktreesQueryKey,
  worktreeSnapshotRefQueryKey,
} from "@/worktrees/worktree-query-keys";

import { resolveCodexWorktreeRoot } from "./worktree-paths";

type WorktreeSnapshotRefResponse = WorkerRequestResult<
  "git",
  "worktree-snapshot-ref"
>;

export function WorktreeRestoreBanner({
  conversationId,
  cwd,
}: {
  conversationId: ConversationId;
  cwd: string | null;
}): React.ReactElement | null {
  const hasGitRpc = useHasGitRpc();
  const conversationHostId = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.hostId,
  );
  const hostConfig = useHostConfig(conversationHostId ?? DEFAULT_HOST_ID);
  const hostKey = getHostKey(hostConfig);
  const scope = useScope(AppScope);
  const intl = useIntl();
  const queryClient = useQueryClient();

  const { data: codexHomeData } = useFetchFromVSCode("codex-home");
  const codexHome = codexHomeData?.codexHome;
  const codexWorktree = !!cwd && isCodexWorktree(cwd, codexHome);
  const worktreeRoot = resolveCodexWorktreeRoot(
    cwd,
    codexHomeData?.worktreesSegment,
  );

  const { data: pathsExistResult } = useFetchFromVSCode("paths-exist", {
    params: { paths: cwd ? [cwd] : [] },
    queryConfig: {
      enabled: !!cwd,
      staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    },
  });

  const hasPathsExistResult = pathsExistResult != null;
  const doesCwdExist = (pathsExistResult?.existingPaths?.length ?? 0) > 0;

  const { data: workspaceRootOptions } = useFetchFromVSCode(
    "workspace-root-options",
  );
  const workspaceRoots = workspaceRootOptions?.roots ?? [];
  const isCodexWorktreeMissing =
    codexWorktree && !!cwd && hasPathsExistResult && !doesCwdExist;
  const isCwdMissing = !!cwd && hasPathsExistResult && !doesCwdExist;

  const { data: lookupResult } = useQuery<WorktreeSnapshotRefResponse | null>({
    queryKey: worktreeSnapshotRefQueryKey(hostKey, worktreeRoot),
    enabled:
      hasGitRpc &&
      isCodexWorktreeMissing &&
      !!cwd &&
      !!worktreeRoot &&
      workspaceRoots.length > 0,
    staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    queryFn: async ({ signal }) =>
      workerRpcClient("git").request({
        method: "worktree-snapshot-ref",
        params: {
          candidateRoots: workspaceRoots.map(createGitRoot),
          worktreePath: createGitCwd(worktreeRoot!),
          hostConfig,
        },
        signal,
      }),
  });

  const canRestore = isCodexWorktreeMissing && lookupResult?.exists;
  const isRemoteThread = conversationHostId !== DEFAULT_HOST_ID;
  const showMissingWithoutSnapshot =
    isCodexWorktreeMissing && lookupResult != null && !lookupResult.exists;
  const showMissingNonWorktree =
    isCwdMissing && !codexWorktree && !isRemoteThread;
  const showMissingMessage =
    showMissingWithoutSnapshot || showMissingNonWorktree;

  const restoreMutation = useGitMutation("restore-worktree", hostConfig, {
    onSuccess: () => {
      logger.info(`[worktree-restore] successfully restored`);
      void queryClient.invalidateQueries({
        queryKey: getQueryKey("paths-exist", { paths: cwd ? [cwd] : [] }),
      });
      void queryClient.invalidateQueries({
        queryKey: codexWorktreesQueryKey(hostKey),
      });
      void queryClient.invalidateQueries({
        queryKey: [GIT_QUERY_KEY_PREFIX, "metadata", hostKey],
      });
      if (worktreeRoot) {
        void queryClient.invalidateQueries({
          queryKey: worktreeSnapshotRefQueryKey(hostKey, worktreeRoot!),
        });
        const terminalSessionId =
          terminalService.getSessionForConversation(conversationId);
        if (terminalSessionId && cwd) {
          terminalService.attach({
            sessionId: terminalSessionId,
            conversationId,
            hostId: hostConfig.id,
            cwd,
            forceCwdSync: true,
          });
        }
      }
      scope.get(toast$).success(
        intl.formatMessage({
          id: "worktreeRestoreBanner.restore.success",
          defaultMessage: "Worktree restored",
          description: "Toast shown when a missing Codex worktree is restored",
        }),
      );
    },
    onError: (error) => {
      const message = error.message;
      logger.debug(`[worktree-restore] restore failed for`, {
        safe: {},
        sensitive: {
          cwd: cwd ?? "unknown",
          message: message,
        },
      });
      scope.get(toast$).danger(
        intl.formatMessage(
          {
            id: "worktreeRestoreBanner.restore.error",
            defaultMessage: "Failed to restore worktree: {message}",
            description:
              "Toast shown when restoring a missing Codex worktree fails",
          },
          { message },
        ),
      );
    },
  });

  if (!canRestore && !showMissingMessage) {
    return null;
  }

  const titleMessage = showMissingMessage ? (
    <FormattedMessage
      id="worktreeRestoreBanner.missing.title"
      defaultMessage="Current working directory missing"
      description="Title for banner when the current working directory is missing and no snapshot exists"
    />
  ) : (
    <FormattedMessage
      id="worktreeRestoreBanner.title"
      defaultMessage="Worktree cleaned up"
      description="Title for banner when a Codex worktree was pruned but can be restored"
    />
  );

  const bodyMessage = showMissingMessage ? (
    <FormattedMessage
      id="worktreeRestoreBanner.missing.body"
      defaultMessage="This thread's working directory no longer exists"
      description="Body text for banner shown when the current working directory is missing and no snapshot exists"
    />
  ) : (
    <FormattedMessage
      id="worktreeRestoreBanner.body"
      defaultMessage="This thread's worktree was removed to save disk space"
      description="Body text for banner that offers to restore a missing worktree snapshot"
    />
  );

  return (
    <div className="pb-4">
      <Banner
        type="info"
        layout="horizontal"
        content={
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-semibold text-token-foreground">
              {titleMessage}
            </span>
            <span className="hidden min-w-0 truncate text-token-description-foreground sm:inline">
              {bodyMessage}
            </span>
          </span>
        }
        customCtas={
          canRestore ? (
            <Button
              color="primary"
              loading={restoreMutation.isPending}
              onClick={() => {
                if (!cwd || !worktreeRoot || !lookupResult?.exists) {
                  return;
                }
                void restoreMutation.mutateAsync({
                  repoRoot: lookupResult.repoRoot,
                  worktreePath: createGitCwd(worktreeRoot),
                  conversationId,
                });
              }}
            >
              <FormattedMessage
                id="worktreeRestoreBanner.restoreCta"
                defaultMessage="Restore worktree"
                description="Primary call to action for restoring a missing worktree snapshot"
              />
            </Button>
          ) : null
        }
      />
    </div>
  );
}
