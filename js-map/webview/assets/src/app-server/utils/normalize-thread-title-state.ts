import type { ThreadTitleState } from "protocol";

import { pruneThreadTitleState } from "./prune-thread-title-state";

export function normalizeThreadTitleState(
  value: unknown,
  maxEntries: number,
): ThreadTitleState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { titles: {}, order: [] };
  }
  const candidate = value as Partial<ThreadTitleState> & {
    titles?: unknown;
    order?: unknown;
  };
  const titles: Record<string, string> = {};
  if (candidate.titles && typeof candidate.titles === "object") {
    for (const [key, entry] of Object.entries(candidate.titles)) {
      if (typeof entry === "string" && entry.trim().length > 0) {
        titles[key] = entry;
      }
    }
  } else {
    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry === "string" && entry.trim().length > 0) {
        titles[key] = entry;
      }
    }
  }
  const order = Array.isArray(candidate.order)
    ? candidate.order.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry in titles,
      )
    : [];
  for (const key of Object.keys(titles)) {
    if (!order.includes(key)) {
      order.push(key);
    }
  }
  return pruneThreadTitleState({ titles, order }, maxEntries);
}
