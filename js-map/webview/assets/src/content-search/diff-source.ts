import { createDiffSearchMatchId } from "./highlight-marks";
import { scrollToMatchInContainer } from "./scroll-to-match";
import { createSnippet, findMatchOffsets } from "./search-helpers";
import type { SearchSource } from "./source";
import type {
  DiffScrollAdapter,
  SearchContextId,
  SearchRequest,
  SearchResult,
} from "./types";

const MAX_SEARCH_MATCHES = 250;

export type DiffSearchHunk = {
  hunkId: string;
  lineStart: number;
  lineEnd: number;
  text: string;
};

export type DiffSearchFile = {
  path: string;
  hunks: Array<DiffSearchHunk>;
};

export function createDiffSearchSource({
  contextId,
  getFiles,
  scrollAdapter,
}: {
  contextId: SearchContextId;
  getFiles: () => Array<DiffSearchFile>;
  scrollAdapter: DiffScrollAdapter;
}): SearchSource {
  return {
    domain: "diff",
    contextId,
    async search(request): Promise<Omit<SearchResult, "runId">> {
      if (request.query.trim().length === 0) {
        return searchDiffFiles(request, []);
      }

      return searchDiffFiles(request, getFiles());
    },
    async ensureVisible(location, options): Promise<void> {
      if (location.domain !== "diff") {
        return;
      }
      if (location.contextId !== contextId) {
        return;
      }

      let container = scrollAdapter.getFileContainer(location.path);
      if (container == null) {
        await scrollAdapter.scrollToFile(location.path);
        container = scrollAdapter.getFileContainer(location.path);
      }
      if (container != null) {
        await scrollToMatchInContainer({
          container,
          matchId: createDiffSearchMatchId(location),
          includeShadowRoots: true,
          scrollBehavior: "auto",
          signal: options?.signal,
        });
      }
    },
  };
}

function searchDiffFiles(
  request: SearchRequest,
  files: Array<DiffSearchFile>,
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

  for (const file of files) {
    for (const hunk of file.hunks) {
      const text = hunk.text;
      if (text.length === 0) {
        continue;
      }

      const remainingBudget = MAX_SEARCH_MATCHES - matches.length;
      const {
        offsets,
        totalMatches: hunkTotal,
        isCapped: hunkCapped,
      } = findMatchOffsets(text, query, remainingBudget);

      totalMatches += hunkTotal;
      if (hunkCapped) {
        isCapped = true;
      }

      for (const { start, end } of offsets) {
        matchOrdinal += 1;
        matches.push({
          id: `diff:${file.path}:${hunk.hunkId}:${start}`,
          ordinal: matchOrdinal,
          location: {
            domain: "diff",
            contextId: request.contextId,
            path: file.path,
            hunkId: hunk.hunkId,
            lineStart: hunk.lineStart,
            lineEnd: hunk.lineEnd,
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
