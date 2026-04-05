import {
  useMutation,
  useQuery,
  type QueryClient,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  GitCommonDir,
  GitCwd,
  GitRoot,
  HostConfig,
  WorkerMutationMethod,
  WorkerMutations,
  WorkerQueryMethod,
  WorkerRequestResult,
  WorkerRequests,
} from "protocol";

import { useWindowType } from "@/hooks/use-window-type";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { workerRpcClient } from "@/worker-rpc";

import { getHostKey } from "./host-config-utils";
/* oxlint-disable import/no-cycle -- Existing cross-hook dependency; extracting shared helpers would be a larger refactor. */
import {
  gitStableMetadataQueryOptions,
  useHasGitRpc,
  type GitStableMetadata,
} from "./use-git-stable-metadata";
/* oxlint-enable import/no-cycle */

export const GIT_QUERY_KEY_PREFIX = "git";

export function gitCommonDirQueryKey(
  commonDir: GitCommonDir,
  hostKey: string,
): Array<unknown> {
  return [GIT_QUERY_KEY_PREFIX, hostKey, commonDir];
}

export function gitWorktreeQueryKey(
  commonDir: GitCommonDir,
  root: GitRoot,
  hostKey: string,
): Array<unknown> {
  return [...gitCommonDirQueryKey(commonDir, hostKey), root];
}

export function gitQueryKey<M extends WorkerQueryMethod<"git">>(options: {
  metadata: GitStableMetadata;
  method: M;
  params?: GitRequestWithoutHostConfig<M>;
  hostKey: string;
}): Array<unknown> {
  const requestKey = options.params ? JSON.stringify(options.params) : null;
  const base = gitWorktreeQueryKey(
    options.metadata.commonDir,
    options.metadata.root,
    options.hostKey,
  );

  return [...base, options.method, requestKey];
}

const GIT_QUERY_INVALIDATIONS_BY_CHANGE: Record<
  "head" | "remote-refs" | "synced-branch",
  Array<WorkerQueryMethod<"git">>
> = {
  head: [
    "current-branch",
    "upstream-branch",
    "branch-ahead-count",
    "recent-branches",
    "branch-changes",
    "status-summary",
    "review-summary",
    "staged-and-unstaged-changes",
    "untracked-changes",
    "tracked-uncommitted-changes",
    "index-info",
    "submodule-paths",
    "synced-branch",
  ],
  "remote-refs": [
    "branch-ahead-count",
    "default-branch",
    "base-branch",
    "branch-changes",
    "review-summary",
  ],
  "synced-branch": ["synced-branch", "synced-branch-state"],
};

export function refetchGitWorktreeQueries(
  queryClient: QueryClient,
  { commonDir, root }: GitStableMetadata,
  {
    changeType,
    hostKey,
    cancelRefetch = true,
  }: {
    changeType: "head" | "remote-refs" | "synced-branch";
    hostKey: string;
    cancelRefetch?: boolean;
  },
): Promise<Array<unknown>> {
  const methods = GIT_QUERY_INVALIDATIONS_BY_CHANGE[changeType];
  return Promise.all(
    methods.map((method) => {
      return queryClient.refetchQueries(
        {
          queryKey: [...gitWorktreeQueryKey(commonDir, root, hostKey), method],
        },
        { cancelRefetch },
      );
    }),
  );
}

export function refetchGitCommonDirQueries(
  queryClient: QueryClient,
  commonDir: GitCommonDir,
  { hostKey }: { hostKey: string },
): Promise<void> {
  return queryClient.refetchQueries({
    queryKey: gitCommonDirQueryKey(commonDir, hostKey),
    exact: false,
  });
}

type GitRequestWithoutHostConfig<M extends WorkerQueryMethod<"git">> = Omit<
  WorkerRequests<"git">[M]["request"],
  "hostConfig"
>;

type GitMutationRequestWithoutHostConfig<
  M extends WorkerMutationMethod<"git">,
> = Omit<WorkerMutations<"git">[M]["request"], "hostConfig">;

type GitRequest<M extends WorkerQueryMethod<"git">> =
  | GitRequestWithoutHostConfig<M>
  | ((metadata: GitStableMetadata) => GitRequestWithoutHostConfig<M>);

export type UseFetchFromGitOptions<
  M extends WorkerQueryMethod<"git">,
  D = WorkerRequestResult<"git", M>,
> = Omit<
  UseQueryOptions<WorkerRequestResult<"git", M>, Error, D>,
  "queryKey" | "queryFn"
>;

