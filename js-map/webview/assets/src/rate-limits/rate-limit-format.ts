import type { RateLimitSnapshot, RateLimitWindow } from "app-server-types/v2";

export const MINUTES_IN_HOUR = 60;
export const MINUTES_IN_DAY = 24 * MINUTES_IN_HOUR;
export const MINUTES_IN_WEEK = 7 * MINUTES_IN_DAY;
const SECONDS_IN_DAY = 60 * MINUTES_IN_DAY;

export const WARNING_THRESHOLD = 90;
export const BLOCKED_THRESHOLD = 100;

export type RateLimitSeverity = "ok" | "warning" | "blocked";

export type RateLimitAlertData = {
  severity: "warning" | "blocked";
  usedPercent: number;
  remainingPercent: number;
  windowMinutes: number;
  /** Unix timestamp (seconds since epoch) when the window resets. */
  resetsAt: number | null;
};

export function hasRenderableRateLimitWindow(
  bucket: RateLimitWindow | null | undefined,
): bucket is RateLimitWindow {
  return bucket != null && (bucket.windowDurationMins ?? 0) > 0;
}

export function getSecondsUntilReset(
  resetsAtUnixSeconds: number | null,
  now: Date = new Date(),
): number | null {
  const target = toResetDate(resetsAtUnixSeconds);
  if (!target) {
    return null;
  }

  return Math.floor((target.getTime() - now.getTime()) / 1000);
}

export function getRateLimitAlertData(
  rateLimit: RateLimitSnapshot | null,
): RateLimitAlertData | null {
  const { primary, secondary } = rateLimit ?? {
    primary: null,
    secondary: null,
  };

  const primaryUsedPercent = primary?.usedPercent ?? 0;
  const secondaryUsedPercent = secondary?.usedPercent ?? 0;
  const primaryWindowMinutes = primary?.windowDurationMins ?? 0;
  const secondaryWindowMinutes = secondary?.windowDurationMins ?? 0;
  const maxUsedPercent = Math.max(primaryUsedPercent, secondaryUsedPercent);

  if (maxUsedPercent < WARNING_THRESHOLD) {
    return null;
  }
  /* tiebreak pick longer window */
  if (
    secondaryUsedPercent > primaryUsedPercent ||
    (primaryUsedPercent === secondaryUsedPercent &&
      secondaryWindowMinutes > primaryWindowMinutes)
  ) {
    return {
      severity: maxUsedPercent >= 100 ? "blocked" : "warning",
      usedPercent: secondaryUsedPercent,
      remainingPercent: getRemainingRateLimitPercent(secondaryUsedPercent),
      windowMinutes: secondaryWindowMinutes,
      resetsAt: secondary?.resetsAt ?? null,
    };
  } else if (maxUsedPercent === primaryUsedPercent) {
    return {
      severity: maxUsedPercent >= 100 ? "blocked" : "warning",
      usedPercent: primaryUsedPercent,
      remainingPercent: getRemainingRateLimitPercent(primaryUsedPercent),
      windowMinutes: primaryWindowMinutes,
      resetsAt: primary?.resetsAt ?? null,
    };
  }
  return null;
}

export function getRemainingRateLimitPercent(usedPercent: number): number {
  if (!Number.isFinite(usedPercent)) {
    return 100;
  }
  return Math.min(Math.max(100 - usedPercent, 0), 100);
}

export function formatResetLocalTime(
  resetsAt: number | null,
  now: Date = new Date(),
): string | null {
  const target = toResetDate(resetsAt);
  if (!target) {
    return null;
  }

  const seconds = Math.floor((target.getTime() - now.getTime()) / 1000);

  if (seconds <= 0) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
      0,
      "second",
    );
  }

  if (seconds < SECONDS_IN_DAY) {
    return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(
      target,
    );
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(target);
}

function toResetDate(resetsAtUnixSeconds: number | null): Date | null {
  if (resetsAtUnixSeconds == null || !Number.isFinite(resetsAtUnixSeconds)) {
    return null;
  }
  const milliseconds = resetsAtUnixSeconds * 1000;
  if (!Number.isFinite(milliseconds)) {
    return null;
  }
  return new Date(milliseconds);
}
