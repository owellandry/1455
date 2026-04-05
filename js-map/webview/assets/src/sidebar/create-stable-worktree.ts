import type { PendingWorktreeCreateParams } from "@/worktrees-v2/pending-worktree-store";

export function buildCreateStableWorktreeRequest({
  hostId,
  groupPath,
  label,
  prompt,
}: {
  hostId: string;
  groupPath: string;
  label: string;
  prompt: string;
}): PendingWorktreeCreateParams {
  return {
    hostId,
    label,
    sourceWorkspaceRoot: groupPath,
    startingState: {
      type: "branch",
      branchName: "HEAD",
    },
    localEnvironmentConfigPath: null,
    prompt,
    launchMode: "create-stable-worktree",
    startConversationParamsInput: null,
    sourceConversationId: null,
    sourceCollaborationMode: null,
  };
}
