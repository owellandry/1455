import { atom } from "jotai";

const EMPTY_PINNED_THREADS_KEY = "";

export function buildPinnedThreadsHydrationKey(
  threadIds: Array<string> | undefined,
): string {
  if (!threadIds || threadIds.length === 0) {
    return EMPTY_PINNED_THREADS_KEY;
  }
  return [...threadIds].sort().join("|");
}

export const aPinnedThreadsHydratedKey = atom<string>(EMPTY_PINNED_THREADS_KEY);
