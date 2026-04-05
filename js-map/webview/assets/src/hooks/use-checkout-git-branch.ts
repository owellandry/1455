import {
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import type {
  GitCheckoutBranchRequest,
  GitCheckoutBranchResponse,
  HostConfig,
} from "protocol";

import { refetchGitWorktreeQueries } from "@/git-rpc/git-api";
import { getHostKey } from "@/git-rpc/host-config-utils";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useMutationFromVSCode } from "@/vscode-api";

export function useCheckoutGitBranch(
  cwd: string | null | undefined,
  hostConfig: HostConfig,
  options?: UseMutationOptions<
    GitCheckoutBranchResponse,
    Error,
    GitCheckoutBranchRequest
  >,
): UseMutationResult<
  GitCheckoutBranchResponse,
  Error,
  GitCheckoutBranchRequest
> {
  const queryClient = useQueryClient();
  const { data: gitMetadata } = useGitStableMetadata(cwd, hostConfig);
  const hostKey = getHostKey(hostConfig);
  const mutation = useMutationFromVSCode("git-checkout-branch", {
    mutationKey: ["vscode", "git-checkout-branch", cwd ?? null, hostConfig.id],
    ...options,
    onSettled: async (
      data,
      error,
      variables,
      onMutateResult,
      context,
    ): Promise<void> => {
      if (gitMetadata) {
        void refetchGitWorktreeQueries(
          queryClient,
          {
            commonDir: gitMetadata.commonDir,
            root: gitMetadata.root,
          },
          {
            changeType: "head",
            hostKey,
          },
        );
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
