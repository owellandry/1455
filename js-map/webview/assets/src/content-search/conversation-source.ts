import { createConversationSearchMatchId } from "./highlight-marks";
import { scrollToMatchInContainer } from "./scroll-to-match";
import { createSnippet, findMatchOffsets } from "./search-helpers";
import type { SearchSource } from "./source";
import type {
  ConversationScrollAdapter,
  SearchContextId,
  SearchRequest,
  SearchResult,
} from "./types";

const MAX_SEARCH_MATCHES = 250;

export type ConversationSearchUnit = {
  unitId: string;
  text: string;
};

export type ConversationSearchTurn = {
  turnKey: string;
  units: Array<ConversationSearchUnit>;
};

export function createConversationSearchSource({
  contextId,
  getTurns,
  scrollAdapter,
}: {
  contextId: SearchContextId;
  getTurns: () => Array<ConversationSearchTurn>;
  scrollAdapter: ConversationScrollAdapter;
}): SearchSource {
  return {
    domain: "conversation",
    contextId,
    async search(request): Promise<Omit<SearchResult, "runId">> {
      return searchConversationTurns(request, getTurns());
    },
    async ensureVisible(location, options): Promise<void> {
      if (location.domain !== "conversation") {
        return;
      }
      if (location.contextId !== contextId) {
        return;
      }

      let container = scrollAdapter.getTurnContainer(location.turnKey);
      if (container == null) {
        await scrollAdapter.scrollToTurn(location.turnKey);
        container = scrollAdapter.getTurnContainer(location.turnKey);
      }
      if (container != null) {
        await scrollToMatchInContainer({
          container,
          matchId: createConversationSearchMatchId(location),
          includeShadowRoots: false,
          signal: options?.signal,
        });
      }
    },
  };
}

function searchConversationTurns(
  request: SearchRequest,
  turns: Array<ConversationSearchTurn>,
): Omit<SearchResult, "runId"> {
  const query = request.query.trim();
  if (query.length === 0) {
    return {
      domain: request.domain,
      contextId: request.contextId,
      query,
      matches: [],
      totalMatches: 0,
      isCapped: false,
    };
  }

  const matches: Array<SearchResult["matches"][number]> = [];
  let totalMatches = 0;
  let matchOrdinal = 0;
  let isCapped = false;

  for (const turn of turns) {
    for (const unit of turn.units) {
      const text = unit.text;
      if (text.length === 0) {
        continue;
      }

      const remainingBudget = MAX_SEARCH_MATCHES - matches.length;
      const {
        offsets,
        totalMatches: unitTotal,
        isCapped: unitCapped,
      } = findMatchOffsets(text, query, remainingBudget);

      totalMatches += unitTotal;
      if (unitCapped) {
        isCapped = true;
      }

      for (const { start, end } of offsets) {
        matchOrdinal += 1;
        matches.push({
          id: `conversation:${turn.turnKey}:${unit.unitId}:${start}`,
          ordinal: matchOrdinal,
          location: {
            domain: "conversation",
            contextId: request.contextId,
            turnKey: turn.turnKey,
            unitId: unit.unitId,
            start,
            end,
          },
          snippet: createSnippet(text, start, end),
        });
      }
    }
  }

  return {
    domain: request.domain,
    contextId: request.contextId,
    query,
    matches,
    totalMatches,
    isCapped,
  };
}
