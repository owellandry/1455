import type { UseMutationResult } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useScope } from "maitai";
import type { GitPushRequest, GitPushResponse, HostConfig } from "protocol";
import { GlobalStateKey } from "protocol";

import { getHostKey } from "@/git-rpc/host-config-utils";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useGlobalState } from "@/hooks/use-global-state";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";
import { useMutationFromVSCode } from "@/vscode-api";

import { resetBranchAheadCount } from "../shared/git-branch-ahead-count";

export function useGitPushMutation({
  cwd,
  hostConfig,
  onSuccess,
}: {
  cwd: string | null;
  hostConfig: HostConfig;
  onSuccess?: (result: GitPushResponse, variables: GitPushRequest) => void;
}): UseMutationResult<GitPushResponse, Error, GitPushRequest> {
  const queryClient = useQueryClient();
  const { data: gitMetadata } = useGitStableMetadata(cwd, hostConfig);
  const hostKey = getHostKey(hostConfig);
  const scope = useScope(AppScope);
  const { data: alwaysForcePush } = useGlobalState(
    GlobalStateKey.GIT_ALWAYS_FORCE_PUSH,
  );

  const mutation = useMutationFromVSCode("git-push", {
    mutationKey: getGitPushMutationKey(cwd, hostConfig.id),
    onSuccess: (result, variables) => {
      if (result.status !== "success") {
        return;
      }
      scope.get(productEventLogger$).log({
        eventName: "codex_git_push_succeeded",
        metadata: { forced: variables.force ?? false },
      });
      resetBranchAheadCount(queryClient, gitMetadata, hostKey);
      onSuccess?.(result, variables);
    },
  });

  return {
    ...mutation,
    mutate: (variables, options): void => {
      mutation.mutate(
        {
          ...variables,
          force: variables.force ?? alwaysForcePush,
          hostId: hostConfig.id,
        },
        options,
      );
    },
    mutateAsync: (variables, options) =>
      mutation.mutateAsync(
        {
          ...variables,
          force: variables.force ?? alwaysForcePush,
          hostId: hostConfig.id,
        },
        options,
      ),
  };
}

export function getGitPushMutationKey(
  cwd: string | null,
  hostId: string | undefined,
): Array<unknown> {
  return ["vscode", "git-push", cwd, hostId ?? null];
}
