import { createConversationSearchUnitKey } from "./highlight-marks";
import type { SearchMatch } from "./types";

export function groupConversationMatchesByUnit(
  matches: Array<SearchMatch>,
): Map<string, Array<SearchMatch>> {
  const matchesByUnitKey = new Map<string, Array<SearchMatch>>();
  for (const match of matches) {
    if (match.location.domain !== "conversation") {
      continue;
    }
    const key = createConversationSearchUnitKey(
      match.location.turnKey,
      match.location.unitId,
    );
    const unitMatches = matchesByUnitKey.get(key) ?? Array<SearchMatch>();
    unitMatches.push(match);
    matchesByUnitKey.set(key, unitMatches);
  }
  return matchesByUnitKey;
}

export function groupDiffMatchesByPath(
  matches: Array<SearchMatch>,
): Map<string, Array<SearchMatch>> {
  const matchesByPath = new Map<string, Array<SearchMatch>>();
  for (const match of matches) {
    if (match.location.domain !== "diff") {
      continue;
    }
    const pathMatches =
      matchesByPath.get(match.location.path) ?? Array<SearchMatch>();
    pathMatches.push(match);
    matchesByPath.set(match.location.path, pathMatches);
  }
  return matchesByPath;
}
