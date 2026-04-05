import path from "path";

import type * as AppServer from "app-server-types";
import type { ThreadTitleState } from "protocol";

import type { ThreadSearchResult } from "../app-server-manager-types";

type ThreadSearchCandidate = ThreadSearchResult & {
  normalizedCwd: string;
  normalizedPreview: string;
  normalizedRepoLabel: string;
  normalizedSearchText: string;
  normalizedTitle: string;
  preview: string;
  repoLabel: string;
};

type ThreadSearchMatch = {
  fieldPriority: number;
  gapCount: number;
  matchKind: number;
  startIndex: number;
};

export const THREAD_SEARCH_FILTERED_CANDIDATE_LIMIT = 15;

export function getThreadTitle(
  thread: AppServer.v2.Thread,
  persistedTitles: ThreadTitleState,
): string | null {
  const threadName = thread.name?.trim() ?? "";

  if (threadName.length > 0) {
    return threadName;
  }

  const persistedTitle = persistedTitles.titles[thread.id]?.trim() ?? "";
  if (persistedTitle.length > 0) {
    return persistedTitle;
  }

  return null;
}

export function getThreadListTitle(
  thread: AppServer.v2.Thread,
  persistedTitles: ThreadTitleState,
): string {
  const title =
    getThreadTitle(thread, persistedTitles) ?? thread.preview.trim() ?? "";

  if (title.length > 0) {
    return title;
  }

  return thread.id;
}

export function buildThreadSearchResult(
  thread: AppServer.v2.Thread,
  persistedTitles: ThreadTitleState,
): ThreadSearchResult {
  return toThreadSearchResult(
    buildThreadSearchCandidate(thread, persistedTitles),
  );
}

export function rankThreadSearchResults(
  threads: Array<AppServer.v2.Thread>,
  persistedTitles: ThreadTitleState,
  searchTerm: string,
  limit: number,
): Array<ThreadSearchResult> {
  const searchTokens = getSearchTokens(searchTerm);

  return threads
    .map((thread) => buildThreadSearchCandidate(thread, persistedTitles))
    .map((candidate) => ({
      candidate,
      match: getThreadSearchMatch(candidate, searchTokens),
    }))
    .filter(
      (
        entry,
      ): entry is {
        candidate: ThreadSearchCandidate;
        match: ThreadSearchMatch;
      } => entry.match != null,
    )
    .sort((a, b) => {
      const fieldPriorityDiff = a.match.fieldPriority - b.match.fieldPriority;
      if (fieldPriorityDiff !== 0) {
        return fieldPriorityDiff;
      }

      const matchKindDiff = a.match.matchKind - b.match.matchKind;
      if (matchKindDiff !== 0) {
        return matchKindDiff;
      }

      const gapCountDiff = a.match.gapCount - b.match.gapCount;
      if (gapCountDiff !== 0) {
        return gapCountDiff;
      }

      const startIndexDiff = a.match.startIndex - b.match.startIndex;
      if (startIndexDiff !== 0) {
        return startIndexDiff;
      }

      return b.candidate.updatedAt - a.candidate.updatedAt;
    })
    .slice(0, limit)
    .map(({ candidate }) => toThreadSearchResult(candidate));
}

function buildThreadSearchCandidate(
  thread: AppServer.v2.Thread,
  persistedTitles: ThreadTitleState,
): ThreadSearchCandidate {
  const updatedAtMs = Number(thread.updatedAt) * 1000;
  const title = getThreadListTitle(thread, persistedTitles);
  const preview = thread.preview.trim();
  const repoLabel = path.basename(thread.cwd) || thread.cwd;

  return {
    threadId: thread.id,
    title,
    cwd: thread.cwd,
    updatedAt: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
    preview,
    repoLabel,
    normalizedCwd: thread.cwd.toLocaleLowerCase(),
    normalizedPreview: preview.toLocaleLowerCase(),
    normalizedRepoLabel: repoLabel.toLocaleLowerCase(),
    normalizedSearchText: [title, repoLabel, thread.cwd, preview]
      .join(" ")
      .toLocaleLowerCase(),
    normalizedTitle: title.toLocaleLowerCase(),
  };
}

