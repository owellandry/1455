import type { ConversationId, GitCwd } from "protocol";
import type { ReactElement } from "react";

import { useAppServerManagerForConversationIdOrDefault } from "@/app-server/app-server-manager-hooks";

import { useIsCodexWorktree } from "../use-is-codex-worktree";
import { MoveToLocalButton } from "./move-to-local-button";
import { MoveToWorktreeButton } from "./move-to-worktree-button";
import { useThreadHandoffForConversation } from "./thread-handoff-store";

export function MoveThreadButton({
  conversationId,
  conversationTitle,
  currentBranch,
  cwd,
  disabled,
}: {
  conversationId: ConversationId | null;
  conversationTitle: string | null;
  currentBranch: string | null;
  cwd: GitCwd;
  disabled: boolean;
}): ReactElement | null {
  const appServerManager =
    useAppServerManagerForConversationIdOrDefault(conversationId);
  const hostId = appServerManager.getHostId();
  const codexWorktree = useIsCodexWorktree(cwd, hostId);
  const operation = useThreadHandoffForConversation(conversationId);

  if (conversationId == null) {
    return null;
  }

  const branchForMoveButton =
    currentBranch ?? getHandoffBranchForConversation(operation, conversationId);
  const direction =
    operation?.direction ?? (codexWorktree ? "to-local" : "to-worktree");

  if (branchForMoveButton == null) {
    return null;
  }

  return direction === "to-local" ? (
    <MoveToLocalButton
      conversationId={conversationId}
      currentBranch={branchForMoveButton}
      cwd={cwd}
      disabled={disabled}
    />
  ) : (
    <MoveToWorktreeButton
      conversationId={conversationId}
      conversationTitle={conversationTitle}
      currentBranch={branchForMoveButton}
      cwd={cwd}
      disabled={disabled}
    />
  );
}

function getHandoffBranchForConversation(
  operation: ReturnType<typeof useThreadHandoffForConversation>,
  conversationId: ConversationId,
): string | null {
  if (operation == null) {
    return null;
  }
  if (operation.sourceConversationId === conversationId) {
    return operation.sourceBranch;
  }
  if (operation.targetConversationId !== conversationId) {
    return null;
  }
  if (operation.direction === "to-worktree") {
    return operation.worktreeBranch ?? operation.sourceBranch;
  }
  return operation.localBranch ?? operation.sourceBranch;
}
