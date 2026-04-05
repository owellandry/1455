import type { components } from "@oai/codex-backend-client";
import {
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import Fuse from "fuse.js";
import orderBy from "lodash/orderBy";
import uniqBy from "lodash/uniqBy";
import type {
  AccountEntry,
  AccountsCheckResponse,
  AdhocEnvironment,
  CodeEnvironment,
  CodeTaskDetailsResponse,
  CodeTaskTurnResponse,
  CodeTaskTurnsResponse,
  CommentInputItem,
  CreatePrRequestMode,
  CreatePrResponse,
  CreateTaskTurnResponse,
  CreateWorktreeSnapshotUploadUrlResponse,
  FinishWorktreeSnapshotUploadResponse,
  ImageAssetPointer,
  InputItem,
  PriorConversation,
  TaskAssistantTurn,
  TaskListItem,
} from "protocol";

import { useAuth } from "./auth/use-auth";
import { parseOwnerRepo } from "./utils/parse-owner-repo";
import { QUERY_STALE_TIME } from "./utils/query-stale-times";
import { CodexRequest } from "./utils/request";
import { useDebouncedValue } from "./utils/use-debounced-value";
import { fetchFromVSCode } from "./vscode-api";

export type CreateTaskParams = {
  prompt: string;
  ideContext: string;
  ref: string;
  environmentId: string | null;
  environment: AdhocEnvironment | null;
  runEnvironmentInQaMode: boolean;
  startingDiff?: string | null;
  priorConversation: PriorConversation | null;
  images: Array<ImageAssetPointer> | null;
  commentAttachments?: Array<CommentInputItem>;
  bestOfN?: number;
};

type RemoteNewTaskRequest = NonNullable<
  components["schemas"]["CreateTaskTurnRequest"]["new_task"]
>;

export type FollowUpTaskParams = {
  taskId: string;
  turnId: string;
  prompt: string;
  ideContext: string;
  runEnvironmentInQaMode: boolean;
  priorConversation: PriorConversation | null;
  images: Array<ImageAssetPointer> | null;
  commentAttachments?: Array<CommentInputItem>;
  bestOfN?: number;
};

export function useTasks(opts?: {
  limit?: number;
  taskFilter?: "current" | "all";
  enabled?: boolean;
  environmentLabel?: string;
}): UseQueryResult<Array<TaskListItem>, Error> {
  const { authMethod } = useAuth();
  return useQuery({
    queryKey: ["tasks", opts?.limit, opts?.taskFilter],
    queryFn: async () => {
      const tasks = await CodexRequest.safeGet("/wham/tasks/list", {
        parameters: {
          query: {
            limit: opts?.limit,
            task_filter: opts?.taskFilter,
          },
        },
      });
      return tasks.items;
    },
    enabled: opts?.enabled !== false && authMethod === "chatgpt",
    select: opts?.environmentLabel
      ? (tasks): Array<TaskListItem> =>
          tasks.filter(
            (t) =>
              t.task_status_display?.environment_label ===
              opts.environmentLabel,
          )
      : undefined,
    staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    refetchInterval: (query) => {
      const hasPending = query.state.data?.some((t) => {
        const status =
          t.task_status_display?.latest_turn_status_display?.turn_status;
        return status === "pending" || status === "in_progress";
      });
      return hasPending ? 15_000 : 60_000;
    },
    refetchIntervalInBackground: true,
  });
}

export function useTaskDetails(
  taskId: string | null,
): UseQueryResult<CodeTaskDetailsResponse, Error> {
  return useQuery({
    queryKey: ["task", taskId],
    enabled: !!taskId,
    staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
    queryFn: async () => {
      return CodexRequest.safeGet(`/wham/tasks/{task_id}`, {
        parameters: {
          path: { task_id: taskId ?? "" },
        },
      });
    },
  });
}

export function useTaskTurns(
  taskId: string | null,
): UseQueryResult<CodeTaskTurnsResponse, Error> {
  return useQuery({
    queryKey: ["task", taskId, "turns"],
    enabled: !!taskId,
    staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
    queryFn: async () => {
      return CodexRequest.safeGet("/wham/tasks/{task_id}/turns", {
        parameters: {
          path: { task_id: taskId ?? "" },
        },
      });
    },
  });
}

export function useTaskTurn(
  taskId: string | null,
  turnId: string | null,
  options?: {
    enabled?: boolean;
    refetchInterval?:
      | number
      | false
      | ((query: { state: { data?: CodeTaskTurnResponse } }) => number | false);
  },
): UseQueryResult<CodeTaskTurnResponse, Error> {
  return useQuery({
    queryKey: ["task", taskId, "turn", turnId],
    enabled: !!taskId && !!turnId && (options?.enabled ?? true),
    staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
    refetchInterval: options?.refetchInterval,
    queryFn: async () => {
      return CodexRequest.safeGet(
        "/wham/tasks/{task_id}/turns/{task_turn_id}",
        {
          parameters: {
            path: { task_id: taskId ?? "", task_turn_id: turnId ?? "" },
          },
        },
      );
    },
  });
}

export function useSiblingTurns(
  taskId: string | null,
  turnId: string | null,
  opts?: { expectedCount?: number },
): UseQueryResult<Array<TaskAssistantTurn>, Error> {
  return useQuery({
    queryKey: ["task", taskId, "turn", turnId, "siblings"],
    enabled: !!taskId && !!turnId,
    staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
    queryFn: async () => {
      const response = await CodexRequest.safeGet(
        "/wham/tasks/{task_id}/turns/{task_turn_id}/sibling_turns",
        {
          parameters: {
            path: {
              task_id: taskId ?? "",
              task_turn_id: turnId ?? "",
            },
          },
        },
      );
      return response.sibling_turns;
    },
    refetchInterval: (query) => {
      if (opts?.expectedCount === undefined) {
        return false;
      }
      const currentCount = query.state.data?.length ?? 0;
      return currentCount < opts.expectedCount ? 5000 : false;
    },
  });
}

export function useEnvironments({
  enabled = true,
}: { enabled?: boolean } = {}): UseQueryResult<Array<CodeEnvironment>, Error> {
  const { authMethod } = useAuth();
  return useQuery({
    queryKey: ["environments"],
    queryFn: async () => CodexRequest.safeGet("/wham/environments"),
    enabled: enabled && authMethod === "chatgpt",
    staleTime: QUERY_STALE_TIME.ONE_MINUTE,
  });
}

export function useEnvironmentSearch(
  query: string,
  {
    enabled = true,
  }: {
    enabled?: boolean;
  },
): UseQueryResult<Array<CodeEnvironment>, Error> {
  const debouncedQuery = useDebouncedValue(query, 200);

  return useQuery({
    queryKey: ["workspace", "environments-search", debouncedQuery],
    enabled: enabled && debouncedQuery.trim().length > 0,
    queryFn: async () => {
      const environments = await CodexRequest.safeGet("/wham/environments");
      const normalizedTerm = debouncedQuery.trim().toLowerCase();
      const fuse = new Fuse(environments, {
        threshold: 0.4,
        keys: ["label", "repos"],
      });
      const result = fuse?.search(debouncedQuery).map((i) => i.item) ?? [];

      const rank = (label: string): number => {
        const normalizedLabel = label.toLowerCase();
        if (normalizedLabel === normalizedTerm) {
          return 0;
        }
        if (normalizedLabel.startsWith(normalizedTerm)) {
          return 1;
        }
        return 2;
      };

      return [
        fuse,
        result.sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) {
            return a.is_pinned ? -1 : 1;
          }
          const rankDiff = rank(a.label) - rank(b.label);
          if (rankDiff !== 0) {
            return rankDiff;
          }
          return a.label.localeCompare(b.label);
        }),
      ] as const;
    },
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    select: ([fuse, environments]) => {
      if (!debouncedQuery?.trim()) {
        return environments;
      }
      const queryLower = debouncedQuery.trim().toLocaleLowerCase();
      return fuse.search(queryLower).map((i) => i.item);
    },
  });
}

