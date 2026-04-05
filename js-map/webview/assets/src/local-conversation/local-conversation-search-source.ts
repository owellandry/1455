import findLastIndex from "lodash/findLastIndex";

import type { AppServerConversationState } from "@/app-server/app-server-manager-types";
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
import {
  hasRenderableLocalConversationTurn,
  mapStateToLocalConversationItems,
} from "@/local-conversation/items/map-mcp-conversation-turn";

export function createLocalConversationSearchSource({
  getConversationState,
  getIsBackgroundSubagentsEnabled,
  routeContextId,
  scrollAdapter,
}: {
  getConversationState: () => {
    turns: AppServerConversationState["turns"];
  } | null;
  getIsBackgroundSubagentsEnabled: () => boolean;
  routeContextId: SearchContextId;
  scrollAdapter: ConversationScrollAdapter;
}): SearchSource {
  return createConversationSearchSource({
    contextId: routeContextId,
    getTurns: () => {
      const currentConversationState = getConversationState();
      if (currentConversationState == null) {
        return [];
      }

      return currentConversationState.turns
        .map((turn, index) => {
          if (
            !hasRenderableLocalConversationTurn(turn, [], {
              isBackgroundSubagentsEnabled: getIsBackgroundSubagentsEnabled(),
            })
          ) {
            return null;
          }
          const turnKey = getLocalTurnSearchKey(turn.turnId, index);
          const mappedTurn = mapStateToLocalConversationItems(turn, [], {
            isBackgroundSubagentsEnabled: getIsBackgroundSubagentsEnabled(),
          });

          return {
            turnKey,
            units: mapLocalConversationMessageItemsToSearchUnits(
              mappedTurn.items,
            ),
          };
        })
        .filter((turn): turn is ConversationSearchTurn => turn != null);
    },
    scrollAdapter,
  });
}

export function getLocalTurnSearchKey(
  turnId: string | null | undefined,
  index: number,
): string {
  if (turnId != null) {
    return turnId;
  }
  return `turn-index-${index}`;
}

function mapLocalConversationMessageItemsToSearchUnits(
  items: ReturnType<typeof mapStateToLocalConversationItems>["items"],
): Array<{
  unitId: string;
  text: string;
}> {
  const units = Array<{ unitId: string; text: string }>();
  const lastAssistantIndex = findLastIndex(
    items,
    (item) => item.type === "assistant-message",
  );

  items.forEach((item, itemIndex) => {
    if (item.type === "user-message") {
      const text = item.message.trim();
      if (text.length === 0) {
        return;
      }
      units.push({
        unitId: `${itemIndex}:user`,
        text,
      });
      return;
    }

    if (item.type !== "assistant-message") {
      return;
    }
    if (itemIndex !== lastAssistantIndex) {
      return;
    }

    const text = markdownToSearchText(item.content);
    if (text.length === 0) {
      return;
    }
    units.push({
      unitId: `${itemIndex}:assistant`,
      text,
    });
  });

  return units;
}
