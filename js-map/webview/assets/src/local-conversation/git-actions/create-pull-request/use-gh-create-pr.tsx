import type { QueryClient, UseMutationResult } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useScope } from "maitai";
import type {
  GhCreatePullRequestRequest,
  GhCreatePullRequestResponse,
  GhPullRequestStatusResponse,
  GitCwd,
} from "protocol";

import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";
import { getQueryKey, useMutationFromVSCode } from "@/vscode-api";

export type CreatedPrStatusPayload = {
  cwd: GitCwd;
  headBranch: string;
  hostId?: string;
  url: string | null;
  isDraft: boolean;
};

export function setCreatedPrStatusQueryData(
  queryClient: QueryClient,
  { cwd, headBranch, hostId, url, isDraft }: CreatedPrStatusPayload,
): void {
  queryClient.setQueryData(
    getQueryKey("gh-pr-status", {
      cwd,
      headBranch,
      hostId,
    }),
    (
      previous: GhPullRequestStatusResponse | undefined,
    ): GhPullRequestStatusResponse | undefined => {
      if (!previous) {
        return {
          status: "success",
          canMerge: false,
          checks: [],
          ciStatus: "none",
          commentAttachments: [],
          hasOpenPr: true,
          isDraft,
          number: null,
          repo: null,
          reviewers: {
            approved: [],
            commentCounts: [],
            commented: [],
            changesRequested: [],
            requested: [],
            unresolvedCommentCount: 0,
          },
          reviewStatus: "none",
          url,
        };
      }
      return {
        ...previous,
        status: "success",
        url: url ?? previous.url ?? null,
        hasOpenPr: true,
        isDraft,
      };
    },
  );
}

export function useGhCreatePr({
  cwd,
  hostId,
  onSuccess,
}: {
  cwd?: GitCwd | null;
  hostId?: string;
  onSuccess?: (
    result: GhCreatePullRequestResponse,
    variables: GhCreatePullRequestRequest,
  ) => void;
} = {}): UseMutationResult<
  GhCreatePullRequestResponse,
  Error,
  GhCreatePullRequestRequest
> {
  const queryClient = useQueryClient();
  const scope = useScope(AppScope);
  const mutation = useMutationFromVSCode("gh-pr-create", {
    mutationKey: getGhCreatePrMutationKey(cwd, hostId),
    onSuccess: (result, variables) => {
      if (result.status !== "success") {
        return;
      }
      scope.get(productEventLogger$).log({
        eventName: "codex_git_create_pr_succeeded",
      });
      setCreatedPrStatusQueryData(queryClient, {
        cwd: variables.cwd,
        headBranch: variables.headBranch,
        hostId: variables.hostId,
        url: result.url ?? null,
        isDraft: variables.isDraft ?? false,
      });
      onSuccess?.(result, variables);
    },
  });

  return {
    ...mutation,
    mutate: (variables, options): void => {
      mutation.mutate(
        {
          ...variables,
          hostId,
        },
        options,
      );
    },
    mutateAsync: (variables, options) =>
      mutation.mutateAsync(
        {
          ...variables,
          hostId,
        },
        options,
      ),
  };
}

export function getGhCreatePrMutationKey(
  cwd: GitCwd | null | undefined,
  hostId: string | undefined,
): Array<unknown> {
  return ["vscode", "gh-pr-create", cwd ?? null, hostId ?? null];
}
