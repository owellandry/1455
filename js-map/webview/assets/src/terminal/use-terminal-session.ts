import type { LocalOrRemoteConversationId } from "protocol";

import { terminalService } from "@/terminal/terminal-service";
/**
 * Resolves or creates a stable terminal session for a conversation/worktree so it survives navigation.
 */
export function useTerminalSessionId({
  conversationId,
  hostId,
  cwd,
}: {
  conversationId?: LocalOrRemoteConversationId | null;
  hostId?: string | null;
  cwd: string | null;
}): string | undefined {
  if (conversationId == null) {
    return undefined;
  }
  const existing = terminalService.getSessionForConversation(conversationId);
  if (existing) {
    return existing;
  }
  // If we haven't already created/mapped a session, use the worktree's stable id. Once a session
  // is mapped, keep it stable to avoid terminal recreation churn (xterm can throw when
  // created/disposed within the same tick).
  return terminalService.ensureConversationSession(conversationId, cwd, hostId);
}
