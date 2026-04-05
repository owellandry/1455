import type { RateLimitSnapshot, RateLimitWindow } from "app-server-types/v2";
import clsx from "clsx";
import { FormattedMessage } from "react-intl";

import { useAuth } from "@/auth/use-auth";
import { BulletSeparator } from "@/components/bullet-separator";
import { BasicSubDropdown, Dropdown } from "@/components/dropdown";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import LinkExternalIcon from "@/icons/link-external.svg";
import SpeedometerIcon from "@/icons/speedometer.svg";
import { AccountPlanType } from "@/utils/skus";
import {
  getActiveRateLimitAlertData,
  isDefaultRateLimitName,
  type RateLimitEntry,
} from "@/utils/use-rate-limit";
import { useFetchFromVSCode } from "@/vscode-api";

import {
  formatResetLocalTime,
  getRemainingRateLimitPercent,
  hasRenderableRateLimitWindow,
} from "./rate-limit-format";
import { RateLimitWindowLabel } from "./rate-limit-window-label";

export function RateLimitSummary({
  rateLimits,
  activeLimitName,
  suppressUpsell,
  selectedModel,
  layout = "default",
}: {
  rateLimits: Array<RateLimitEntry>;
  activeLimitName: string | null;
  suppressUpsell?: boolean;
  selectedModel?: string | null;
  layout?: "default" | "compact";
}): React.ReactElement | null {
  if (rateLimits.length === 0) {
    return null;
  }

  const alertData = getActiveRateLimitAlertData(rateLimits, {
    activeLimitName,
    selectedModel,
  });
  const shouldSuppressUpsell =
    suppressUpsell ?? !isDefaultRateLimitName(activeLimitName);
  const isCompactLayout = layout === "compact";
  const compactContentPaddingClass =
    "pl-[calc(var(--padding-row-x)+1.25rem)] pr-[var(--padding-row-x)]";
  const learnMoreRightIcon = ({
    className,
  }: {
    className?: string;
  }): React.ReactElement => (
    <LinkExternalIcon
      className={clsx(
        className,
        isCompactLayout && "text-token-description-foreground",
      )}
    />
  );
  return (
    <BasicSubDropdown
      trigger={
        <Dropdown.Item LeftIcon={SpeedometerIcon} RightIcon={ChevronRightIcon}>
          <span className="flex items-center gap-1">
            <FormattedMessage
              id="composer.mode.rateLimit.heading"
              defaultMessage="Rate limits remaining"
              description="Rate limit summary heading"
            />
            {alertData && (
              <span className="whitespace-nowrap text-token-input-placeholder-foreground opacity-60">
                {formatPercent(alertData.remainingPercent, { clamp: true })}
              </span>
            )}
          </span>
        </Dropdown.Item>
      }
    >
      <div className="flex flex-col text-sm">
        <div
          className={clsx(
            "grid items-center gap-y-1.5 py-1",
            isCompactLayout
              ? `grid-cols-[minmax(0,1fr)_auto] gap-x-3 ${compactContentPaddingClass}`
              : "grid-cols-[auto_1fr] gap-x-16 px-[var(--padding-row-x)]",
          )}
        >
          {rateLimits.map((entry, index) => {
            const normalizedLimitName = isDefaultRateLimitName(entry.limitName)
              ? null
              : entry.limitName;
            return (
              <RateLimitRows
                key={`${entry.limitName ?? "default"}-${index}`}
                rateLimit={entry.snapshot}
                limitName={normalizedLimitName}
                compact={isCompactLayout}
              />
            );
          })}
        </div>

        {!shouldSuppressUpsell && (
          <PlanUpgradeRow
            className={clsx(isCompactLayout && compactContentPaddingClass)}
          />
        )}
        <Dropdown.Item
          RightIcon={learnMoreRightIcon}
          className={clsx(isCompactLayout && compactContentPaddingClass)}
          href="https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan#h_8dd84c836b"
        >
          <span
            className={clsx(
              isCompactLayout
                ? "text-token-foreground"
                : "text-token-description-foreground",
            )}
          >
            <FormattedMessage
              id="composer.mode.local.learnMore"
              defaultMessage="Learn more"
              description="Learn more about rate limits"
            />
          </span>
        </Dropdown.Item>
      </div>
    </BasicSubDropdown>
  );
}

function RateLimitRows({
  rateLimit,
  limitName,
  compact,
}: {
  rateLimit: RateLimitSnapshot;
  limitName: string | null;
  compact: boolean;
}): React.ReactElement | null {
  const showPrimary = hasRenderableRateLimitWindow(rateLimit?.primary);
  const showSecondary = hasRenderableRateLimitWindow(rateLimit?.secondary);
  if (!showPrimary && !showSecondary) {
    return null;
  }
  return (
    <>
      {limitName != null && (
        <span
          title={formatLimitName(limitName)}
          className={clsx(
            "text-token-foreground col-span-2 min-w-0 truncate font-medium",
            compact ? "mt-1" : "mt-2",
          )}
        >
          <FormattedMessage
            id="composer.mode.rateLimit.modelSectionLabel"
            defaultMessage="{modelName} limit:"
            description="Section label shown before model-specific rate limit windows in summaries"
            values={{ modelName: formatLimitName(limitName) }}
          />
        </span>
      )}
      {showPrimary && (
        <RateLimitRow bucket={rateLimit.primary ?? null} compact={compact} />
      )}
      {showSecondary && (
        <RateLimitRow bucket={rateLimit.secondary ?? null} compact={compact} />
      )}
    </>
  );
}

