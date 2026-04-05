import { persistedSignal } from "@/utils/persisted-signal";

export type DiffFilter = "branch" | "last-turn" | "staged" | "unstaged";

export type StageDiffFilter = Extract<DiffFilter, "staged" | "unstaged">;

export function isStageDiffFilter(
  diffFilter: DiffFilter,
): diffFilter is StageDiffFilter {
  return diffFilter === "staged" || diffFilter === "unstaged";
}

export const reviewDiffFilter$ = persistedSignal<DiffFilter>(
  "diff-filter",
  "unstaged",
);
