import type { ConversationId } from "protocol";

import { fetchFromVSCode } from "@/vscode-api";

export async function transferThreadPin({
  sourceConversationId,
  targetConversationId,
}: {
  sourceConversationId: ConversationId;
  targetConversationId: ConversationId;
}): Promise<void> {
  if (sourceConversationId === targetConversationId) {
    return;
  }

  const { threadIds } = await fetchFromVSCode("list-pinned-threads", {});
  const sourceIndex = threadIds.indexOf(sourceConversationId);
  if (sourceIndex === -1) {
    return;
  }

  const nextThreadIds = threadIds
    .map((threadId) =>
      threadId === sourceConversationId ? targetConversationId : threadId,
    )
    .filter((threadId, index, ids) => ids.indexOf(threadId) === index);

  await fetchFromVSCode("set-pinned-threads-order", {
    params: { threadIds: nextThreadIds },
  });
}
