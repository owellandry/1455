import type { RateLimitStatusPayload } from "protocol";
import { CODEX_HOME_URL } from "protocol";
import type { ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useCurrentAccount, useCurrentAccountUserRole } from "@/codex-api";
import { Banner } from "@/components/banner";
import SpeedometerIcon from "@/icons/speedometer.svg";
import {
  areCreditsDepleted,
  formatResetDateTime,
  getRateLimitResetAt,
  isUsageBasedSeatSpendCapReached,
} from "@/utils/rate-limit-status";
import { AccountPlanType, isUsageBasedSeatPlan } from "@/utils/skus";

const PLUS_1_MONTH_FREE_CAMPAIGN_ID = "plus-1-month-free";

export function RateLimitUpsellBanner({
  rateLimitStatus,
}: {
  rateLimitStatus: RateLimitStatusPayload;
}): React.ReactElement | null {
  const intl = useIntl();
  const { data: currentAccount } = useCurrentAccount();
  const { data: currentAccountUserRole } = useCurrentAccountUserRole();
  const formattedResetDate = formatResetDateTime(
    intl,
    getRateLimitResetAt(rateLimitStatus) ?? 0,
  );
  const planType = rateLimitStatus.plan_type;
  const usagePageUrl = `${CODEX_HOME_URL}/settings/usage`;
  const adminBillingUrl = "https://chatgpt.com/admin/billing";
  const openLink =
    (url: string): (() => void) =>
    () => {
      window.open(url, "_blank", "noopener,noreferrer");
    };

  const isSelfServeBusinessPlan =
    planType === AccountPlanType.SELF_SERVE_BUSINESS;
  const isUsageBasedBusinessPlan = isUsageBasedSeatPlan(planType);
  const isCBP =
    planType === AccountPlanType.EDUCATION_CBP ||
    planType === AccountPlanType.ENTERPRISE_CBP;
  const isPro = planType === AccountPlanType.PRO;
  const isProLite = planType === AccountPlanType.PROLITE;
  const isPlus = planType === AccountPlanType.PLUS;
  const isFree = planType === AccountPlanType.FREE;
  const isGo = planType === AccountPlanType.GO;
  const promoCampaignId = rateLimitStatus.promo?.campaign_id;
  const creditsDepleted = areCreditsDepleted(rateLimitStatus);
  const isWorkspaceOwner =
    currentAccount?.structure === "workspace" &&
    currentAccountUserRole === "account-owner";
  const usageBasedSeatCreditsExhausted =
    isUsageBasedBusinessPlan && creditsDepleted;
  const usageBasedSeatBlockedBySpendCap =
    isUsageBasedSeatSpendCapReached(rateLimitStatus) ||
    isUsageBasedBusinessPlan;

  let message: ReactNode;
  let primaryCtaText: ReactNode = (
    <FormattedMessage
      id="codex.upsellBanner.cta.viewUsage"
      defaultMessage="View Usage"
      description="CTA to direct the user to the usage page"
    />
  );
  const upgradeAccountCtaText: ReactNode = (
    <FormattedMessage
      id="codex.upsellBanner.cta.upgradeAccount"
      defaultMessage="Upgrade"
      description="CTA to upgrade the user's account plan"
    />
  );
  const addCreditsCtaText: ReactNode = (
    <FormattedMessage
      id="codex.upsellBanner.cta.addCredits"
      defaultMessage="Add Credits"
      description="CTA to add credits to the user's account"
    />
  );
  let onPrimaryCtaClick = openLink(usagePageUrl);
  let secondaryCtaText: ReactNode | null = null;
  let onSecondaryCtaClick = undefined;
  let title: ReactNode = (
    <FormattedMessage
      id="codex.upsellBanner.general.title"
      defaultMessage="You’re out of Codex messages"
      description="Credit upsell banner title for legacy plan users hitting their rate limit"
    />
  );

  if (usageBasedSeatCreditsExhausted && isWorkspaceOwner) {
    title = (
      <FormattedMessage
        id="codex.upsellBanner.usageBased.credits.title"
        defaultMessage="You're out of credits"
        description="Title for usage-based seat users who have exhausted workspace credits"
      />
    );
    message = (
      <FormattedMessage
        id="codex.upsellBanner.usageBased.credits.headline"
        defaultMessage="Your workspace is out of credits. Add credits to continue using Codex."
        description="Banner message for usage-based seat users when workspace credits are exhausted"
      />
    );
    primaryCtaText = addCreditsCtaText;
    onPrimaryCtaClick = openLink(adminBillingUrl);
  } else if (usageBasedSeatBlockedBySpendCap && isWorkspaceOwner) {
    title = (
      <FormattedMessage
        id="codex.upsellBanner.usageBased.spendCap.owner.title"
        defaultMessage="You’ve reached your workspace spend cap"
        description="Title for workspace owners on usage-based seat plans when spend cap blocks usage"
      />
    );
    message = (
      <FormattedMessage
        id="codex.upsellBanner.usageBased.spendCap.owner.headline"
        defaultMessage="Please increase spend cap to continue."
        description="Banner message for workspace owners on usage-based seat plans when spend cap blocks usage"
      />
    );
    primaryCtaText = (
      <FormattedMessage
        id="codex.upsellBanner.cta.increaseSpendCap"
        defaultMessage="Increase Spend Cap"
        description="CTA to increase the user's workspace spend cap"
      />
    );
    onPrimaryCtaClick = openLink(adminBillingUrl);
  } else if (usageBasedSeatBlockedBySpendCap) {
    title = (
      <FormattedMessage
        id="codex.upsellBanner.usageBased.spendCap.nonOwner.title"
        defaultMessage="You’ve reached your workspace spend cap"
        description="Title for non-owners on usage-based seat plans when spend cap blocks usage"
      />
    );
    message = (
      <FormattedMessage
        id="codex.upsellBanner.usageBased.spendCap.nonOwner.headline"
        defaultMessage="Please ask an admin to increase spend cap to continue."
        description="Banner message for non-owners on usage-based seat plans when spend cap blocks usage"
      />
    );
  } else if (usageBasedSeatCreditsExhausted) {
    title = (
      <FormattedMessage
        id="codex.upsellBanner.usageBased.credits.nonOwner.title"
        defaultMessage="You’ve reached your workspace credit limit"
        description="Title for non-owners on usage-based seat plans when workspace credits are exhausted"
      />
    );
    message = (
      <FormattedMessage
        id="codex.upsellBanner.usageBased.credits.nonOwner.headline"
        defaultMessage="You've reached your workspace credit limit as set by your admin. Contact your admin to increase your limit."
        description="Banner message for non-owners on usage-based seat plans when workspace credits are exhausted"
      />
    );
  } else if (isSelfServeBusinessPlan) {
    // Non usage-based team plans still reset on a time window and cannot purchase additional credits directly.
    message = (
      <FormattedMessage
        id="codex.upsellBanner.business.headline"
        defaultMessage="To get more access now, send a request to your admin, or wait until {resetDate}."
        description="Credit upsell banner message for when the user runs out of credits to use Codex"
        values={{
          resetDate: formattedResetDate,
        }}
      />
    );
  } else if (isCBP) {
    message = (
      <FormattedMessage
        id="codex.upsellBanner.cbp.headline"
        defaultMessage="To get more access now, send a request to your admin."
        description="Credit upsell banner for the CBP plan prompting user to ask their admin to buy more credits "
      />
    );
  } else if (isPlus) {
    message = (
      <FormattedMessage
        id="codex.upsellBanner.plus.headline"
        defaultMessage="Your rate limit resets on {resetDate}. To continue using Codex, add credits or upgrade to Pro today."
        description="Credit upsell banner for the Plus plan prompting user to buy more credits or upgrade their plan"
        values={{
          resetDate: formattedResetDate,
        }}
      />
    );
    primaryCtaText = upgradeAccountCtaText;
    onPrimaryCtaClick = openLink("https://chatgpt.com/explore/pro");
    secondaryCtaText = addCreditsCtaText;
    onSecondaryCtaClick = openLink(`${usagePageUrl}?credits_modal=true`);
  } else if (isProLite) {
    message = (
      <FormattedMessage
        id="codex.upsellBanner.prolite.headline2"
        defaultMessage="You're out of Codex messages. Wait until your balance resets on {resetDate}, or upgrade for 20x usage compared to Plus."
        description="Upsell banner for the Pro Lite plan prompting user to upgrade their plan for more usage"
        values={{
          resetDate: formattedResetDate,
        }}
      />
    );
    primaryCtaText = upgradeAccountCtaText;
    onPrimaryCtaClick = openLink("https://chatgpt.com/explore/pro");
    secondaryCtaText = addCreditsCtaText;
    onSecondaryCtaClick = openLink(`${usagePageUrl}?credits_modal=true`);
  } else if (isPro) {
    message = (
      <FormattedMessage
        id="codex.upsellBanner.pro.headline"
        defaultMessage="Your rate limit resets on {resetDate}. Add credits to continue using Codex now."
        description="Credit upsell banner for the Pro plan prompting user to buy more credits"
        values={{
          resetDate: formattedResetDate,
        }}
      />
    );
    primaryCtaText = addCreditsCtaText;
    onPrimaryCtaClick = openLink(`${usagePageUrl}?credits_modal=true`);
  } else if (isFree && promoCampaignId === PLUS_1_MONTH_FREE_CAMPAIGN_ID) {
    message = (
      <FormattedMessage
        id="codex.upsellBanner.free.trialHeadline"
        defaultMessage="Your rate limit resets on {resetDate}. To continue using Codex and get access to GPT-5.3-Codex, start your free trial of Plus today."
        description="Credit upsell banner for free plans hitting their rate limit"
        values={{
          resetDate: formattedResetDate,
        }}
      />
    );
    primaryCtaText = upgradeAccountCtaText;
    onPrimaryCtaClick = openLink("https://chatgpt.com/explore/plus");
  } else if (isGo && promoCampaignId === PLUS_1_MONTH_FREE_CAMPAIGN_ID) {
    message = (
      <FormattedMessage
        id="codex.upsellBanner.go.trialHeadline"
        defaultMessage="Your rate limit resets on {resetDate}. To continue using Codex, start your free trial of Plus today."
        description="Credit upsell banner for Go plans hitting their rate limit"
        values={{
          resetDate: formattedResetDate,
        }}
      />
    );
    primaryCtaText = upgradeAccountCtaText;
    onPrimaryCtaClick = openLink("https://chatgpt.com/explore/plus");
  } else if (isFree || isGo) {
    message = (
      <FormattedMessage
        id="codex.upsellBanner.freeOrGo.headline"
        defaultMessage="Your rate limit resets on {resetDate}. To continue using Codex, upgrade to Plus today."
        description="Credit upsell banner for free or Go plans hitting their rate limit"
        values={{
          resetDate: formattedResetDate,
        }}
      />
    );
    primaryCtaText = upgradeAccountCtaText;
    onPrimaryCtaClick = openLink("https://chatgpt.com/explore/plus");
  } else {
    // For legacy plans, there is only rate limits, not credits
    // For new edu / ent, they will not have rate limits and thus will never see this banner - they are unlimited / charge by credits
    message = (
      <FormattedMessage
        id="codex.upsellBanner.general.headline"
        defaultMessage="Your rate limit resets on {resetDate}."
        description="Credit upsell banner for legacy plan users hitting their rate limit"
        values={{
          resetDate: formattedResetDate,
        }}
      />
    );
  }

  return (
    <Banner
      type="info"
      Icon={SpeedometerIcon}
      primaryCtaColor="primary"
      secondaryCtaColor="secondary"
      layout="horizontal"
      title={
        <div className="flex w-full min-w-0 flex-col gap-1 text-sm">
          {title}
          <span className="leading-[18px] font-normal text-token-description-foreground">
            {message}
          </span>
        </div>
      }
      content={null}
      primaryCtaText={primaryCtaText}
      onPrimaryCtaClick={onPrimaryCtaClick}
      secondaryCtaText={secondaryCtaText}
      onSecondaryCtaClick={onSecondaryCtaClick}
    />
  );
}

