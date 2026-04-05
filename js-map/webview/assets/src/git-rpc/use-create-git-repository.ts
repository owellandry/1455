import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useScope } from "maitai";
import { createGitCwd, type HostConfig } from "protocol";
import { useIntl } from "react-intl";

import { toast$ } from "@/components/toaster/toast-signal";
import { GIT_QUERY_KEY_PREFIX } from "@/git-rpc/git-api";
import { getHostKey } from "@/git-rpc/host-config-utils";
import { useHasGitRpc } from "@/git-rpc/use-git-stable-metadata";
import { AppScope } from "@/scopes/app-scope";
import { getQueryKey } from "@/vscode-api";
import { workerRpcClient } from "@/worker-rpc";

export function useCreateGitRepository({
  cwd,
  hostConfig,
  onErrorMessage,
  showErrorToast = false,
}: {
  cwd: string | null | undefined;
  hostConfig: HostConfig;
  onErrorMessage?: (message: string) => void;
  showErrorToast?: boolean;
}): {
  canCreateGitRepository: boolean;
  createGitRepository: () => Promise<void>;
  isCreatingGitRepository: boolean;
} {
  const queryClient = useQueryClient();
  const scope = useScope(AppScope);
  const intl = useIntl();
  const hostKey = getHostKey(hostConfig);
  const hasGitRpc = useHasGitRpc();

  const mutation = useMutation({
    mutationKey: ["git", "init-repo", hostKey, cwd ?? ""],
    mutationFn: async (): Promise<void> => {
      if (!hasGitRpc || cwd == null) {
        throw new Error("Missing git context");
      }
      await workerRpcClient("git").request({
        method: "git-init-repo",
        params: {
          cwd: createGitCwd(cwd),
          hostConfig,
        },
      });
    },
    onSuccess: async (): Promise<void> => {
      scope.get(toast$).success(
        intl.formatMessage({
          id: "codex.review.noDiff.gitInit.success",
          defaultMessage: "Git repository created",
          description:
            "Toast shown after creating a git repository from the diff empty state",
        }),
      );
      const invalidationRequests = [
        queryClient.invalidateQueries({
          queryKey: getQueryKey("git-origins"),
        }),
      ];
      if (cwd != null) {
        invalidationRequests.push(
          queryClient.invalidateQueries({
            queryKey: [GIT_QUERY_KEY_PREFIX, "metadata", hostKey, cwd],
          }),
        );
      }
      await Promise.all(invalidationRequests);
    },
    onError: (error: unknown): void => {
      const message = error instanceof Error ? error.message : String(error);
      if (showErrorToast) {
        scope.get(toast$).danger(
          intl.formatMessage(
            {
              id: "codex.review.noDiff.gitInit.error",
              defaultMessage: "Git init failed: {message}",
              description:
                "Error text shown when git initialization fails from the diff empty state",
            },
            { message },
          ),
        );
      }
      onErrorMessage?.(message);
    },
  });

  const createGitRepository = async (): Promise<void> => {
    if (!hasGitRpc || cwd == null || mutation.isPending) {
      return;
    }
    try {
      await mutation.mutateAsync();
    } catch {
      return;
    }
  };

  return {
    canCreateGitRepository: hasGitRpc && cwd != null,
    createGitRepository,
    isCreatingGitRepository: mutation.isPending,
  };
}
