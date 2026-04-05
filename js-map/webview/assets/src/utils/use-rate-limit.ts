import type {
  CreditsSnapshot,
  RateLimitSnapshot,
  RateLimitWindow,
} from "app-server-types/v2";
import type { RateLimitStatusPayload, RateLimitWindowSnapshot } from "protocol";

import {
  getRateLimitAlertData,
  getSecondsUntilReset,
  type RateLimitAlertData,
} from "@/rate-limits/rate-limit-format";
import {
  isAdditionalRateLimitReached,
  isCoreRateLimitReached,
} from "@/utils/rate-limit-status";
import { getRateLimitWindowDetails } from "@/utils/rate-limit-window";

const DEFAULT_REFRESH_INTERVAL_SECONDS = 30 * 60; // 30 minutes
const MIN_REFRESH_INTERVAL_MS = 60000; // 1 minute
const DEFAULT_LIMIT_NAME = "codex";

type RateLimitNamePayload = {
  rate_limit_name: string | null | undefined;
};

type AdditionalRateLimitPayload = {
  limit_name: string | null | undefined;
  rate_limit: RateLimitStatusPayload["rate_limit"] | null | undefined;
};

type AdditionalRateLimitsPayload = {
  additional_rate_limits: Array<AdditionalRateLimitPayload> | null | undefined;
};

type RateLimitPayload = RateLimitStatusPayload &
  Partial<RateLimitNamePayload & AdditionalRateLimitsPayload>;

export type RateLimitEntry = {
  limitName: string | null;
  snapshot: RateLimitSnapshot;
  blocked?: boolean;
};

export type RateLimitBannerMode = "none" | "upsell" | "model_limit";

type RateLimitEntryFilterOptions = {
  activeLimitName?: string | null;
  selectedModel?: string | null;
};

export function toMcpRateLimitSnapshot(
  rateLimit: RateLimitStatusPayload["rate_limit"] | null | undefined,
  credits: RateLimitStatusPayload["credits"] | null | undefined,
  planType: RateLimitStatusPayload["plan_type"] | null | undefined,
  limitName: string | null = null,
): RateLimitSnapshot | null {
  return {
    limitId: null,
    limitName,
    primary: toMcpRateLimitWindow(rateLimit?.primary_window),
    secondary: toMcpRateLimitWindow(rateLimit?.secondary_window),
    credits: toMcpCredits(credits),
    planType: mapPlanType(planType),
  };
}

