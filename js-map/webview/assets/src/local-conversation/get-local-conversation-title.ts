import type * as AppServer from "app-server-types";
import type { ConversationId } from "protocol";

import type { AppServerConversationState } from "@/app-server/app-server-manager-types";
import { extractPromptRequest } from "@/prompts/render-prompt";

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\([^)]+\)/g;

/** Converts markdown links into plain labels for sidebar titles. */
export function toSidebarTitle(raw: string): string {
  return raw.replace(MARKDOWN_LINK_PATTERN, "$1");
}

export function getLocalConversationTitle(
  conversationState: AppServerConversationState | null,
  parentConversationState?: AppServerConversationState | null,
): string | null {
  if (!conversationState) {
    return null;
  }
  const explicitTitle = conversationState.title?.trim() ?? "";
  if (explicitTitle.length > 0) {
    return toSidebarTitle(explicitTitle);
  }
  const firstTurnInput = conversationState.turns[0]?.params?.input ?? [];
  const firstPrompt = firstTurnInput
    .filter(
      (item): item is Extract<AppServer.v2.UserInput, { type: "text" }> =>
        item.type === "text",
    )
    .map((item) => item.text)
    .join("")
    .trim();
  const title = extractPromptRequest(firstPrompt);
  const sidebarTitle = toSidebarTitle(title);
  if (sidebarTitle) {
    return sidebarTitle;
  }

  return getSubagentTitleFromParentConversation(
    conversationState.id,
    parentConversationState,
  );
}

export function getSubagentTitleFromParentConversation(
  conversationId: ConversationId,
  parentConversationState:
    | {
        turns: AppServerConversationState["turns"];
      }
    | null
    | undefined,
): string | null {
  if (parentConversationState == null) {
    return null;
  }

  for (
    let turnIndex = parentConversationState.turns.length - 1;
    turnIndex >= 0;
    turnIndex -= 1
  ) {
    const turn = parentConversationState.turns[turnIndex];
    if (turn == null) {
      continue;
    }

    for (const item of turn.items ?? []) {
      if (item?.type !== "collabAgentToolCall") {
        continue;
      }
      if (!item.receiverThreadIds.includes(conversationId)) {
        continue;
      }

      const prompt = item.prompt?.trim() ?? "";
      if (prompt.length === 0) {
        continue;
      }

      const title = toSidebarTitle(extractPromptRequest(prompt));
      if (title) {
        return title;
      }
    }
  }

  return null;
}
