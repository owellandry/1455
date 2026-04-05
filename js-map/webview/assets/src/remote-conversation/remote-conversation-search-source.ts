import type { MessageOutputItem, TextMessageContent } from "protocol";

import {
  createConversationSearchSource,
  type ConversationSearchTurn,
} from "@/content-search/conversation-source";
import { markdownToSearchText } from "@/content-search/markdown-to-search-text";
import type { SearchSource } from "@/content-search/source";
import type {
  ConversationScrollAdapter,
  SearchContextId,
} from "@/content-search/types";

import type { TurnTreeNode } from "./turn-tree";

export function createRemoteConversationSearchSource({
  getGroupings,
  routeContextId,
  scrollAdapter,
}: {
  getGroupings: () => Array<{ node: TurnTreeNode; activeId: string | null }>;
  routeContextId: SearchContextId;
  scrollAdapter: ConversationScrollAdapter;
}): SearchSource {
  return createConversationSearchSource({
    contextId: routeContextId,
    getTurns: () => {
      return getGroupings().flatMap(({ node, activeId }) => {
        const userText = messageContentToString(
          node.userTurn.input_items.filter(
            (item): item is MessageOutputItem => item.type === "message",
          ),
        );
        const activeAssistant =
          node.assistantTurns.find((turn) => turn.id === activeId) ??
          node.assistantTurns[0] ??
          null;
        const assistantText =
          activeAssistant == null
            ? ""
            : markdownToSearchText(
                messageContentToString(
                  activeAssistant.output_items.filter(
                    (item): item is MessageOutputItem =>
                      item.type === "message",
                  ),
                ),
              );

        const searchTurns = Array<ConversationSearchTurn>();
        if (userText.trim().length > 0) {
          searchTurns.push({
            turnKey: `user:${node.userTurn.id}`,
            units: [{ unitId: "message", text: userText }],
          });
        }
        if (activeAssistant != null && assistantText.trim().length > 0) {
          searchTurns.push({
            turnKey: `assistant:${activeAssistant.id}`,
            units: [{ unitId: "message", text: assistantText }],
          });
        }
        return searchTurns;
      });
    },
    scrollAdapter,
  });
}

function messageContentToString(items: Array<MessageOutputItem>): string {
  return items
    .flatMap((item) => {
      return item.content.filter((content): content is TextMessageContent => {
        return content.content_type === "text";
      });
    })
    .map((item) => item.text)
    .join("");
}
