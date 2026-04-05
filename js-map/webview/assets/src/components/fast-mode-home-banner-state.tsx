import { useAtom } from "jotai";
import { useScope } from "maitai";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useCanUseFastMode } from "@/hooks/use-is-fast-mode-enabled";
import { useModelSettings } from "@/hooks/use-model-settings";
import { useServiceTierSettings } from "@/hooks/use-service-tier-settings";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";
import { persistedAtom } from "@/utils/persisted-atom";
import { coerceServiceTier } from "@/utils/service-tier";

import {
  fastModePersonalizedEstimateMessages,
  useFastModePersonalizedEstimate,
} from "./use-fast-mode-personalized-estimate";

const aHasSeenFastModeHomeBanner = persistedAtom<boolean>(
  "has-seen-fast-mode-home-banner",
  false,
);

export type FastModeHomeBannerState = {
  content: React.ReactNode | null;
  intl: ReturnType<typeof useIntl>;
  isEligible: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  modelSettings: ReturnType<typeof useModelSettings>["modelSettings"];
  scope: ReturnType<typeof useScope<typeof AppScope>>;
  setHasSeenFastModeHomeBanner: (next: boolean) => void;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setModelAndReasoningEffort: ReturnType<
    typeof useModelSettings
  >["setModelAndReasoningEffort"];
  setServiceTier: ReturnType<typeof useServiceTierSettings>["setServiceTier"];
};

export function useFastModeHomeBannerState(): FastModeHomeBannerState {
  const intl = useIntl();
  const canUseFastMode = useCanUseFastMode();
  const scope = useScope(AppScope);
  const [hasSeenFastModeHomeBanner, setHasSeenFastModeHomeBanner] = useAtom(
    aHasSeenFastModeHomeBanner,
  );
  const { modelSettings, setModelAndReasoningEffort } = useModelSettings();
  const { serviceTierSettings, setServiceTier } = useServiceTierSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasLoggedViewRef = useRef(false);
  const currentServiceTier = coerceServiceTier(serviceTierSettings.serviceTier);
  const shouldShowBanner =
    canUseFastMode &&
    !hasSeenFastModeHomeBanner &&
    currentServiceTier !== "fast" &&
    !serviceTierSettings.isLoading;
  const { estimate, estimateStatus } =
    useFastModePersonalizedEstimate(shouldShowBanner);
  const isLoading =
    !hasSeenFastModeHomeBanner &&
    (serviceTierSettings.isLoading ||
      (shouldShowBanner &&
        estimateStatus !== "ready" &&
        estimateStatus !== "failed"));
  const isEligible =
    shouldShowBanner && estimateStatus === "ready" && estimate != null;

  useEffect(() => {
    if (!isEligible || hasLoggedViewRef.current) {
      return;
    }

    hasLoggedViewRef.current = true;
    scope.get(productEventLogger$).log({
      eventName: "codex_fast_mode_banner_viewed",
    });
  }, [scope, isEligible]);

  const content =
    estimate == null ? null : (
      <FormattedMessage
        {...fastModePersonalizedEstimateMessages.bodyPersonalized}
        values={{
          threadCountLabel: estimate.threadCountLabel,
          duration: estimate.savedDuration,
        }}
      />
    );

  return {
    content,
    intl,
    isEligible,
    isLoading,
    isSubmitting,
    modelSettings,
    scope,
    setHasSeenFastModeHomeBanner,
    setIsSubmitting,
    setModelAndReasoningEffort,
    setServiceTier,
  };
}
