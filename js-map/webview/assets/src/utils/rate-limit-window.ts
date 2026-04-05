import type { RateLimitWindowSnapshot } from "protocol";

export type RateLimitWindowDetails = {
  usedPercent: number;
  windowMinutes: number | null;
  resetAt: number | null;
};

const SECONDS_PER_MINUTE = 60;

export function getRateLimitWindowDetails(
  windowSnapshot: RateLimitWindowSnapshot | null | undefined,
): RateLimitWindowDetails | null {
  if (windowSnapshot == null) {
    return null;
  }

  return {
    usedPercent: windowSnapshot.used_percent ?? 0,
    windowMinutes:
      windowSnapshot.limit_window_seconds != null
        ? windowSnapshot.limit_window_seconds / SECONDS_PER_MINUTE
        : null,
    resetAt: windowSnapshot.reset_at ?? null,
  };
}
