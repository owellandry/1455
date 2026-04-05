import {
  isHeartbeatAutomation,
  type Automation,
  type ConversationId,
} from "protocol";

import { useConversationsMeta } from "@/app-server/app-server-manager-hooks";
import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";
import { useFetchFromVSCode } from "@/vscode-api";

export type HeartbeatAutomationThreadOption = {
  threadId: ConversationId;
  title: string;
  createdAt: number | null;
  isPinned: boolean;
  isUnavailable: boolean;
};

function isLocalThreadHost(hostId: string | undefined): boolean {
  return hostId == null || hostId === "local";
}

export function useHeartbeatAutomationThreadOptions(
  selectedThreadId: string | null,
): {
  options: Array<HeartbeatAutomationThreadOption>;
  hasPinnedThreads: boolean;
} {
  const { data: automationsData } = useFetchFromVSCode("list-automations", {});
  const { data: pinnedThreadsData } = useFetchFromVSCode(
    "list-pinned-threads",
    {},
  );
  const { data: conversations } = useConversationsMeta();
  const activeHeartbeatThreadIds = new Set(
    (automationsData?.items ?? []).flatMap((automation: Automation) => {
      if (
        !isHeartbeatAutomation(automation) ||
        automation.status !== "ACTIVE" ||
        automation.targetThreadId.trim().length === 0 ||
        automation.targetThreadId === selectedThreadId
      ) {
        return [];
      }
      return [automation.targetThreadId];
    }),
  );

  const localConversationById = new Map(
    (conversations ?? [])
      .filter((conversation) => isLocalThreadHost(conversation.hostId))
      .map((conversation) => [String(conversation.id), conversation] as const),
  );
  const pinnedThreadIds = pinnedThreadsData?.threadIds ?? [];
  const pinnedThreadIdSet = new Set(pinnedThreadIds);
  const options: Array<HeartbeatAutomationThreadOption> =
    pinnedThreadIds.flatMap((threadId) => {
      const conversation = localConversationById.get(threadId);
      if (conversation == null) {
        return [];
      }
      return [
        {
          threadId: conversation.id,
          title: getLocalConversationTitle(conversation) ?? threadId,
          createdAt: conversation.createdAt ?? null,
          isPinned: true,
          isUnavailable: activeHeartbeatThreadIds.has(threadId),
        },
      ];
    });

  if (
    selectedThreadId != null &&
    selectedThreadId.length > 0 &&
    !pinnedThreadIdSet.has(selectedThreadId)
  ) {
    const conversation = localConversationById.get(selectedThreadId);
    options.unshift({
      threadId: (conversation?.id ?? selectedThreadId) as ConversationId,
      title:
        (conversation != null
          ? getLocalConversationTitle(conversation)
          : null) ?? selectedThreadId,
      createdAt: conversation?.createdAt ?? null,
      isPinned: false,
      isUnavailable: activeHeartbeatThreadIds.has(selectedThreadId),
    });
  }

  return {
    options,
    hasPinnedThreads: options.some((option) => option.isPinned),
  };
}
