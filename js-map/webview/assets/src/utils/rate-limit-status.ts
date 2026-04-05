import type {
  AdditionalRateLimitDetails,
  CreditsDetails,
  RateLimitStatusDetails,
  RateLimitStatusPayload,
  RateLimitWindowSnapshot,
} from "protocol";
import type { IntlShape } from "react-intl";

import { isUsageBasedSeatPlan } from "@/utils/skus";

function getRateLimitDetails(
  rateLimitStatus?: RateLimitStatusPayload | null,
): RateLimitStatusDetails | null {
  return rateLimitStatus?.rate_limit ?? null;
}

function getCreditDetails(
  rateLimitStatus?: RateLimitStatusPayload | null,
): CreditsDetails | null {
  return rateLimitStatus?.credits ?? null;
}

function getWindows(
  rateLimitStatus?: RateLimitStatusPayload | null,
): Array<RateLimitWindowSnapshot> {
  const rateLimit = getRateLimitDetails(rateLimitStatus);
  const windows: Array<RateLimitWindowSnapshot> = [];
  if (rateLimit?.primary_window) {
    windows.push(rateLimit.primary_window);
  }
  if (rateLimit?.secondary_window) {
    windows.push(rateLimit.secondary_window);
  }
  return windows;
}

export function getMostConstrainedWindow(
  rateLimitStatus?: RateLimitStatusPayload | null,
): RateLimitWindowSnapshot | null {
  const windows = getWindows(rateLimitStatus);
  if (windows.length === 0) {
    return null;
  }
  return windows.reduce((mostUsed, current) => {
    if (!mostUsed) {
      return current;
    }

    if (current.used_percent > mostUsed.used_percent) {
      return current;
    }
    if (current.used_percent < mostUsed.used_percent) {
      return mostUsed;
    }

    if (current.reset_at > mostUsed.reset_at) {
      return current;
    }
    if (current.reset_at < mostUsed.reset_at) {
      return mostUsed;
    }

    return mostUsed;
  });
}

export function getRateLimitResetAt(
  rateLimitStatus?: RateLimitStatusPayload | null,
): number | null {
  return getMostConstrainedWindow(rateLimitStatus)?.reset_at ?? null;
}

export function getRateLimitUsedPercent(
  rateLimitStatus?: RateLimitStatusPayload | null,
): number | null {
  return getMostConstrainedWindow(rateLimitStatus)?.used_percent ?? null;
}

export function isCoreRateLimitReached(
  rateLimitStatus?: RateLimitStatusPayload | null,
): boolean {
  const rateLimit = getRateLimitDetails(rateLimitStatus);
  const usageBasedCreditsExhausted =
    isUsageBasedSeatPlan(rateLimitStatus?.plan_type) &&
    areCreditsDepleted(rateLimitStatus);
  return Boolean(
    rateLimit?.limit_reached === true ||
    rateLimit?.allowed === false ||
    usageBasedCreditsExhausted,
  );
}

export function areCreditsDepleted(
  rateLimitStatus?: RateLimitStatusPayload | null,
): boolean {
  const credits = getCreditDetails(rateLimitStatus);
  const creditsDepleted = !credits?.unlimited && !credits?.has_credits;
  return creditsDepleted;
}

export function isUsageBasedSeatSpendCapReached(
  rateLimitStatus?: RateLimitStatusPayload | null,
): boolean {
  if (!isUsageBasedSeatPlan(rateLimitStatus?.plan_type)) {
    return false;
  }

  const rateLimit = getRateLimitDetails(rateLimitStatus);
  return Boolean(
    (rateLimit?.limit_reached === true || rateLimit?.allowed === false) &&
    !areCreditsDepleted(rateLimitStatus),
  );
}

export function isAdditionalRateLimitReached(
  additionalRateLimit: AdditionalRateLimitDetails | null,
): boolean {
  const rateLimitStatus = additionalRateLimit?.rate_limit;
  return (
    rateLimitStatus?.limit_reached === true ||
    rateLimitStatus?.allowed === false
  );
}

export function isRateLimitNearThreshold(
  rateLimitStatus?: RateLimitStatusPayload | null,
  threshold = 80,
): boolean {
  const rateLimit = getRateLimitDetails(rateLimitStatus);
  if (!rateLimit) {
    return false;
  }
  if (isCoreRateLimitReached(rateLimitStatus)) {
    return true;
  }
  const creditDetails = getCreditDetails(rateLimitStatus);
  const creditBalance = Number(creditDetails?.balance ?? 0);
  if (
    creditBalance > 0 ||
    creditDetails?.unlimited ||
    creditDetails?.has_credits
  ) {
    return false;
  }

  const usedPercent = getRateLimitUsedPercent(rateLimitStatus);
  return typeof usedPercent === "number" ? usedPercent >= threshold : false;
}

export function formatResetDateTime(intl: IntlShape, resetAt: number): string {
  const now = new Date();
  // accepts unix timestamp in seconds
  const resetDate = new Date(resetAt * 1000);

  const isSameDay =
    resetDate.getFullYear() === now.getFullYear() &&
    resetDate.getMonth() === now.getMonth() &&
    resetDate.getDate() === now.getDate();

  if (isSameDay) {
    return resetDate.toLocaleTimeString(intl.locale, { timeStyle: "short" });
  }

  return resetDate.toLocaleString(intl.locale, {
    timeStyle: "short",
    dateStyle: "medium",
  });
}
