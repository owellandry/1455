import clsx from "clsx";
import type { RateLimitStatusPayload } from "protocol";
import type React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import {
  formatResetLocalTime,
  getRemainingRateLimitPercent,
  MINUTES_IN_DAY,
} from "@/rate-limits/rate-limit-format";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsRow } from "@/settings/settings-row";
import { SettingsSurface } from "@/settings/settings-surface";
import {
  getUsageLimitRowsForRateLimitEntry,
  type RateLimitRow,
} from "@/utils/rate-limit-rows";
import {
  findRateLimitEntryByName,
  getRateLimitEntries,
  type RateLimitEntry,
} from "@/utils/use-rate-limit";

const SPARK_RATE_LIMIT_NAME = "gpt-5.3-codex-spark";

export function UsageLimitSettingsGroup({
  rateLimitStatus,
}: {
  rateLimitStatus: RateLimitStatusPayload | null;
}): React.ReactElement | null {
  const rateLimitEntries = getRateLimitEntries(rateLimitStatus);
  const coreUsageLimitRows = getUsageLimitRowsForLimit(rateLimitEntries, null);
  const sparkUsageLimitRows = getUsageLimitRowsForLimit(
    rateLimitEntries,
    SPARK_RATE_LIMIT_NAME,
  );
  const shouldShowCoreUsageLimits = coreUsageLimitRows.length > 0;
  const shouldShowSparkUsageLimits = sparkUsageLimitRows.length > 0;

  if (!shouldShowCoreUsageLimits && !shouldShowSparkUsageLimits) {
    return null;
  }

  return (
    <>
      {shouldShowCoreUsageLimits ? (
        <SettingsGroup>
          <SettingsGroup.Header
            title={
              <FormattedMessage
                id="settings.usage.limits.title"
                defaultMessage="General usage limits"
                description="Title for the usage limits section in usage settings"
              />
            }
          />
          <SettingsGroup.Content>
            <SettingsSurface>
              {coreUsageLimitRows.map((rateLimitRow) => {
                return (
                  <UsageLimitSettingsRow
                    key={rateLimitRow.key}
                    rateLimitRow={rateLimitRow}
                  />
                );
              })}
            </SettingsSurface>
          </SettingsGroup.Content>
        </SettingsGroup>
      ) : null}
      {shouldShowSparkUsageLimits ? (
        <SettingsGroup>
          <SettingsGroup.Header
            title={
              <FormattedMessage
                id="settings.usage.limits.spark.title"
                defaultMessage="GPT-5.3-Codex-Spark usage limits"
                description="Title for the GPT-5.3-Codex-Spark usage limits section"
              />
            }
          />
          <SettingsGroup.Content>
            <SettingsSurface>
              {sparkUsageLimitRows.map((rateLimitRow) => {
                return (
                  <UsageLimitSettingsRow
                    key={rateLimitRow.key}
                    rateLimitRow={rateLimitRow}
                  />
                );
              })}
            </SettingsSurface>
          </SettingsGroup.Content>
        </SettingsGroup>
      ) : null}
    </>
  );
}

function UsageLimitSettingsRow({
  rateLimitRow,
}: {
  rateLimitRow: RateLimitRow;
}): React.ReactElement {
  const resetAtLabel = formatResetLocalTime(
    rateLimitRow.bucket.resetsAt ?? null,
  );
  const description =
    resetAtLabel != null ? (
      <FormattedMessage
        id="settings.usage.limits.window.resetAt"
        defaultMessage="Resets {time}"
        description="Description showing when a usage limit window resets"
        values={{ time: resetAtLabel }}
      />
    ) : null;
  const remainingPercent = getRemainingRateLimitPercent(
    rateLimitRow.bucket.usedPercent ?? 0,
  );

  return (
    <SettingsRow
      className="gap-6"
      label={getUsageLimitRowLabel(rateLimitRow)}
      description={description}
      control={<UsageLimitProgress remainingPercent={remainingPercent} />}
    />
  );
}

function getUsageLimitRowsForLimit(
  rateLimitEntries: Array<RateLimitEntry>,
  limitName: string | null,
): Array<RateLimitRow> {
  const rateLimitEntry =
    limitName == null
      ? (rateLimitEntries.find((entry) => entry.limitName == null) ?? null)
      : findRateLimitEntryByName(rateLimitEntries, limitName);
  if (rateLimitEntry == null) {
    return [];
  }

  return getUsageLimitRowsForRateLimitEntry({
    entry: rateLimitEntry,
    keyPrefix: limitName ?? "core",
  });
}

function getUsageLimitRowLabel(rateLimitRow: RateLimitRow): React.ReactNode {
  const windowMinutes = rateLimitRow.bucket.windowDurationMins ?? 0;
  if (windowMinutes < MINUTES_IN_DAY) {
    return (
      <FormattedMessage
        id="settings.usage.limits.fiveHour.label"
        defaultMessage="5 hour usage limit"
        description="Label for the 5-hour usage limit row"
      />
    );
  }

  return (
    <FormattedMessage
      id="settings.usage.limits.weekly.label"
      defaultMessage="Weekly usage limit"
      description="Label for the weekly usage limit row"
    />
  );
}

function UsageLimitProgress({
  remainingPercent,
}: {
  remainingPercent: number;
}): React.ReactElement {
  const intl = useIntl();
  const clampedPercent = clampPercent(remainingPercent);

  return (
    <div className="flex items-center gap-2">
      <progress
        max={100}
        value={clampedPercent}
        aria-label={intl.formatMessage({
          id: "settings.usage.limits.progress.ariaLabel",
          defaultMessage: "Usage remaining",
          description: "Aria label for usage remaining progress bars",
        })}
        className={clsx(
          "h-1.5 w-24 overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-token-foreground/10 [&::-webkit-progress-value]:bg-token-foreground [&::-moz-progress-bar]:bg-token-foreground",
          "[&::-ms-fill]:bg-token-foreground",
        )}
      />
      <span className="w-[72px] text-right text-sm text-token-text-secondary tabular-nums">
        {intl.formatMessage(
          {
            id: "settings.usage.limits.progress.remaining",
            defaultMessage: "{remaining}% left",
            description: "Remaining percentage shown next to usage progress",
          },
          {
            remaining: intl.formatNumber(clampedPercent, {
              maximumFractionDigits: 0,
            }),
          },
        )}
      </span>
    </div>
  );
}

function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) {
    return 0;
  }
  return Math.max(0, Math.min(100, percent));
}
