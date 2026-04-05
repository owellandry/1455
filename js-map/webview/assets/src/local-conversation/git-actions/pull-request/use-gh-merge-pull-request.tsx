import type { UseMutationResult } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import type {
  GhMergePullRequestRequest,
  GhMergePullRequestResponse,
  GhPullRequestStatusResponse,
  GitCwd,
} from "protocol";

import { getQueryKey, useMutationFromVSCode } from "@/vscode-api";

function getGhMergePrMutationKey(
  cwd: GitCwd | null | undefined,
  headBranch: string | null | undefined,
  hostId: string | undefined,
): Array<unknown> {
  return [
    "vscode",
    "gh-pr-merge",
    cwd ?? null,
    headBranch ?? null,
    hostId ?? null,
  ];
}

export function useGhMergePullRequest({
  cwd,
  headBranch,
  hostId,
  onSuccess,
}: {
  cwd?: GitCwd | null;
  headBranch?: string | null;
  hostId?: string;
  onSuccess?: (
    result: GhMergePullRequestResponse,
    variables: GhMergePullRequestRequest,
  ) => void;
} = {}): UseMutationResult<
  GhMergePullRequestResponse,
  Error,
  GhMergePullRequestRequest
> {
  const queryClient = useQueryClient();
  const mutation = useMutationFromVSCode("gh-pr-merge", {
    mutationKey: getGhMergePrMutationKey(cwd, headBranch, hostId),
    onSuccess: (result, variables) => {
      if (result.status !== "success") {
        return;
      }
      if (headBranch != null) {
        queryClient.setQueryData(
          getQueryKey("gh-pr-status", {
            cwd: variables.cwd,
            headBranch,
            hostId: variables.hostId,
          }),
          (
            previous: GhPullRequestStatusResponse | undefined,
          ): GhPullRequestStatusResponse | undefined => {
            if (!previous || previous.status !== "success") {
              return previous;
            }
            return {
              ...previous,
              canMerge: false,
              checks: [],
              ciStatus: "none",
              commentAttachments: [],
              hasOpenPr: false,
              isDraft: false,
              reviewers: {
                approved: [],
                commentCounts: [],
                commented: [],
                changesRequested: [],
                requested: [],
                unresolvedCommentCount: 0,
              },
            };
          },
        );
        void queryClient.invalidateQueries({
          queryKey: getQueryKey("gh-pr-status", {
            cwd: variables.cwd,
            headBranch,
            hostId: variables.hostId,
          }),
        });
      }
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
