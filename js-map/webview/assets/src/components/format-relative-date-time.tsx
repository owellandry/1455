/** https://github.com/openai/openai/blob/master/chatgpt/web/src/components/wham/utils/formatted-relative-date-time.tsx */
import { useSyncExternalStore } from "react";
import { useIntl } from "react-intl";

type Listener = () => void;

const MINUTE_IN_MS = 60_000;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

let cachedNow = new Date();
const listeners = new Set<Listener>();
let intervalId: number | null = null;

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function tickNow(): void {
  cachedNow = new Date();
  notifyListeners();
}

function startTicker(): void {
  if (intervalId != null || typeof window === "undefined") {
    return;
  }
  tickNow();
  intervalId = window.setInterval(() => {
    tickNow();
  }, MINUTE_IN_MS);
}

function stopTicker(): void {
  if (intervalId == null) {
    return;
  }
  window.clearInterval(intervalId);
  intervalId = null;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    startTicker();
  }
  return (): void => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopTicker();
    }
  };
}

function getSnapshot(): Date {
  return cachedNow;
}

function useSharedNow(): Date {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function differenceInMinutes(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 60000);
}

function differenceInCalendarDays(a: Date, b: Date): number {
  const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((aMid.getTime() - bMid.getTime()) / 86_400_000);
}

export function FormattedRelativeDateTime({
  dateString,
}: {
  dateString: string;
}): React.ReactNode {
  const intl = useIntl();
  const now = useSharedNow();
  const date = new Date(dateString);
  const numDaysDiff = differenceInCalendarDays(now, date);
  const numMinsDiff = differenceInMinutes(now, date);

  const normalizedMinutes = Math.max(1, numMinsDiff);

  if (normalizedMinutes < 60) {
    return intl.formatMessage(
      {
        id: "wham.formattedRelativeDateTime.compactMinutesAgo",
        defaultMessage: "{value}m",
        description: "Compact minutes-ago format",
      },
      { value: normalizedMinutes },
    );
  }

  const hours = Math.floor(normalizedMinutes / 60);
  if (hours < 24) {
    return intl.formatMessage(
      {
        id: "wham.formattedRelativeDateTime.compactHoursAgo",
        defaultMessage: "{value}h",
        description: "Compact hours-ago format",
      },
      { value: hours },
    );
  }

  const days = Math.max(1, numDaysDiff);
  if (days < DAYS_PER_WEEK) {
    return intl.formatMessage(
      {
        id: "wham.formattedRelativeDateTime.compactDaysAgo",
        defaultMessage: "{value}d",
        description: "Compact days-ago format",
      },
      { value: days },
    );
  }

  if (days < DAYS_PER_MONTH) {
    const weeks = Math.floor(days / DAYS_PER_WEEK);
    return intl.formatMessage(
      {
        id: "wham.formattedRelativeDateTime.compactWeeksAgo",
        defaultMessage: "{value}w",
        description: "Compact weeks-ago format",
      },
      { value: weeks },
    );
  }

  if (days < DAYS_PER_YEAR) {
    const months = Math.floor(days / DAYS_PER_MONTH);
    return intl.formatMessage(
      {
        id: "wham.formattedRelativeDateTime.compactMonthsAgo",
        defaultMessage: "{value}mo",
        description: "Compact months-ago format",
      },
      { value: months },
    );
  }

  const years = Math.floor(days / DAYS_PER_YEAR);
  return intl.formatMessage(
    {
      id: "wham.formattedRelativeDateTime.compactYearsAgo",
      defaultMessage: "{value}y",
      description: "Compact years-ago format",
    },
    { value: years },
  );
}
