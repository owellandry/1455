import type * as AppServer from "app-server-types";

export type ContextUsageStats = {
  percent: number | null;
  usedTokens: number | null;
  contextWindow: number | null;
  remainingTokens: number | null;
};

export function getContextUsageStats(
  tokenUsageInfo: AppServer.v2.ThreadTokenUsage | null,
): ContextUsageStats {
  const contextWindow = tokenUsageInfo?.modelContextWindow ?? null;
  const usedTokens = tokenUsageInfo?.last.totalTokens ?? null;
  if (
    contextWindow == null ||
    contextWindow <= 0 ||
    usedTokens == null ||
    usedTokens < 0
  ) {
    return {
      percent: null,
      usedTokens: null,
      contextWindow: null,
      remainingTokens: null,
    };
  }
  const clampedTokens = Math.min(usedTokens, contextWindow);
  const percent = (clampedTokens / contextWindow) * 100;
  if (!Number.isFinite(percent)) {
    return {
      percent: null,
      usedTokens: null,
      contextWindow: null,
      remainingTokens: null,
    };
  }
  return {
    percent,
    usedTokens: clampedTokens,
    contextWindow,
    remainingTokens: Math.max(contextWindow - clampedTokens, 0),
  };
}
