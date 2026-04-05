import {
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import type {
  GitCreateBranchRequest,
  GitCreateBranchResponse,
  HostConfig,
} from "protocol";

import { refetchGitWorktreeQueries } from "@/git-rpc/git-api";
import { getHostKey } from "@/git-rpc/host-config-utils";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useMutationFromVSCode } from "@/vscode-api";

export function useCreateGitBranch(
  cwd: string | null | undefined,
  hostConfig: HostConfig,
  options?: UseMutationOptions<
    GitCreateBranchResponse,
    Error,
    GitCreateBranchRequest
  >,
): UseMutationResult<GitCreateBranchResponse, Error, GitCreateBranchRequest> {
  const queryClient = useQueryClient();
  const { data: gitMetadata } = useGitStableMetadata(cwd, hostConfig);
  const hostKey = getHostKey(hostConfig);
  const mutation = useMutationFromVSCode("git-create-branch", {
    mutationKey: ["vscode", "git-create-branch", cwd ?? null, hostConfig.id],
    ...options,
    onSettled: async (
      data,
      error,
      variables,
      onMutateResult,
      context,
    ): Promise<void> => {
      if (gitMetadata) {
        const changeType =
          variables?.mode === "synced" ? "synced-branch" : "head";
        void refetchGitWorktreeQueries(queryClient, gitMetadata, {
          changeType,
          hostKey,
        });
      }
      if (options?.onSettled) {
        await options.onSettled(
          data,
          error,
          variables,
          onMutateResult,
          context,
        );
      }
    },
  });

  return {
    ...mutation,
    mutate: (variables, mutateOptions): void => {
      mutation.mutate(
        {
          ...variables,
          hostId: hostConfig.id,
        },
        mutateOptions,
      );
    },
    mutateAsync: (variables, mutateOptions) =>
      mutation.mutateAsync(
        {
          ...variables,
          hostId: hostConfig.id,
        },
        mutateOptions,
      ),
  };
}
