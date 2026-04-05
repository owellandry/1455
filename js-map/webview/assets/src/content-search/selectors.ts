import type { SearchResult } from "./types";

export type DiffSearchFilter = {
  active: boolean;
  totalMatches: number;
  matchingPaths: Array<string>;
};

export function selectDiffSearchFilter(
  result: SearchResult | null,
): DiffSearchFilter {
  if (result == null || result.domain !== "diff") {
    return {
      active: false,
      totalMatches: 0,
      matchingPaths: [],
    };
  }

  const matchingPathsSet = new Set<string>();
  for (const match of result.matches) {
    const location = match.location;
    if (location.domain !== "diff") {
      continue;
    }
    matchingPathsSet.add(location.path);
  }

  return {
    active: result.query.length > 0,
    totalMatches: result.totalMatches,
    matchingPaths: Array.from(matchingPathsSet),
  };
}