export function useWorkspaceEnvironments(opts?: {
  enabled?: boolean;
}): UseQueryResult<Array<CodeEnvironment>, Error> {
  const { authMethod } = useAuth();
  const cloudAccessEnabled = opts?.enabled ?? true;
  const { data: owners } = useQuery({
    queryKey: ["workspace", "environments-by-repo"],
    queryFn: async () => getWorkspaceRepoOwnerNames(),
    staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    enabled: cloudAccessEnabled && authMethod === "chatgpt",
  });
  const ownersKeys = orderBy(owners, ["owner", "repoName"]).flatMap(
    ({ owner, repoName }) => [owner, repoName],
  );
  return useQuery({
    queryKey: ["workspace", "environments-by-repo", ...ownersKeys],
    enabled: cloudAccessEnabled && !!owners && authMethod === "chatgpt",
    staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    queryFn: async () => {
      const lists = await Promise.all(
        (owners ?? [])?.map(({ owner, repoName }) =>
          CodexRequest.safeGet(
            "/wham/environments/by-repo/{provider}/{repo_owner}/{repo_name}",
            {
              parameters: {
                path: {
                  provider: "github",
                  repo_owner: owner,
                  repo_name: repoName,
                },
              },
            },
          ),
        ),
      );
      const envs = lists.flat();
      orderBy(envs, ["is_pinned", "task_count", "label"]);
      return envs;
    },
  });
}

async function getWorkspaceRepoOwnerNames(): Promise<
  Array<{ owner: string; repoName: string }>