export function getRateLimitName(
  payload: RateLimitPayload | null | undefined,
): string | null {
  if (payload == null) {
    return null;
  }
  const candidate = payload.rate_limit_name;
  if (candidate == null) {
    return null;
  }
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getRateLimitEntries(
  payload: RateLimitPayload | null | undefined,
): Array<RateLimitEntry> {
  if (payload == null) {
    return [];
  }

  const entries: Array<RateLimitEntry> = [];
  const coreLimitName = getRateLimitName(payload);
  const coreSnapshot = toMcpRateLimitSnapshot(
    payload.rate_limit,
    payload.credits,
    payload.plan_type,
    coreLimitName,
  );
  if (coreSnapshot) {
    entries.push({
      limitName: null,
      snapshot: coreSnapshot,
      blocked: isCoreRateLimitReached(payload),
    });
  }

  const additionalRateLimits = payload.additional_rate_limits;
  if (Array.isArray(additionalRateLimits)) {
    for (const additional of additionalRateLimits) {
      if (!additional?.rate_limit) {
        continue;
      }
      const limitName = additional.limit_name?.trim() ?? null;
      if (limitName == null || limitName.length === 0) {
        continue;
      }
      const snapshot = toMcpRateLimitSnapshot(
        additional.rate_limit,
        null,
        payload.plan_type,
        limitName,
      );
      if (snapshot) {
        entries.push({
          limitName,
          snapshot,
          blocked: isAdditionalRateLimitReached(additional),
        });
      }
    }
  }

  return entries;
}

export function filterRateLimitEntries(
  entries: Array<RateLimitEntry>,
  { activeLimitName, selectedModel }: RateLimitEntryFilterOptions = {},
): Array<RateLimitEntry> {
  if (entries.length === 0) {
    return entries;
  }

  const selectedMatchKey = getRateLimitMatchKey(selectedModel);
  const activeMatchKey = getRateLimitMatchKey(activeLimitName);
  const target =
    selectedMatchKey ??
    (activeMatchKey && !isDefaultRateLimitName(activeMatchKey)
      ? activeMatchKey
      : null);
  if (!target) {
    return entries.filter((entry) => entry.limitName == null);
  }
  return entries.filter((entry) => {
    if (entry.limitName == null) {
      return true;
    }
    return getRateLimitMatchKey(entry.limitName) === target;
  });
}

export function getActiveRateLimitEntry(
  entries: Array<RateLimitEntry>,
  { activeLimitName, selectedModel }: RateLimitEntryFilterOptions = {},
): RateLimitEntry | null {
  if (entries.length === 0) {
    return null;
  }

  const coreEntry = entries.find((entry) => entry.limitName == null) ?? null;
  const selectedEntry = findRateLimitEntryByName(entries, selectedModel);
  const activeEntry = findRateLimitEntryByName(entries, activeLimitName);
  const coreIsNotBlocked = coreEntry?.blocked !== true;

  if (coreIsNotBlocked && selectedEntry?.blocked === true) {
    return selectedEntry;
  }
  if (
    coreIsNotBlocked &&
    activeEntry?.blocked === true &&
    !isDefaultRateLimitName(activeEntry.limitName)
  ) {
    return activeEntry;
  }

  return coreEntry ?? selectedEntry ?? activeEntry ?? entries[0] ?? null;
}

export function getActiveRateLimitAlertData(
  entries: Array<RateLimitEntry>,
  options: RateLimitEntryFilterOptions = {},
): RateLimitAlertData | null {
  const activeEntry = getActiveRateLimitEntry(entries, options);
  if (activeEntry == null) {
    return null;
  }
  return getRateLimitAlertData(activeEntry.snapshot);
}

export function getRateLimitEntryResetAt(
  entry: RateLimitEntry | null | undefined,
): number | null {
  const mostConstrainedWindow = getMostConstrainedEntryWindow(entry);
  return mostConstrainedWindow?.resetsAt ?? null;
}

export function shouldSuppressRateLimitUpsell(
  payload: RateLimitPayload | null | undefined,
  options: RateLimitEntryFilterOptions = {},
): boolean {
  if (payload == null) {
    return false;
  }
  if (isCoreRateLimitReached(payload)) {
    return false;
  }
  const activeLimitName = options.activeLimitName ?? getRateLimitName(payload);
  const additionalRateLimits = payload.additional_rate_limits;
  if (!Array.isArray(additionalRateLimits)) {
    return activeLimitName != null && !isDefaultRateLimitName(activeLimitName);
  }
  const selectedMatchKey = getRateLimitMatchKey(options.selectedModel);
  if (selectedMatchKey != null) {
    const selectedModelReached = additionalRateLimits.some((additional) => {
      if (!isAdditionalRateLimitReached(additional)) {
        return false;
      }
      return getRateLimitMatchKey(additional.limit_name) === selectedMatchKey;
    });
    if (selectedModelReached) {
      return true;
    }
  }
  return activeLimitName != null && !isDefaultRateLimitName(activeLimitName);
}

export function isSelectedModelRateLimitReached(
  payload: RateLimitPayload | null | undefined,
  selectedModel: string | null | undefined,
): boolean {
  if (payload == null) {
    return false;
  }
  const selectedMatchKey = getRateLimitMatchKey(selectedModel);
  if (selectedMatchKey == null) {
    return false;
  }
  const additionalRateLimits = payload.additional_rate_limits;
  if (!Array.isArray(additionalRateLimits)) {
    return false;
  }
  return additionalRateLimits.some((additional) => {
    if (!isAdditionalRateLimitReached(additional)) {
      return false;
    }
    return getRateLimitMatchKey(additional.limit_name) === selectedMatchKey;
  });
}

export function getRateLimitBannerMode(params: {
  coreRateLimitBlocked: boolean;
  selectedModelRateLimitReached: boolean;
}): RateLimitBannerMode {
  if (params.coreRateLimitBlocked) {
    return "upsell";
  }
  if (params.selectedModelRateLimitReached) {
    return "model_limit";
  }
  return "none";
}

export function isDefaultRateLimitName(
  limitName: string | null | undefined,
): boolean {
  if (limitName == null) {
    return true;
  }
  return limitName.trim().toLowerCase() === DEFAULT_LIMIT_NAME;
}

function getRateLimitMatchKey(
  limitName: string | null | undefined,
): string | null {
  if (limitName == null) {
    return null;
  }
  const matchKey = limitName
    .trim()
    .toLowerCase()
    .replace(/[_\s.]+/g, "-");
  return matchKey.length > 0 ? matchKey : null;
}

export function findRateLimitEntryByName(
  entries: Array<RateLimitEntry>,
  limitName: string | null | undefined,
): RateLimitEntry | null {
  const limitNameMatchKey = getRateLimitMatchKey(limitName);
  if (limitNameMatchKey == null) {
    return null;
  }
  return (
    entries.find(
      (entry) => getRateLimitMatchKey(entry.limitName) === limitNameMatchKey,
    ) ?? null
  );
}

function getMostConstrainedEntryWindow(
  entry: RateLimitEntry | null | undefined,
): RateLimitWindow | null {
  if (entry == null) {
    return null;
  }
  const windows = [entry.snapshot.primary, entry.snapshot.secondary].filter(
    (window): window is RateLimitWindow => window != null,
  );
  if (windows.length === 0) {
    return null;
  }
  return windows.reduce((mostUsed, current) => {
    if (current.usedPercent > mostUsed.usedPercent) {
      return current;
    }
    if (current.usedPercent < mostUsed.usedPercent) {
      return mostUsed;
    }

    const currentResetAt = current.resetsAt ?? Number.NEGATIVE_INFINITY;
    const mostUsedResetAt = mostUsed.resetsAt ?? Number.NEGATIVE_INFINITY;
    if (currentResetAt > mostUsedResetAt) {
      return current;
    }
    return mostUsed;
  });
}

function toMcpRateLimitWindow(
  window: RateLimitWindowSnapshot | null | undefined,
): RateLimitWindow | null {
  const windowDetails = getRateLimitWindowDetails(window);
  if (windowDetails == null) {
    return null;
  }

  return {
    usedPercent: windowDetails.usedPercent,
    windowDurationMins: windowDetails.windowMinutes,
    resetsAt: windowDetails.resetAt,
  };
}

function toMcpCredits(
  credits: RateLimitStatusPayload["credits"] | null | undefined,
): CreditsSnapshot | null {
  if (!credits) {
    return null;
  }

  return {
    hasCredits: credits.has_credits,
    unlimited: credits.unlimited,
    balance: credits.balance ?? null,
  };
}

function mapPlanType(
  planType: string | null | undefined,
): RateLimitSnapshot["planType"] {
  if (!planType) {
    return null;
  }

  // THIS IS NOT an accurate mapping/representation of all plan type
  // if we would like to acutally display this information, we will need to update
  // RateLimitSnapshot.plan_types to acutally match RateLimitStatusPayload.plan_types.
  switch (planType) {
    case "free":
    case "plus":
    case "pro":
      return planType;
    case "team":
    case "self_serve_business_usage_based":
      return "team";
    case "business":
    case "enterprise_cbp_usage_based":
      return "business";
    case "enterprise":
    case "edu":
      return planType;
    case "hc":
      // PlanType (from app-server-types) doesn't include this yet.
      // Map to the closest existing enterprisey type for display.
      return "enterprise";
    case "education":
    case "k12":
      return "edu";
    case "go":
    case "guest":
    case "free_workspace":
    case "quorum":
      return "unknown";
    default:
      return "unknown";
  }
}

export const toRefreshIntervalMs = (
  snapshot: RateLimitStatusPayload["rate_limit"] | null | undefined,
  now: Date = new Date(),
): number => {
  const primarySeconds =
    getSecondsUntilReset(snapshot?.primary_window?.reset_at ?? null, now) ??
    DEFAULT_REFRESH_INTERVAL_SECONDS;
  const secondarySeconds =
    getSecondsUntilReset(snapshot?.secondary_window?.reset_at ?? null, now) ??
    DEFAULT_REFRESH_INTERVAL_SECONDS;
  return Math.min(
    Math.min(primarySeconds, secondarySeconds) * 1000,
    MIN_REFRESH_INTERVAL_MS,
  );
};
