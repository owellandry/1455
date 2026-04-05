import type { ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import {
  MINUTES_IN_DAY,
  MINUTES_IN_HOUR,
  MINUTES_IN_WEEK,
} from "./rate-limit-format";

export function RateLimitWindowLabel({
  minutes,
  variant = "summary",
}: {
  minutes: number | null;
  variant?: "summary" | "alert";
}): ReactElement {
  const mins = minutes ?? 0;

  // Treat near-equality generously: >= (target - 1 minute)
  if (mins >= MINUTES_IN_WEEK - 1) {
    const weeks = Math.ceil(mins / MINUTES_IN_WEEK);
    return variant === "summary" ? (
      <FormattedMessage
        id="composer.mode.rateLimit.weeklyDynamicTitle"
        defaultMessage="{weeks, plural, one {Weekly} other {{weeks} Week}}"
        description="Dynamic weekly rate limit label (title case)"
        values={{ weeks }}
      />
    ) : (
      <FormattedMessage
        id="composer.mode.rateLimit.weeklyDynamicSentence"
        defaultMessage="{weeks, plural, one {weekly limit} other {{weeks} week limit}}"
        description="Dynamic weekly rate limit label (sentence case)"
        values={{ weeks }}
      />
    );
  }
  if (mins >= MINUTES_IN_DAY - 1) {
    const days = Math.ceil(mins / MINUTES_IN_DAY);
    return (
      <FormattedMessage
        id="composer.mode.rateLimit.day"
        defaultMessage="{days}d"
        description="Daily rate limit label"
        values={{ days }}
      />
    );
  }
  if (mins >= MINUTES_IN_HOUR) {
    const hours = Math.ceil(mins / MINUTES_IN_HOUR);
    return (
      <FormattedMessage
        id="composer.mode.rateLimit.hour"
        defaultMessage="{hours}h"
        description="Hourly rate limit label"
        values={{ hours }}
      />
    );
  }
  if (mins > 0) {
    const minutesRounded = Math.ceil(mins);
    return (
      <FormattedMessage
        id="composer.mode.rateLimit.minute"
        defaultMessage="{minutes}m"
        description="Minute rate limit label"
        values={{ minutes: minutesRounded }}
      />
    );
  }
  return (
    <FormattedMessage
      id="composer.mode.rateLimit.heading"
      defaultMessage="Rate limits remaining"
      description="Rate limit summary heading"
    />
  );
}