> {
  const response = await fetchFromVSCode("git-origins");

  const results: Array<{ owner: string; repoName: string }> = [];
  for (const { originUrl } of response.origins) {
    if (!originUrl) {
      continue;
    }
    const parsed = parseOwnerRepo(originUrl);
    if (parsed) {
      results.push(parsed);
    }
  }
  return uniqBy(results, ({ owner, repoName }) => `${owner}/${repoName}`);
}

export async function createRemoteTask(
  params: CreateTaskParams,
): Promise<CreateTaskTurnResponse> {
  const items: Array<InputItem> = [];
  if (params.ideContext) {
    items.push({
      type: "ide_context",
      context: params.ideContext,
    });
  }
  items.push({
    type: "message",
    role: "user",
    content: [{ content_type: "text", text: params.prompt }],
  });

  if (params.images?.length) {
    for (const img of params.images) {
      items.push(img);
    }
  }

  if (params.startingDiff) {
    items.push({
      type: "pre_apply_patch",
      output_diff: {
        diff: params.startingDiff,
      },
    });
  }

  if (params.priorConversation?.conversation?.length) {
    items.push({
      type: "prior_conversation",
      conversation: params.priorConversation.conversation,
      diff: params.priorConversation.diff,
    });
  }

  if (params.commentAttachments?.length) {
    for (const comment of params.commentAttachments) {
      items.push(comment);
    }
  }

  const newTaskRequest: RemoteNewTaskRequest = {
    // Branch actually takes any ref.
    branch: params.ref,
    environment_id: params.environmentId,
    run_environment_in_qa_mode: params.runEnvironmentInQaMode,
  };

  if (params.environment != null) {
    // Attach adhoc environment payload when the caller supplies one.
    newTaskRequest.environment = params.environment;
  }

  if (params.environmentId == null) {
    // Drop null values so the API only receives environment metadata when set.
    delete (newTaskRequest as { environment_id?: string | null })
      .environment_id;
  }

  return CodexRequest.safePost("/wham/tasks", {
    requestBody: {
      new_task: newTaskRequest,
      ...(params.bestOfN ? { metadata: { best_of_n: params.bestOfN } } : {}),
      input_items: items,
    },
  });
}

export async function createWorktreeSnapshotUploadUrl({
  repoName,
  filename,
  contentType,
  anticipatedFileSize,
}: {
  repoName: string;
  filename: string;
  contentType: string;
  anticipatedFileSize: number;
}): Promise<CreateWorktreeSnapshotUploadUrlResponse> {
  return CodexRequest.safePost("/wham/worktree_snapshots/upload_url", {
    requestBody: {
      repo_name: repoName,
      filename,
      content_type: contentType,
      anticipated_file_size: anticipatedFileSize,
    },
  });
}

export async function finishWorktreeSnapshotUpload({
  fileId,
  etag,
}: {
  fileId: string;
  etag: string;
}): Promise<FinishWorktreeSnapshotUploadResponse> {
  return CodexRequest.safePost("/wham/worktree_snapshots/finish_upload", {
    requestBody: {
      file_id: fileId,
      etag,
    },
  });
}

export function useCreateCloudTaskMutation(): UseMutationResult<
  CreateTaskTurnResponse,
  Error,
  CreateTaskParams
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateTaskParams) => createRemoteTask(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export async function followUpToRemoteTask(
  params: FollowUpTaskParams,
): Promise<CreateTaskTurnResponse> {
  const items: Array<InputItem> = [];
  if (params.ideContext) {
    items.push({
      type: "ide_context",
      context: params.ideContext,
    });
  }
  items.push({
    type: "message",
    role: "user",
    content: [{ content_type: "text", text: params.prompt }],
  });

  if (params.images?.length) {
    for (const img of params.images) {
      items.push(img);
    }
  }

  if (params.commentAttachments?.length) {
    for (const comment of params.commentAttachments) {
      items.push(comment);
    }
  }
  return CodexRequest.safePost("/wham/tasks", {
    requestBody: {
      follow_up: {
        task_id: params.taskId,
        turn_id: params.turnId,
        environment_mode: params.runEnvironmentInQaMode ? "ask" : "code",
      },
      ...(params.bestOfN ? { metadata: { best_of_n: params.bestOfN } } : {}),
      input_items: items,
    },
  });
}

export async function createTaskPr(params: {
  taskId: string;
  turnId: string;
  mode?: CreatePrRequestMode;
  addCodexTag?: boolean;
  hidePrTitleAndBody?: boolean;
  additionalLabels?: Array<string>;
}): Promise<CreatePrResponse> {
  return CodexRequest.safePost(
    "/wham/tasks/{task_id}/turns/{task_turn_id}/pr",
    {
      parameters: {
        path: {
          task_id: params.taskId,
          task_turn_id: params.turnId,
        },
      },
      requestBody: {
        mode: params.mode,
        add_codex_tag: params.addCodexTag,
        hide_pr_title_and_body: params.hidePrTitleAndBody,
        additional_labels: params.additionalLabels,
      },
    },
  );
}

export function useCreateTaskPrMutation(): UseMutationResult<
  CreatePrResponse,
  Error,
  {
    taskId: string;
    turnId: string;
    mode?: CreatePrRequestMode;
    addCodexTag?: boolean;
    hidePrTitleAndBody?: boolean;
    additionalLabels?: Array<string>;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params) => createTaskPr(params),
    onSuccess: (_, params) => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["task", params.taskId] });
      void queryClient.invalidateQueries({
        queryKey: ["task", params.taskId, "turns"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["task", params.taskId, "turn", params.turnId],
      });
    },
  });
}

