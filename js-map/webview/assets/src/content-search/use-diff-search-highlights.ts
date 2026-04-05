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
import { groupDiffMatchesByPath } from "@/content-search/highlight-selectors";
import {
  contentSearchActiveDiffResult$,
  contentSearchActiveMatch$,
} from "@/content-search/search-model";
import { useMutationHighlightDebouncer } from "@/content-search/use-mutation-highlight-debouncer";

const MUTATION_REHIGHLIGHT_DELAY_MS = 120;

export function useDiffSearchHighlights({
  containerRef,
}: {
  containerRef: RefObject<HTMLElement | null>;
}): void {
  const activeDiffResult = useSignal(contentSearchActiveDiffResult$);
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
      includeShadowRoots: true,
    });

    const previousActiveElement = activeMatchElementRef.current;
    if (previousActiveElement != null) {
      previousActiveElement.classList.remove(CONTENT_SEARCH_ACTIVE_CLASS);
      activeMatchElementRef.current = null;
    }

    if (activeDiffResult == null) {
      return;
    }

    const matchesByPath = groupDiffMatchesByPath(activeDiffResult.matches);
    const matchElementById = new Map<string, HTMLElement>();
    const fileElements =
      container.querySelectorAll<HTMLElement>("[data-review-path]");
    fileElements.forEach((fileElement) => {
      const path = fileElement.dataset.reviewPath;
      if (path == null) {
        return;
      }

      const sourceMatches = matchesByPath.get(path);
      if (sourceMatches == null || sourceMatches.length === 0) {
        return;
      }

      const highlightedMatches = highlightQueryInTarget({
        target: fileElement,
        query: activeDiffResult.query,
        maxMatches: sourceMatches.length,
        includeShadowRoots: true,
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
  }, [activeDiffResult?.runId, activeMatchId, cancel, containerRef, schedule]);
}