export type UseFetchFromGitResult<
  M extends WorkerQueryMethod<"git">,
  D = WorkerRequestResult<"git", M>,
> = UseQueryResult<D, Error>;

export type UseMutateFromGitOptions<M extends WorkerMutationMethod<"git">> =
  Omit<
    UseMutationOptions<
      WorkerRequestResult<"git", M>,
      Error,
      GitMutationRequestWithoutHostConfig<M>
    >,
    "mutationFn"
  >;

export type UseMutateFromGitResult<M extends WorkerMutationMethod<"git">> =
  UseMutationResult<
    WorkerRequestResult<"git", M>,
    Error,
    GitMutationRequestWithoutHostConfig<M>
  >;

function addQueryHostConfig<M extends WorkerQueryMethod<"git">>(
  params: GitRequestWithoutHostConfig<M>,
  hostConfig: HostConfig,
): WorkerRequests<"git">[M]["request"] {
  return {
    ...params,
    hostConfig,
  };
}

function addQueryHostConfigForMutation<M extends WorkerMutationMethod<"git">>(
  params: GitMutationRequestWithoutHostConfig<M>,
  hostConfig: HostConfig,
): WorkerMutations<"git">[M]["request"] {
  return {
    ...params,
    hostConfig,
  } as WorkerMutations<"git">[M]["request"];
}

export function gitQueryOptions<
  M extends WorkerQueryMethod<"git">,
  D = WorkerRequestResult<"git", M>,
>(
  method: M,
  metadata: GitStableMetadata | null | undefined,
  params: GitRequestWithoutHostConfig<M> | null,
  hasGitRpc: boolean,
  hostKey: string,
  hostConfig: HostConfig,
  options?: UseFetchFromGitOptions<M, D>,
): UseQueryOptions<WorkerRequestResult<"git", M>, Error, D> {
  const resolvedStaleTime = options?.staleTime ?? QUERY_STALE_TIME.INFINITE;
  return {
    queryKey:
      metadata && params
        ? gitQueryKey({
            metadata,
            method,
            params,
            hostKey,
          })
        : [GIT_QUERY_KEY_PREFIX, "disabled", method],
    queryFn: ({ signal }): Promise<WorkerRequestResult<"git", M>> => {
      if (!hasGitRpc) {
        return Promise.reject(
          new Error("Git RPC is unavailable in this environment"),
        );
      } else if (!metadata || !params) {
        return Promise.reject(new Error("Missing git metadata"));
      }
      return workerRpcClient("git").request<M>({
        method,
        params: addQueryHostConfig(params, hostConfig),
        signal,
      });
    },
    staleTime: resolvedStaleTime,
    gcTime: 30 * 60_1000,
    ...options,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    enabled: (query): boolean => {
      if (!hasGitRpc) {
        return false;
      } else if (metadata == null || params == null) {
        return false;
      }
      if (typeof options?.enabled === "function") {
        return options.enabled(query);
      }
      return options?.enabled ?? true;
    },
  };
}

export function useGitQuery<
  M extends WorkerQueryMethod<"git">,
  D = WorkerRequestResult<"git", M>,
>(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  method: M,
  request: GitRequest<M>,
  options?: UseFetchFromGitOptions<M, D>,
): UseQueryResult<D, Error> {
  const hasGitRpc = useHasGitRpc();
  const hostKey = getHostKey(hostConfig);
  const { data: metadata } = useQuery(
    gitStableMetadataQueryOptions(cwd, hasGitRpc, hostKey, hostConfig),
  );

  const params = metadata
    ? typeof request === "function"
      ? request(metadata)
      : request
    : null;

  return useQuery(
    gitQueryOptions(
      method,
      metadata,
      params,
      hasGitRpc,
      hostKey,
      hostConfig,
      options,
    ),
  );
}

export function useGitMutation<M extends WorkerMutationMethod<"git">>(
  method: M,
  hostConfig: HostConfig,
  options?: UseMutateFromGitOptions<M>,
): UseMutateFromGitResult<M> {
  const windowType = useWindowType();
  const hasGitRpc = windowType === "electron" || windowType === "extension";

  return useMutation({
    mutationFn: async (
      params: GitMutationRequestWithoutHostConfig<M>,
    ): Promise<WorkerRequestResult<"git", M>> => {
      if (!hasGitRpc) {
        throw new Error("Git RPC is unavailable in this environment");
      }
      return workerRpcClient("git").request({
        method,
        params: addQueryHostConfigForMutation(params, hostConfig),
      });
    },
    ...options,
  });
}
