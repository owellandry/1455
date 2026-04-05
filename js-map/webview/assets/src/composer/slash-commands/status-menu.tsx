import clsx from "clsx";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import {
  formatResetLocalTime,
  getRemainingRateLimitPercent,
  hasRenderableRateLimitWindow,
  type RateLimitAlertData,
} from "@/rate-limits/rate-limit-format";
import { copyToClipboard } from "@/utils/copy-to-clipboard";
import type { RateLimitRow } from "@/utils/rate-limit-rows";
import { useResizeObserver } from "@/utils/use-resize-observer";

import type { ContextUsageStats } from "../context-usage-stats";

const TINY_HIDE_CLASS = "max-[260px]:hidden";
const MICRO_HIDE_CLASS = "max-[220px]:hidden";
const PROGRESS_SHOW_CLASS = "min-[400px]:flex";
const PROGRESS_HIDE_CLASS = "min-[400px]:hidden";

export function StatusMenu({
  threadId,
  contextUsage,
  rateLimitRows,
  alertData,
  onClose,
}: {
  threadId: string | null;
  contextUsage: ContextUsageStats;
  rateLimitRows: Array<RateLimitRow>;
  alertData: RateLimitAlertData | null;
  onClose: () => void;
}): React.ReactElement {
  const intl = useIntl();
  const hasContextUsage = contextUsage.percent != null;
  const remainingContextPercent =
    contextUsage.percent != null
      ? Math.max(0, Math.round(100 - contextUsage.percent))
      : null;

  const lines: Array<{
    key: string;
    label: string;
    value: ReactNode | null;
    spacer?: boolean;
    section?: boolean;
  }> = [];

  const addLine = (label: string, value: ReactNode): void => {
    lines.push({
      key: `${lines.length}-line`,
      label,
      value,
    });
  };

  const addSpacer = (): void => {
    lines.push({
      key: `${lines.length}-spacer`,
      label: "",
      value: null,
      spacer: true,
    });
  };

  const sessionLabel = intl.formatMessage({
    id: "composer.statusPlain.sessionLabel",
    defaultMessage: "Session:",
    description: "Label preceding the session identifier in the status menu",
  });
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect((): (() => void) => {
    return () => {
      if (copyTimeoutRef.current != null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopySessionId = (): void => {
    if (!threadId) {
      return;
    }
    void copyToClipboard(threadId).then(() => {
      setCopiedSessionId(true);
      if (copyTimeoutRef.current != null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedSessionId(false);
      }, 2000);
    });
  };

  if (threadId) {
    const tooltipContent = copiedSessionId ? (
      <FormattedMessage
        id="composer.statusPlain.sessionCopiedTooltip"
        defaultMessage="Copied ID"
        description="Tooltip shown after the session id has been copied"
      />
    ) : (
      <FormattedMessage
        id="composer.statusPlain.sessionCopyTooltip"
        defaultMessage="Copy ID"
        description="Tooltip instructing the user to copy the session id"
      />
    );
    const sessionValue = (
      <Tooltip tooltipContent={tooltipContent}>
        <button
          type="button"
          onClick={handleCopySessionId}
          aria-label={
            copiedSessionId
              ? intl.formatMessage({
                  id: "composer.statusPlain.sessionCopiedAriaLabel",
                  defaultMessage: "Copied session id",
                  description:
                    "Aria label for the session id button after copying",
                })
              : intl.formatMessage({
                  id: "composer.statusPlain.sessionCopyAriaLabel",
                  defaultMessage: "Copy session id",
                  description:
                    "Aria label for the button that copies the session id",
                })
          }
          className="max-w-full cursor-copy truncate bg-transparent text-left text-token-foreground transition-colors hover:text-token-description-foreground focus:outline-none"
        >
          {threadId}
        </button>
      </Tooltip>
    );
    addLine(sessionLabel, sessionValue);
  }

  if (hasContextUsage && remainingContextPercent != null) {
    const contextLabel = intl.formatMessage({
      id: "composer.statusPlain.contextLabel",
      defaultMessage: "Context:",
      description:
        "Label describing the context window usage row in the status menu",
    });
    const usedTokens = intl.formatNumber(contextUsage.usedTokens ?? 0);
    const totalTokensK = Math.round((contextUsage.contextWindow ?? 0) / 1000);
    const totalTokensText =
      totalTokensK > 0
        ? intl.formatMessage(
            {
              id: "composer.statusPlain.contextTotal",
              defaultMessage: "{count}K",
              description:
                "Abbreviated token count showing thousands for context window",
            },
            { count: intl.formatNumber(totalTokensK) },
          )
        : intl.formatNumber(contextUsage.contextWindow ?? 0);
    const contextRemainingText = intl.formatMessage(
      {
        id: "composer.statusPlain.contextValueRemaining",
        defaultMessage: "{remaining}% left",
        description:
          "Summarizes how much context window remains as a percent (without metadata)",
      },
      {
        remaining: intl.formatNumber(remainingContextPercent, {
          maximumFractionDigits: 0,
        }),
      },
    );
    const contextMetadataText = intl.formatMessage(
      {
        id: "composer.statusPlain.contextValueMetadata",
        defaultMessage: "({used} used / {total})",
        description:
          "Describes context window usage metadata showing used versus total tokens",
      },
      {
        used: usedTokens,
        total: totalTokensText,
      },
    );
    const contextValueText = `${contextRemainingText} ${contextMetadataText}`;
    const contextValue = (
      <span className="block max-w-full truncate">
        {renderValueWithMetadata(contextValueText)}
      </span>
    );
    addLine(contextLabel, contextValue);
  }

  const fallbackRateLimitLabel = intl.formatMessage({
    id: "composer.statusPlain.rateLimitFallbackLabel",
    defaultMessage: "Rate limit:",
    description: "Generic label when a specific rate limit window is unknown",
  });
  const rateLimitUnavailable = intl.formatMessage({
    id: "composer.statusPlain.rateLimitUnavailable",
    defaultMessage: "Unavailable",
    description: "Shown when rate limit data cannot be fetched",
  });
  const renderableRateLimitRows = rateLimitRows.filter((row) =>
    hasRenderableRateLimitWindow(row.bucket),
  );

  if (renderableRateLimitRows.length > 0) {
    const renderedModelSections = new Set<string>();
    for (const row of renderableRateLimitRows) {
      const remainingPercent = getRemainingRateLimitPercent(
        row.bucket.usedPercent ?? 0,
      );
      const rowLabel = formatWindowLabelText(
        row.bucket.windowDurationMins ?? null,
        intl,
      );
      if (row.limitName != null) {
        const modelSectionLabel = formatModelSectionLabelText(
          row.limitName,
          intl,
        );
        if (!renderedModelSections.has(modelSectionLabel)) {
          renderedModelSections.add(modelSectionLabel);
          lines.push({
            key: `${lines.length}-model-section`,
            label: modelSectionLabel,
            value: null,
            section: true,
          });
        }
      }
      const percentageText = intl.formatMessage(
        {
          id: "composer.statusPlain.rateLimitPercent",
          defaultMessage: "{remaining}% left",
          description:
            "Describes how much of a rate limit window remains as a percentage",
        },
        {
          remaining: intl.formatNumber(remainingPercent, {
            maximumFractionDigits: 0,
          }),
        },
      );
      const resetText = formatResetLocalTime(row.bucket.resetsAt ?? null);
      const resetPhrase = resetText
        ? intl.formatMessage(
            {
              id: "composer.statusPlain.rateLimitReset",
              defaultMessage: "resets {time}",
              description: "Phrase describing when the rate limit resets",
            },
            { time: resetText },
          )
        : intl.formatMessage({
            id: "composer.statusPlain.rateLimitResetUnknown",
            defaultMessage: "reset time unavailable",
            description:
              "Fallback shown when the next rate limit reset time is unknown",
          });
      const resetMetadata = intl.formatMessage(
        {
          id: "composer.statusPlain.rateLimitResetMetadata",
          defaultMessage: "({phrase})",
          description:
            "Parenthetical text appended after the rate limit percentage to describe the reset timing",
        },
        { phrase: resetPhrase },
      );
      const smallScreenText = `${percentageText} ${resetMetadata}`;
      const value = (
        <>
          <span
            className={clsx("block max-w-full truncate", PROGRESS_HIDE_CLASS)}
          >
            {renderValueWithMetadata(smallScreenText)}
          </span>
          <div
            className={clsx(
              "hidden w-full items-center gap-2",
              PROGRESS_SHOW_CLASS,
            )}
          >
            <RateLimitProgressBar percent={remainingPercent} />
            <div className="flex min-w-0 flex-[0_1_170px] shrink-1 items-center gap-1">
              <span className="shrink-0 whitespace-nowrap">
                {percentageText}
              </span>
              <span
                className="min-w-0 flex-1 truncate text-right text-token-description-foreground"
                data-chromatic="ignore"
              >
                {resetMetadata}
              </span>
            </div>
          </div>
        </>
      );
      addLine(rowLabel, value);
    }
  } else {
    addLine(fallbackRateLimitLabel, rateLimitUnavailable);
  }

  if (alertData && renderableRateLimitRows.length === 0) {
    addSpacer();
    const alertLabel = intl.formatMessage({
      id: "composer.statusPlain.alertLabel",
      defaultMessage: "Alert:",
      description: "Label preceding a rate limit alert row",
    });
    const alertValue = intl.formatMessage(
      {
        id: "composer.statusPlain.alertValue",
        defaultMessage: "{remaining}% left on {window}",
        description:
          "Shows how much remains on a particular rate limit window when an alert triggers",
      },
      {
        remaining: intl.formatNumber(alertData.remainingPercent, {
          maximumFractionDigits: 0,
        }),
        window: formatWindowLabelText(alertData.windowMinutes ?? null, intl, {
          withColon: false,
        }),
      },
    );
    addLine(alertLabel, alertValue);
  }

  return (
    <div className="px-3">
      <div className="flex w-full flex-col gap-3 rounded-t-xl border-x border-t border-token-border bg-token-input-background px-3 py-2 text-sm [text-wrap:pretty] text-token-foreground lg:mx-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1">
            <span className={clsx("font-semibold", MICRO_HIDE_CLASS)}>
              {intl.formatMessage({
                id: "composer.statusPlain.heading",
                defaultMessage: "Status",
                description: "Heading label for the status menu",
              })}
            </span>
          </div>
          <Button size="composerSm" color="ghost" onClick={onClose}>
            {intl.formatMessage({
              id: "composer.status.close",
              defaultMessage: "Close",
              description:
                "Button label to close the status slash command dialog",
            })}
          </Button>
        </div>
        <div className="font-mono text-[11px] leading-relaxed">
          <div
            className={clsx(
              "grid items-start gap-x-4 gap-y-1",
              "grid-cols-[70px_minmax(0,1fr)]",
            )}
          >
            {lines.map((line) => {
              if (line.spacer) {
                return (
                  <div
                    key={`${line.key}-spacer`}
                    className="col-span-2 h-3"
                    aria-hidden="true"
                  />
                );
              }
              if (line.section) {
                return (
                  <div
                    key={`${line.key}-section`}
                    className="col-span-2 truncate font-medium whitespace-nowrap text-token-foreground"
                  >
                    {line.label}
                  </div>
                );
              }
              return (
                <span key={`${line.key}-row`} className="contents">
                  <div
                    className={clsx(
                      "text-token-description-foreground text-left",
                      TINY_HIDE_CLASS,
                    )}
                  >
                    {line.label}
                  </div>
                  <div className="text-left text-token-foreground">
                    {renderLineValue(line.value)}
                  </div>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const MIN_PROGRESS_BAR_SEGMENTS = 12;
const MAX_PROGRESS_BAR_SEGMENTS = 48;
const SEGMENT_PIXEL_TARGET = 6;
const INITIAL_PROGRESS_BAR_SEGMENTS = 24;

function RateLimitProgressBar({
  percent,
}: {
  percent: number;
}): React.ReactElement {
  const [segments, setSegments] = useState(INITIAL_PROGRESS_BAR_SEGMENTS);
  const barRef = useResizeObserver<HTMLDivElement>((entry) => {
    const width = entry.contentRect.width;
    if (!Number.isFinite(width) || width <= 0) {
      setSegments(INITIAL_PROGRESS_BAR_SEGMENTS);
      return;
    }
    const calculatedSegments = Math.max(
      MIN_PROGRESS_BAR_SEGMENTS,
      Math.min(
        MAX_PROGRESS_BAR_SEGMENTS,
        Math.floor(width / SEGMENT_PIXEL_TARGET),
      ),
    );
    setSegments((prev) =>
      prev === calculatedSegments ? prev : calculatedSegments,
    );
  });

  return (
    <div
      ref={barRef}
      className={clsx(
        "hidden min-w-0 flex-1 font-semibold",
        PROGRESS_SHOW_CLASS,
      )}
    >
      <span className="w-full overflow-hidden whitespace-nowrap">
        {buildProgressBar(percent, segments)}
      </span>
    </div>
  );
}

function buildProgressBar(percent: number, segments: number): string {
  const normalized = Math.max(0, Math.min(percent, 100));
  const filled = Math.round((normalized / 100) * segments);
  const empty = Math.max(segments - filled, 0);
  return `${"█".repeat(filled)}${"░".repeat(empty)}`;
}

function formatWindowLabelText(
  minutes: number | null,
  intl: IntlShape,
  options?: { withColon?: boolean },
): string {
  const withColon = options?.withColon !== false;
  let label: string;
  if (!minutes || minutes <= 0) {
    label = intl.formatMessage({
      id: "composer.statusPlain.rateLimitLabelBase",
      defaultMessage: "Rate limit",
      description: "Fallback label used when no time window is provided",
    });
  } else if (minutes % (60 * 24) === 0) {
    const days = minutes / (60 * 24);
    label = intl.formatMessage(
      {
        id: "composer.statusPlain.rateLimitDays",
        defaultMessage: "{count}d limit",
        description: "Label describing a day-based rate limit window",
      },
      { count: intl.formatNumber(days) },
    );
  } else if (minutes % 60 === 0) {
    const hours = minutes / 60;
    label = intl.formatMessage(
      {
        id: "composer.statusPlain.rateLimitHours",
        defaultMessage: "{count}h limit",
        description: "Label describing an hour-based rate limit window",
      },
      { count: intl.formatNumber(hours) },
    );
  } else {
    label = intl.formatMessage(
      {
        id: "composer.statusPlain.rateLimitMinutes",
        defaultMessage: "{count}m limit",
        description: "Label describing a minute-based rate limit window",
      },
      { count: intl.formatNumber(minutes) },
    );
  }
  return withColon ? `${label}:` : label;
}

function formatModelSectionLabelText(
  limitName: string,
  intl: IntlShape,
): string {
  const normalizedLimitName = limitName.replace(/_/g, "-");
  return intl.formatMessage(
    {
      id: "composer.statusPlain.modelRateLimitSectionLabel",
      defaultMessage: "{modelName} limit:",
      description:
        "Section label for model-specific rate limit rows in the status menu",
    },
    { modelName: normalizedLimitName },
  );
}

function renderValueWithMetadata(value: string | null): React.ReactNode {
  if (!value) {
    return null;
  }
  const match = value.match(/^(.*?)(\s*\(.+\))$/);
  if (!match) {
    return value;
  }
  const mainPart = match[1].trimEnd();
  const metadata = match[2].trim();
  return (
    <>
      {mainPart}
      {mainPart && metadata ? " " : null}
      <span
        className="text-token-description-foreground"
        data-chromatic="ignore"
      >
        {metadata}
      </span>
    </>
  );
}

function renderLineValue(value: ReactNode | null): React.ReactNode {
  if (value == null) {
    return renderValueWithMetadata(null);
  }
  if (typeof value === "string") {
    return renderValueWithMetadata(value);
  }
  return value;
}
