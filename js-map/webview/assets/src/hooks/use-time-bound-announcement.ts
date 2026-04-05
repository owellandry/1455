import { useAtom } from "jotai";
import type { WritableAtom } from "jotai";
import { useState } from "react";

import { persistedAtom } from "@/utils/persisted-atom";
import { useInterval } from "@/utils/use-interval";

type UseTimeBoundAnnouncementResult = {
  dismiss: () => void;
  isDismissed: boolean;
  isExpired: boolean;
  remainingMs?: number;
  shouldShow: boolean;
};

type UseTimeBoundAnnouncementOptions = {
  campaignId: string;
  endsAtMs?: number;
  startsAtMs?: number;
  storageNamespace?: string;
};

const DEFAULT_STORAGE_NAMESPACE = "feature-announcement";
const BADGE_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

const dismissedAtAtomByStorageKey = new Map<
  string,
  WritableAtom<number | null, [number | null], void>
>();

export function useTimeBoundAnnouncement({
  campaignId,
  endsAtMs,
  startsAtMs,
  storageNamespace = DEFAULT_STORAGE_NAMESPACE,
}: UseTimeBoundAnnouncementOptions): UseTimeBoundAnnouncementResult {
  // Hourly refresh checks for announcement/chip expiry.
  const refreshIntervalMs = endsAtMs != null ? BADGE_REFRESH_INTERVAL_MS : null;
  const [, setClockTick] = useState(0);
  useInterval(() => {
    setClockTick((value) => value + 1);
  }, refreshIntervalMs);

  const [dismissedAtMs, setDismissedAtMs] = useAtom(
    getDismissedAtAtom(storageNamespace, campaignId),
  );
  const nowMs = Date.now();
  const isDismissed = dismissedAtMs != null;
  const isExpired = isTimeBoundAnnouncementExpired(nowMs, endsAtMs);
  const shouldShow =
    isWithinTimeBoundAnnouncementWindow(nowMs, startsAtMs, endsAtMs) &&
    !isDismissed;

  if (endsAtMs != null) {
    return {
      dismiss: () => {
        setDismissedAtMs(Date.now());
      },
      isDismissed,
      isExpired,
      remainingMs: Math.max(0, endsAtMs - nowMs),
      shouldShow,
    };
  }

  return {
    dismiss: () => {
      setDismissedAtMs(Date.now());
    },
    isDismissed,
    isExpired,
    shouldShow,
  };
}

export function isTimeBoundAnnouncementExpired(
  nowMs: number,
  endsAtMs?: number,
): boolean {
  if (endsAtMs == null) {
    return false;
  }

  return nowMs >= endsAtMs;
}

export function isWithinTimeBoundAnnouncementWindow(
  nowMs: number,
  startsAtMs?: number,
  endsAtMs?: number,
): boolean {
  if (startsAtMs != null && nowMs < startsAtMs) {
    return false;
  }
  if (endsAtMs != null && nowMs >= endsAtMs) {
    return false;
  }

  return true;
}

function getDismissedAtAtom(
  storageNamespace: string,
  campaignId: string,
): WritableAtom<number | null, [number | null], void> {
  const storageKey = `${storageNamespace}:${campaignId}:dismissed-at-ms`;
  const existingAtom = dismissedAtAtomByStorageKey.get(storageKey);
  if (existingAtom) {
    return existingAtom;
  }

  const nextAtom = persistedAtom<number | null>(storageKey, null);
  dismissedAtAtomByStorageKey.set(storageKey, nextAtom);
  return nextAtom;
}
