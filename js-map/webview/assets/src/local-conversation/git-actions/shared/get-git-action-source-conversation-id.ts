import type * as AppServer from "app-server-types";
import type { ConversationId } from "protocol";

import { getContextUsageStats } from "@/composer/context-usage-stats";

const FORK_THREAD_CONTEXT_USAGE_PERCENT_THRESHOLD = 80;

export function getGitActionSourceConversationId({
  conversationId,
  tokenUsageInfo,
}: {
  conversationId: ConversationId | null;
  tokenUsageInfo: AppServer.v2.ThreadTokenUsage | null;
}): ConversationId | null {
  if (conversationId == null) {
    return null;
  }

  const { percent } = getContextUsageStats(tokenUsageInfo);
  if (
    percent == null ||
    percent < FORK_THREAD_CONTEXT_USAGE_PERCENT_THRESHOLD
  ) {
    return conversationId;
  }

  return null;
}
