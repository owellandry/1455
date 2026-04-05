import type { RateLimitWindow } from "app-server-types/v2";

import {
  hasRenderableRateLimitWindow,
  MINUTES_IN_DAY,
  MINUTES_IN_HOUR,
  MINUTES_IN_WEEK,
} from "@/rate-limits/rate-limit-format";
import type { RateLimitEntry } from "@/utils/use-rate-limit";

export type RateLimitRow = {
  key: string;
  bucket: RateLimitWindow;
  limitName: string | null;
};

const FIVE_HOUR_WINDOW_MINUTES = 5 * MINUTES_IN_HOUR;
const WEEKLY_WINDOW_MINUTES = MINUTES_IN_WEEK;

export function getUsageLimitRowsForRateLimitEntries(
  entries: Array<RateLimitEntry>,
): Array<RateLimitRow> {
  return entries.flatMap((entry, index) => {
    return getUsageLimitRowsForRateLimitEntry({
      entry,
      keyPrefix: `rate-limit-${index}`,
    });
  });
}

export function getUsageLimitRowsForRateLimitEntry({
  entry,
  keyPrefix,
}: {
  entry: RateLimitEntry;
  keyPrefix: string;
}): Array<RateLimitRow> {
  const windows = [entry.snapshot.primary, entry.snapshot.secondary].filter(
    hasRenderableRateLimitWindow,
  );
  if (windows.length === 0) {
    return [];
  }

  const rows: Array<RateLimitRow> = [];
  const fiveHourBucket = pickClosestRateLimitWindow(
    windows.filter(
      (window) => (window.windowDurationMins ?? 0) < MINUTES_IN_DAY,
    ),
    FIVE_HOUR_WINDOW_MINUTES,
  );
  if (fiveHourBucket) {
    rows.push({
      key: `${keyPrefix}-five-hour`,
      bucket: fiveHourBucket,
      limitName: entry.limitName,
    });
  }

  const weeklyBucket = pickClosestRateLimitWindow(
    windows.filter(
      (window) =>
        window !== fiveHourBucket &&
        (window.windowDurationMins ?? 0) >= MINUTES_IN_DAY,
    ),
    WEEKLY_WINDOW_MINUTES,
  );
  if (weeklyBucket) {
    rows.push({
      key: `${keyPrefix}-weekly`,
      bucket: weeklyBucket,
      limitName: entry.limitName,
    });
  }

  return rows;
}

function pickClosestRateLimitWindow(
  windows: Array<RateLimitWindow>,
  targetWindowMinutes: number,
): RateLimitWindow | null {
  if (windows.length === 0) {
    return null;
  }

  return windows.reduce((closestWindow, candidateWindow) => {
    const closestDistance = Math.abs(
      (closestWindow.windowDurationMins ?? 0) - targetWindowMinutes,
    );
    const candidateDistance = Math.abs(
      (candidateWindow.windowDurationMins ?? 0) - targetWindowMinutes,
    );
    if (candidateDistance < closestDistance) {
      return candidateWindow;
    }
    if (candidateDistance > closestDistance) {
      return closestWindow;
    }
    if (
      (candidateWindow.windowDurationMins ?? 0) >
      (closestWindow.windowDurationMins ?? 0)
    ) {
      return candidateWindow;
    }
    return closestWindow;
  });
}
