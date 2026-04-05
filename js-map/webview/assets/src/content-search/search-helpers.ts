import type { SearchMatch, SearchResult } from "./types";

const SNIPPET_CONTEXT_CHARS = 24;

export function createSnippet(
  text: string,
  matchStart: number,
  matchEnd: number,
): SearchResult["matches"][number]["snippet"] {
  const snippetStart = Math.max(0, matchStart - SNIPPET_CONTEXT_CHARS);
  const snippetEnd = Math.min(text.length, matchEnd + SNIPPET_CONTEXT_CHARS);

  return {
    before: text.slice(snippetStart, matchStart),
    match: text.slice(matchStart, matchEnd),
    after: text.slice(matchEnd, snippetEnd),
  };
}

export function findMatchOffsets(
  text: string,
  query: string,
  maxMatches: number,
): {
  offsets: Array<{ start: number; end: number }>;
  totalMatches: number;
  isCapped: boolean;
} {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  const offsets: Array<{ start: number; end: number }> = [];
  let totalMatches = 0;
  let isCapped = false;
  let searchFrom = 0;

  while (searchFrom < lowerText.length) {
    const matchStart = lowerText.indexOf(lowerQuery, searchFrom);
    if (matchStart === -1) {
      break;
    }

    const matchEnd = matchStart + query.length;
    totalMatches += 1;

    if (offsets.length < maxMatches) {
      offsets.push({ start: matchStart, end: matchEnd });
    } else {
      isCapped = true;
    }

    searchFrom = matchEnd;
  }

  return { offsets, totalMatches, isCapped };
}

export function getActiveMatch(
  result: SearchResult | null,
  activeIndex: number | null,
): SearchMatch | null {
  if (result == null || activeIndex == null) {
    return null;
  }
  return result.matches[activeIndex] ?? null;
}

export function getActiveResultForDomain<T extends "conversation" | "diff">(
  params: {
    query: string;
    routeContextId: string;
    stateDomain: string;
    result: SearchResult | null;
  },
  domain: T,
): SearchResult | null {
  const { query, routeContextId, stateDomain, result } = params;
  if (query.length === 0) {
    return null;
  }
  if (stateDomain !== domain) {
    return null;
  }
  if (result == null || result.domain !== domain) {
    return null;
  }
  if (result.contextId !== routeContextId) {
    return null;
  }
  return result;
}