export function useFollowUpToCloudTaskMutation(): UseMutationResult<
  CreateTaskTurnResponse,
  Error,
  FollowUpTaskParams
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: FollowUpTaskParams) => followUpToRemoteTask(params),
    onSuccess: () => {
      // Invalidate tasks cache to refetch new list
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export async function searchBranchesByRepository(
  repositoryId: string,
  query: string,
  pageSize = 20,
  cursor: string | null = null,
): Promise<{
  items: Array<{ branch: string }>;
  cursor?: string | null;
}> {
  return CodexRequest.safeGet("/wham/github/branches/{repo_id}/search", {
    parameters: {
      path: { repo_id: `github-${repositoryId}` },
      query: { query, page_size: pageSize, cursor },
    },
  });
}

export function useSearchBranchesByRepository(
  repoId: string | null,
  query: string,
  {
    enabled = true,
  }: {
    enabled?: boolean;
  } = {},
): UseInfiniteQueryResult<Array<string>, Error> {
  return useInfiniteQuery({
    queryKey: ["search-branches", repoId, query],
    enabled: !!repoId && enabled,
    initialPageParam: null as string | null,
    staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    queryFn: ({ pageParam }) => {
      return searchBranchesByRepository(repoId ?? "", query, 20, pageParam);
    },
    select: (data) =>
      data.pages.flatMap((p) => p.items?.map((i) => i.branch) ?? []),
    getNextPageParam: (lastPage) => lastPage?.cursor ?? null,
  });
}

export function useMarkTaskAsRead(
  taskId: string,
): UseMutationResult<components["schemas"]["MarkReadResponse"], Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      CodexRequest.safePost("/wham/tasks/{task_id}/mark_read", {
        parameters: {
          path: { task_id: taskId },
        },
      }),
    onSuccess: () => {
      // Invalidate tasks cache to refetch new list
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    },
  });
}

export function useAccounts(): UseQueryResult<AccountsCheckResponse, Error> {
  const { authMethod } = useAuth();
  return useQuery({
    queryKey: ["accounts", "check"],
    queryFn: async () => {
      return CodexRequest.safeGet("/wham/accounts/check");
    },
    staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    enabled: authMethod === "chatgpt",
  });
}

export async function fetchRateLimitStatus(): Promise<
  components["schemas"]["RateLimitStatusPayload"]
> {
  return CodexRequest.safeGet("/wham/usage");
}

export function useCurrentAccount(): {
  data: AccountEntry | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { data, isLoading, isError } = useAccounts();
  const accountId =
    data?.account_ordering && data.account_ordering.length > 0
      ? data.account_ordering[0]
      : undefined;
  const currentAccount =
    accountId && data?.accounts
      ? data.accounts.find((a) => a.id === accountId)
      : undefined;
  return {
    data: currentAccount,
    isLoading,
    isError,
  };
}

type AccountsCheckV4Response = {
  accounts?: Record<
    string,
    {
      account?: {
        account_user_role?: string | null;
      } | null;
    }
  >;
};

const ACCOUNTS_CHECK_V4_VERSION = "v4-2023-04-27";

export function useCurrentAccountUserRole(): UseQueryResult<
  string | null,
  Error
> {
  const { data: currentAccount, isLoading: isCurrentAccountLoading } =
    useCurrentAccount();

  return useQuery({
    queryKey: [
      "accounts",
      "check",
      ACCOUNTS_CHECK_V4_VERSION,
      currentAccount?.id ?? null,
    ],
    enabled: !isCurrentAccountLoading && currentAccount != null,
    staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: () =>
      CodexRequest.safeGet("/accounts/check/{version}", {
        parameters: {
          path: {
            version: ACCOUNTS_CHECK_V4_VERSION,
          },
        },
      }) as Promise<AccountsCheckV4Response>,
    select: (accountCheck) => {
      if (currentAccount == null) {
        return null;
      }
      return (
        accountCheck.accounts?.[currentAccount.id]?.account
          ?.account_user_role ?? null
      );
    },
  });
}
