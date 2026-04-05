import { useAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { defineMessages, useIntl } from "react-intl";

import { useIsRemoteHost } from "@/hooks/use-is-remote-host";
import { persistedAtom } from "@/utils/persisted-atom";
import { fetchFromVSCode } from "@/vscode-api";

export type PersonalizedEstimate = {
  savedDuration: string;
  threadCountLabel: string;
};

type FastModeRolloutMetrics = {
  estimatedSavedMs: number;
  rolloutCountWithCompletedTurns: number;
};

type PersistedFastModeRolloutMetrics = FastModeRolloutMetrics & {
  computedAtMs: number;
};

export const fastModePersonalizedEstimateMessages = defineMessages({
  bodyPersonalized: {
    id: "codex.fastModeHomeBanner.body.personalized",
    defaultMessage:
      "Based on your work last week across {threadCountLabel}, Fast could have saved about {duration}. Uses 2x plan usage.",
    description: "Personalized body shown in the Fast mode home banner",
  },
  threadCountOne: {
    id: "codex.fastModeHomeBanner.threadCount.one",
    defaultMessage: "{count} thread",
    description:
      "Thread count label used in the Fast mode home banner for a single thread",
  },
  threadCountOther: {
    id: "codex.fastModeHomeBanner.threadCount.other",
    defaultMessage: "{count} threads",
    description:
      "Thread count label used in the Fast mode home banner for multiple threads",
  },
  durationHoursLabel: {
    id: "codex.fastModeHomeBanner.duration.hoursLabel",
    defaultMessage: "{hours, plural, one {# hour} other {# hours}}",
    description: "Hours label used in the Fast mode home banner duration",
  },
  durationMinutesLabel: {
    id: "codex.fastModeHomeBanner.duration.minutesLabel",
    defaultMessage: "{minutes, plural, one {# minute} other {# minutes}}",
    description: "Minutes label used in the Fast mode home banner duration",
  },
  durationHoursAndMinutes: {
    id: "codex.fastModeHomeBanner.duration.hoursAndMinutes",
    defaultMessage: "{hoursLabel} {minutesLabel}",
    description:
      "Duration label used in the Fast mode home banner when hours and minutes are both present",
  },
});

const MIN_SIGNIFICANT_SAVED_MS = 45 * 60_000;
const ROLLOUT_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ROLLOUTS_TO_ANALYZE = 128;
const SESSION_CACHE_BUCKET_MS = 60 * 60 * 1000;
const FAILURE_RETRY_MS = 60 * 60 * 1000;
const FAST_MODE_ANNOUNCEMENT_ESTIMATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const aFastModePersonalizedEstimate =
  persistedAtom<PersistedFastModeRolloutMetrics | null>(
    "fast-mode-personalized-estimate",
    null,
  );

export function isFastModeEstimateFreshForAnnouncement(
  computedAtMs: number,
  now: number = Date.now(),
): boolean {
  return now - computedAtMs <= FAST_MODE_ANNOUNCEMENT_ESTIMATE_MAX_AGE_MS;
}

type FastModeEstimateRefreshState = {
  failedAtMs: number | null;
  inFlight: Promise<void> | null;
  lastStartedBucket: number | null;
};

const fastModeEstimateRefreshState: FastModeEstimateRefreshState = {
  failedAtMs: null,
  inFlight: null,
  lastStartedBucket: null,
};

export function resetFastModeEstimateRefreshStateForTest(): void {
  fastModeEstimateRefreshState.failedAtMs = null;
  fastModeEstimateRefreshState.inFlight = null;
  fastModeEstimateRefreshState.lastStartedBucket = null;
}

function getEstimateRefreshBucket(now: number = Date.now()): number {
  return Math.floor(now / SESSION_CACHE_BUCKET_MS);
}

export function useFastModePersonalizedEstimate(enabled: boolean): {
  estimate: PersonalizedEstimate | null;
  estimateStatus: "idle" | "loading" | "ready" | "failed";
  isEstimateFreshForAnnouncement: boolean;
} {
  const intl = useIntl();
  const isRemoteHost = useIsRemoteHost();
  const [persistedEstimateMetrics, setPersistedEstimateMetrics] = useAtom(
    aFastModePersonalizedEstimate,
  );
  const [visibleEstimateMetrics, setVisibleEstimateMetrics] =
    useState<PersistedFastModeRolloutMetrics | null>(null);
  const [estimateStatus, setEstimateStatus] = useState<
    "idle" | "loading" | "ready" | "failed"
  >("idle");
  const persistedEstimateMetricsRef = useRef(persistedEstimateMetrics);

  useEffect(() => {
    persistedEstimateMetricsRef.current = persistedEstimateMetrics;
  }, [persistedEstimateMetrics]);

  useEffect(() => {
    if (!enabled || isRemoteHost) {
      setVisibleEstimateMetrics(null);
      setEstimateStatus("idle");
      return;
    }

    const cachedEstimate = persistedEstimateMetricsRef.current;
    const hasCachedEstimate = cachedEstimate != null;
    setVisibleEstimateMetrics(cachedEstimate);
    setEstimateStatus(hasCachedEstimate ? "ready" : "idle");

    const now = Date.now();
    const currentBucket = getEstimateRefreshBucket(now);
    if (fastModeEstimateRefreshState.inFlight != null) {
      return;
    }
    if (fastModeEstimateRefreshState.lastStartedBucket === currentBucket) {
      return;
    }
    if (
      fastModeEstimateRefreshState.failedAtMs != null &&
      now - fastModeEstimateRefreshState.failedAtMs < FAILURE_RETRY_MS
    ) {
      return;
    }

    let cancelled = false;
    fastModeEstimateRefreshState.lastStartedBucket = currentBucket;
    const refreshPromise = (async (): Promise<void> => {
      try {
        const metrics = await fetchFromVSCode("fast-mode-rollout-metrics", {
          params: {
            startTimeMs: Date.now() - ROLLOUT_LOOKBACK_MS,
            maxRollouts: MAX_ROLLOUTS_TO_ANALYZE,
          },
        });
        if (metrics == null) {
          return;
        }
        setPersistedEstimateMetrics({
          estimatedSavedMs: metrics.estimatedSavedMs,
          rolloutCountWithCompletedTurns:
            metrics.rolloutCountWithCompletedTurns,
          computedAtMs: Date.now(),
        });
        fastModeEstimateRefreshState.failedAtMs = null;
      } catch {
        fastModeEstimateRefreshState.failedAtMs = Date.now();
        if (!cancelled && !hasCachedEstimate) {
          setEstimateStatus("failed");
        }
      } finally {
        fastModeEstimateRefreshState.inFlight = null;
      }
    })();
    fastModeEstimateRefreshState.inFlight = refreshPromise;

    return (): void => {
      cancelled = true;
    };
  }, [enabled, isRemoteHost, setPersistedEstimateMetrics]);

  const estimate = useMemo(() => {
    if (
      !enabled ||
      isRemoteHost ||
      visibleEstimateMetrics == null ||
      visibleEstimateMetrics.rolloutCountWithCompletedTurns < 1 ||
      visibleEstimateMetrics.estimatedSavedMs < MIN_SIGNIFICANT_SAVED_MS
    ) {
      return null;
    }

    return {
      threadCountLabel: formatThreadCount(
        intl,
        visibleEstimateMetrics.rolloutCountWithCompletedTurns,
      ),
      savedDuration: formatDuration(
        intl,
        visibleEstimateMetrics.estimatedSavedMs,
      ),
    };
  }, [enabled, intl, isRemoteHost, visibleEstimateMetrics]);

  if (!enabled || isRemoteHost) {
    return {
      estimate: null,
      estimateStatus: "idle",
      isEstimateFreshForAnnouncement: false,
    };
  }

  if (estimate == null || visibleEstimateMetrics == null) {
    return {
      estimate: null,
      estimateStatus,
      isEstimateFreshForAnnouncement: false,
    };
  }

  return {
    estimate,
    estimateStatus,
    isEstimateFreshForAnnouncement: isFastModeEstimateFreshForAnnouncement(
      visibleEstimateMetrics.computedAtMs,
    ),
  };
}

function formatDuration(
  intl: ReturnType<typeof useIntl>,
  durationMs: number,
): string {
  const totalMinutes = Math.max(1, Math.round(durationMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hoursLabel = intl.formatMessage(
    fastModePersonalizedEstimateMessages.durationHoursLabel,
    {
      hours,
    },
  );
  const minutesLabel = intl.formatMessage(
    fastModePersonalizedEstimateMessages.durationMinutesLabel,
    {
      minutes,
    },
  );

  if (hours > 0 && minutes > 0) {
    return intl.formatMessage(
      fastModePersonalizedEstimateMessages.durationHoursAndMinutes,
      {
        hoursLabel,
        minutesLabel,
      },
    );
  }

  if (hours > 0) {
    return hoursLabel;
  }

  return minutesLabel;
}

function formatThreadCount(
  intl: ReturnType<typeof useIntl>,
  count: number,
): string {
  return intl.formatMessage(
    count === 1
      ? fastModePersonalizedEstimateMessages.threadCountOne
      : fastModePersonalizedEstimateMessages.threadCountOther,
    { count },
  );
}
