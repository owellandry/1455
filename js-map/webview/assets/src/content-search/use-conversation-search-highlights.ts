import { useSignal } from "maitai";
import type { RefObject } from "react";
import { useEffect, useEffectEvent, useRef } from "react";

import {
  CONTENT_SEARCH_ACTIVE_CLASS,
  clearSearchHighlights,
  highlightQueryInTarget,
  setSearchMatchElementId,
  shouldHandleMutationEvent,
} from "@/content-search/highlight-marks";
import { groupConversationMatchesByUnit } from "@/content-search/highlight-selectors";
import {
  contentSearchActiveConversationResult$,
  contentSearchActiveMatch$,
} from "@/content-search/search-model";
import { useMutationHighlightDebouncer } from "@/content-search/use-mutation-highlight-debouncer";

const MUTATION_REHIGHLIGHT_DELAY_MS = 80;

export function useConversationSearchHighlights({
  containerRef,
}: {
  containerRef: RefObject<HTMLElement | null>;
}): void {
  const activeConversationResult = useSignal(
    contentSearchActiveConversationResult$,
  );
  const activeMatch = useSignal(contentSearchActiveMatch$);
  const activeMatchId = activeMatch?.id ?? null;
  const activeMatchElementRef = useRef<HTMLElement | null>(null);
  const { schedule, cancel } = useMutationHighlightDebouncer(
    MUTATION_REHIGHLIGHT_DELAY_MS,
  );

  const applyHighlights = useEffectEvent(() => {
    const container = containerRef.current;
    if (container == null) {
      return;
    }

    clearSearchHighlights(container, {
      includeShadowRoots: false,
    });

    const previousActiveElement = activeMatchElementRef.current;
    if (previousActiveElement != null) {
      previousActiveElement.classList.remove(CONTENT_SEARCH_ACTIVE_CLASS);
      activeMatchElementRef.current = null;
    }

    if (activeConversationResult == null) {
      return;
    }

    const matchesByUnitKey = groupConversationMatchesByUnit(
      activeConversationResult.matches,
    );
    const matchElementById = new Map<string, HTMLElement>();
    const unitElements = container.querySelectorAll<HTMLElement>(
      "[data-content-search-unit-key]",
    );
    unitElements.forEach((unitElement) => {
      const unitKey = unitElement.dataset.contentSearchUnitKey;
      if (unitKey == null) {
        return;
      }

      const sourceMatches = matchesByUnitKey.get(unitKey);
      if (sourceMatches == null || sourceMatches.length === 0) {
        return;
      }

      const highlightedMatches = highlightQueryInTarget({
        target: unitElement,
        query: activeConversationResult.query,
        maxMatches: sourceMatches.length,
        includeShadowRoots: false,
      });
      highlightedMatches.matches.forEach((highlightedElement, index) => {
        const sourceMatch = sourceMatches[index];
        if (sourceMatch == null) {
          return;
        }
        setSearchMatchElementId({
          element: highlightedElement,
          matchId: sourceMatch.id,
        });
        matchElementById.set(sourceMatch.id, highlightedElement);
      });
    });

    if (activeMatchId == null) {
      return;
    }

    const activeMatchElement = matchElementById.get(activeMatchId);
    if (activeMatchElement == null) {
      return;
    }

    activeMatchElement.classList.add(CONTENT_SEARCH_ACTIVE_CLASS);
    activeMatchElementRef.current = activeMatchElement;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (container == null) {
      return;
    }

    applyHighlights();

    const observer = new MutationObserver((records) => {
      if (!shouldHandleMutationEvent(records)) {
        return;
      }
      schedule(applyHighlights);
    });
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return (): void => {
      observer.disconnect();
      cancel();
    };
  }, [
    activeConversationResult?.runId,
    activeMatchId,
    cancel,
    containerRef,
    schedule,
  ]);
}
