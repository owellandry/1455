import type { ConversationId, GitCwd } from "protocol";

import { useMutationFromVSCode, type VSCodeMutationResult } from "@/vscode-api";

export function getGeneratePullRequestMessageMutationKey(
  cwd: GitCwd | null | undefined,
  hostId: string,
  conversationId?: ConversationId | null,
): Array<unknown> {
  return [
    "vscode",
    "generate-pull-request-message",
    cwd ?? null,
    hostId,
    conversationId ?? null,
  ];
}

export function useGeneratePullRequestMessageMutation({
  cwd,
  hostId,
  conversationId,
  onError,
}: {
  cwd: GitCwd | null | undefined;
  hostId: string;
  conversationId?: ConversationId | null;
  onError?: (error: Error) => void;
}): VSCodeMutationResult<"generate-pull-request-message"> {
  return useMutationFromVSCode("generate-pull-request-message", {
    mutationKey: getGeneratePullRequestMessageMutationKey(
      cwd,
      hostId,
      conversationId,
    ),
    onError,
  });
}