function toThreadSearchResult(
  candidate: ThreadSearchCandidate,
): ThreadSearchResult {
  return {
    threadId: candidate.threadId,
    title: candidate.title,
    cwd: candidate.cwd,
    updatedAt: candidate.updatedAt,
  };
}

function getSearchTokens(searchTerm: string): Array<string> {
  return searchTerm
    .toLocaleLowerCase()
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function getThreadSearchMatch(
  candidate: ThreadSearchCandidate,
  searchTokens: Array<string>,
): ThreadSearchMatch | null {
  const fields = [
    candidate.normalizedTitle,
    candidate.normalizedRepoLabel,
    candidate.normalizedCwd,
    candidate.normalizedPreview,
    candidate.normalizedSearchText,
  ];

  let bestMatch: ThreadSearchMatch | null = null;

  for (const [fieldPriority, fieldValue] of fields.entries()) {
    const match = getFieldMatch(fieldValue, searchTokens, fieldPriority);
    if (!match) {
      continue;
    }
    if (!bestMatch || compareThreadSearchMatch(match, bestMatch) < 0) {
      bestMatch = match;
    }
  }

  return bestMatch;
}

function getFieldMatch(
  value: string,
  searchTokens: Array<string>,
  fieldPriority: number,
): ThreadSearchMatch | null {
  if (value.length === 0) {
    return null;
  }

  let worstMatchKind = 0;
  let totalGapCount = 0;
  let firstStartIndex = Number.POSITIVE_INFINITY;

  for (const token of searchTokens) {
    const tokenMatch = getTokenMatch(value, token);
    if (!tokenMatch) {
      return null;
    }

    worstMatchKind = Math.max(worstMatchKind, tokenMatch.matchKind);
    totalGapCount += tokenMatch.gapCount;
    firstStartIndex = Math.min(firstStartIndex, tokenMatch.startIndex);
  }

  return {
    fieldPriority,
    gapCount: totalGapCount,
    matchKind: worstMatchKind,
    startIndex: firstStartIndex,
  };
}

function getTokenMatch(
  value: string,
  token: string,
): { gapCount: number; matchKind: number; startIndex: number } | null {
  if (value === token) {
    return { matchKind: 0, gapCount: 0, startIndex: 0 };
  }

  if (value.startsWith(token)) {
    return { matchKind: 1, gapCount: 0, startIndex: 0 };
  }

  const substringIndex = value.indexOf(token);
  if (substringIndex !== -1) {
    return { matchKind: 2, gapCount: 0, startIndex: substringIndex };
  }

  return getSubsequenceMatch(value, token);
}

function getSubsequenceMatch(
  value: string,
  token: string,
): { gapCount: number; matchKind: number; startIndex: number } | null {
  let valueIndex = 0;
  let startIndex = -1;
  let previousMatchIndex = -1;
  let gapCount = 0;

  for (const character of token) {
    const nextIndex = value.indexOf(character, valueIndex);
    if (nextIndex === -1) {
      return null;
    }

    if (startIndex === -1) {
      startIndex = nextIndex;
    }
    if (previousMatchIndex !== -1) {
      gapCount += nextIndex - previousMatchIndex - 1;
    }

    previousMatchIndex = nextIndex;
    valueIndex = nextIndex + 1;
  }

  return {
    matchKind: 3,
    gapCount,
    startIndex,
  };
}

function compareThreadSearchMatch(
  left: ThreadSearchMatch,
  right: ThreadSearchMatch,
): number {
  const fieldPriorityDiff = left.fieldPriority - right.fieldPriority;
  if (fieldPriorityDiff !== 0) {
    return fieldPriorityDiff;
  }

  const matchKindDiff = left.matchKind - right.matchKind;
  if (matchKindDiff !== 0) {
    return matchKindDiff;
  }

  const gapCountDiff = left.gapCount - right.gapCount;
  if (gapCountDiff !== 0) {
    return gapCountDiff;
  }

  return left.startIndex - right.startIndex;
}
