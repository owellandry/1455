import { defineMessages, FormattedMessage } from "react-intl";

import { OnboardingBanner } from "@/components/onboarding-banner";
import LightningBoltIcon from "@/icons/lightning-bolt.svg";
import XIcon from "@/icons/x.svg";
import { productEventLogger$ } from "@/product-event-signal";

import type { FastModeHomeBannerState } from "./fast-mode-home-banner-state";

const FAST_MODE_MODEL = "gpt-5.4";

const messages = defineMessages({
  title: {
    id: "codex.fastModeHomeBanner.title",
    defaultMessage: "Toggle /Fast",
    description: "Title shown in the Fast mode home banner",
  },
  ctaPrimary: {
    id: "codex.fastModeHomeBanner.cta.primary",
    defaultMessage: "Enable now",
    description: "Primary CTA shown in the Fast mode home banner",
  },
  dismissLabel: {
    id: "codex.fastModeHomeBanner.dismissLabel",
    defaultMessage: "Dismiss Fast mode banner",
    description: "Accessible label for dismissing the Fast mode home banner",
  },
});

export function FastModeHomeBannerContent({
  content,
  intl,
  isSubmitting,
  modelSettings,
  scope,
  setHasSeenFastModeHomeBanner,
  setIsSubmitting,
  setModelAndReasoningEffort,
  setServiceTier,
}: FastModeHomeBannerState): React.ReactElement {
  return (
    <OnboardingBanner
      title={<FormattedMessage {...messages.title} />}
      description={content}
      leadingVisual={<LightningBoltIcon className="icon-sm text-[#FFC93C]" />}
      primaryAction={{
        label: <FormattedMessage {...messages.ctaPrimary} />,
        onClick: () => {
          setIsSubmitting(true);
          scope.get(productEventLogger$).log({
            eventName: "codex_fast_mode_banner_cta_clicked",
          });
          const updateModelPromise =
            modelSettings.model === FAST_MODE_MODEL
              ? Promise.resolve()
              : setModelAndReasoningEffort(
                  FAST_MODE_MODEL,
                  modelSettings.reasoningEffort,
                );

          void Promise.all([
            setServiceTier("fast", "home_banner"),
            updateModelPromise,
          ]).finally(() => {
            if (!__STORYBOOK__) {
              setHasSeenFastModeHomeBanner(true);
            }
            setIsSubmitting(false);
          });
        },
        disabled: isSubmitting,
        className: "px-3 max-[400px]:flex-1 max-[400px]:justify-center",
      }}
      dismissAction={{
        ariaLabel: intl.formatMessage(messages.dismissLabel),
        color: "ghost",
        icon: XIcon,
        onClick: () => {
          scope.get(productEventLogger$).log({
            eventName: "codex_fast_mode_banner_dismissed",
          });
          if (!__STORYBOOK__) {
            setHasSeenFastModeHomeBanner(true);
          }
        },
        disabled: isSubmitting,
        uniform: true,
        className:
          "!border-transparent text-token-description-foreground hover:text-token-foreground",
      }}
    />
  );
}