function RateLimitRow({
  bucket,
  compact,
}: {
  bucket: RateLimitWindow | null;
  compact: boolean;
}): React.ReactElement | null {
  if (!hasRenderableRateLimitWindow(bucket)) {
    return null;
  }
  const when = formatResetLocalTime(bucket.resetsAt ?? null);
  const remainingPercent = getRemainingRateLimitPercent(
    bucket.usedPercent ?? 0,
  );
  return (
    <>
      <span
        className={clsx(
          "text-token-foreground font-medium",
          compact && "flex min-w-0 items-center gap-1",
        )}
      >
        <span className={clsx(compact && "shrink-0")}>
          <RateLimitWindowLabel
            minutes={bucket.windowDurationMins ?? null}
            variant="summary"
          />
        </span>
      </span>
      <span
        className={clsx(
          "text-token-description-foreground flex gap-1 text-end",
          compact
            ? "min-w-0 items-center justify-end"
            : "w-full min-w-0 items-center justify-end overflow-hidden",
        )}
      >
        <span className="shrink-0">
          {formatPercent(remainingPercent, { clamp: true })}
        </span>
        {when && (
          <>
            <span className="shrink-0">
              <BulletSeparator />
            </span>
            <span
              title={when}
              className={clsx(
                "text-token-description-foreground flex items-center gap-1",
                "min-w-0 truncate text-right",
              )}
            >
              {when}
            </span>
          </>
        )}
      </span>
    </>
  );
}

function clampPercentage(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}

function formatPercent(
  value: number,
  options?: {
    clamp?: boolean;
  },
): string {
  if (!Number.isFinite(value)) {
    return "–";
  }
  const formattedValue = options?.clamp ? clampPercentage(value) : value;
  return `${Math.round(formattedValue)}%`;
}

function formatLimitName(limitName: string): string {
  return limitName.replace(/_/g, "-");
}

function PlanUpgradeRow({
  className,
}: {
  className?: string;
}): React.ReactElement | null {
  const { planAtLogin, authMethod } = useAuth();
  const { data: accountInfo } = useFetchFromVSCode("account-info", {
    queryConfig: { enabled: authMethod === "chatgpt" },
  });

  const plan = (accountInfo?.plan ?? planAtLogin) as
    | AccountPlanType
    | undefined;

  switch (plan) {
    case AccountPlanType.FREE:
    case AccountPlanType.GO: {
      return (
        <Dropdown.Item
          RightIcon={LinkExternalIcon}
          className={className}
          href="https://openai.com/chatgpt/pricing"
        >
          <FormattedMessage
            id="composer.mode.upgradeToPlus"
            defaultMessage="Upgrade to Plus"
            description="Upgrade to Plus message for free plan"
          />
        </Dropdown.Item>
      );
    }
    case AccountPlanType.PLUS: {
      return (
        <Dropdown.Item
          RightIcon={LinkExternalIcon}
          className={className}
          href="https://openai.com/chatgpt/pricing"
        >
          <FormattedMessage
            id="composer.mode.upgradeToPro"
            defaultMessage="Upgrade to Pro"
            description="Upgrade to Pro"
          />
        </Dropdown.Item>
      );
    }
    case AccountPlanType.PROLITE: {
      return (
        <Dropdown.Item
          RightIcon={LinkExternalIcon}
          className={className}
          href="https://openai.com/chatgpt/pricing"
        >
          <FormattedMessage
            id="composer.mode.upgradeForMoreUsage"
            defaultMessage="Upgrade for more usage"
            description="Upgrade for more usage"
          />
        </Dropdown.Item>
      );
    }
    case AccountPlanType.PRO:
      return null;
    case AccountPlanType.SELF_SERVE_BUSINESS:
    case AccountPlanType.SELF_SERVE_BUSINESS_USAGE_BASED:
    case AccountPlanType.ENTERPRISE_CBP:
    case AccountPlanType.ENTERPRISE_CBP_USAGE_BASED:
    case AccountPlanType.EDUCATION_CBP:
    case AccountPlanType.QUORUM:
    case AccountPlanType.DEPRECATED_ENTERPRISE:
    case AccountPlanType.DEPRECATED_ENTERPRISE_2:
    case AccountPlanType.DEPRECATED_EDU:
    case AccountPlanType.HC:
    case AccountPlanType.FINSERV:
    case AccountPlanType.DEPRECATED_EDU_2: {
      return (
        <Dropdown.Item className={className} allowWrap={true}>
          <span className="text-token-description-foreground">
            <FormattedMessage
              id="composer.mode.contactAdmin"
              defaultMessage="To get more access, contact your admin"
              description="Suggest contacting admin for increased access"
            />
          </span>
        </Dropdown.Item>
      );
    }
    case undefined: {
      return null;
    }
  }
}