export function RateLimitModelLimitBanner({
  modelName,
  resetAt,
}: {
  modelName?: string | null;
  resetAt?: number | null;
}): React.ReactElement {
  const intl = useIntl();
  const formattedModelName = formatLimitName(modelName);
  const formattedResetDate =
    resetAt != null ? formatResetDateTime(intl, resetAt) : null;

  return (
    <Banner
      type="info"
      Icon={SpeedometerIcon}
      layout="horizontal"
      title={
        <div className="flex w-full min-w-0 flex-col gap-1 text-sm">
          <FormattedMessage
            id="codex.modelLimitBanner.title"
            defaultMessage="Selected model is out of usage"
            description="Title for the banner shown when the selected model is usage limited"
          />
          <span className="leading-[18px] font-normal text-token-description-foreground">
            {formattedResetDate != null ? (
              <FormattedMessage
                id="codex.modelLimitBanner.headline.withReset"
                defaultMessage="You've hit your usage limit for {modelName}. Try again after {resetDate}, or start a new conversation with another model."
                description="Banner text shown when a model-specific usage limit includes a reset time"
                values={{
                  modelName: formattedModelName,
                  resetDate: formattedResetDate,
                }}
              />
            ) : (
              <FormattedMessage
                id="codex.modelLimitBanner.headline.noReset"
                defaultMessage="You've hit your usage limit for {modelName}. Try again later, or start a new conversation with another model."
                description="Banner text shown when a model-specific usage limit does not include a reset time"
                values={{ modelName: formattedModelName }}
              />
            )}
          </span>
        </div>
      }
      content={null}
    />
  );
}

function formatLimitName(limitName: string | null | undefined): string {
  if (limitName == null || limitName.trim().length === 0) {
    return "This model";
  }
  return limitName.replace(/_/g, "-");
}
