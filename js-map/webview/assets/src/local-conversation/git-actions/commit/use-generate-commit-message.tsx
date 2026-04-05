import type { ConversationId, GitCwd } from "protocol";

import { useMutationFromVSCode, type VSCodeMutationResult } from "@/vscode-api";

export function getGenerateCommitMessageMutationKey(
  cwd: GitCwd | null | undefined,
  hostId: string,
  conversationId?: ConversationId | null,
): Array<unknown> {
  return [
    "vscode",
    "generate-commit-message",
    cwd ?? null,
    hostId,
    conversationId ?? null,
  ];
}

export function useGenerateCommitMessageMutation({
  cwd,
  hostId,
  conversationId,
  onError,
}: {
  cwd: GitCwd | null | undefined;
  hostId: string;
  conversationId?: ConversationId | null;
  onError?: (error: Error) => void;
}): VSCodeMutationResult<"generate-commit-message"> {
  return useMutationFromVSCode("generate-commit-message", {
    mutationKey: getGenerateCommitMessageMutationKey(
      cwd,
      hostId,
      conversationId,
    ),
    onError,
  });
}
