import { useSetAtom } from "jotai";
import { useScope } from "maitai";
import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import { FormattedMessage } from "react-intl";

import gradientBackground from "@/assets/gradient.png";
import {
  fastModePersonalizedEstimateMessages,
  type PersonalizedEstimate,
} from "@/components/use-fast-mode-personalized-estimate";
import type { FastModeAnnouncement } from "@/hooks/use-announcement";
import { useModelSettings } from "@/hooks/use-model-settings";
import { useServiceTierSettings } from "@/hooks/use-service-tier-settings";
import LightningBoltIcon from "@/icons/lightning-bolt.svg";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";

import { aHasShownAnnouncementThisSession } from "./announcement-atoms";
import { AnnouncementModal } from "./announcement-modal";

export function FastModeAnnouncementModal({
  dismissAnnouncement,
  estimate,
  fastModeAnnouncement,
}: {
  dismissAnnouncement: () => void;
  estimate: PersonalizedEstimate;
  fastModeAnnouncement: FastModeAnnouncement;
}): ReactElement {
  const scope = useScope(AppScope);
  const { modelSettings, setModelAndReasoningEffort } = useModelSettings();
  const { setServiceTier } = useServiceTierSettings();
  const setHasShownAnnouncementThisSession = useSetAtom(
    aHasShownAnnouncementThisSession,
  );
  const hasLoggedViewRef = useRef(false);

  useEffect(() => {
    if (hasLoggedViewRef.current) {
      return;
    }

    hasLoggedViewRef.current = true;
    scope.get(productEventLogger$).log({
      eventName: "codex_fast_mode_announcement_viewed",
    });
  }, [scope]);

  const handleUseStandardSpeed = (): void => {
    setHasShownAnnouncementThisSession(true);
    scope.get(productEventLogger$).log({
      eventName: "codex_fast_mode_announcement_dismissed",
    });
    void setServiceTier(null, "fast_mode_announcement");
    dismissAnnouncement();
  };

  const handleTurnOnFastMode = async (): Promise<void> => {
    setHasShownAnnouncementThisSession(true);
    scope.get(productEventLogger$).log({
      eventName: "codex_fast_mode_announcement_cta_clicked",
    });
    await Promise.all([
      setModelAndReasoningEffort(
        fastModeAnnouncement.model,
        modelSettings.reasoningEffort,
      ),
      setServiceTier("fast", "fast_mode_announcement"),
    ]);
    dismissAnnouncement();
  };

  return (
    <AnnouncementModal
      title={
        <FormattedMessage
          id="codexFastModeAnnouncementModal.title"
          defaultMessage="Introducing Fast mode"
          description="Title for the Fast mode announcement modal"
        />
      }
      body={
        <p className="text-base leading-normal tracking-normal text-token-description-foreground">
          <FormattedMessage
            {...fastModePersonalizedEstimateMessages.bodyPersonalized}
            values={{
              threadCountLabel: estimate.threadCountLabel,
              duration: estimate.savedDuration,
            }}
          />
        </p>
      }
      media={
        <div className="relative h-full w-full">
          <img
            src={gradientBackground}
            alt={fastModeAnnouncement.model}
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5">
            <div className="flex max-w-full items-center gap-2 rounded-full bg-token-text-link-foreground/20 px-5 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md">
              <LightningBoltIcon className="icon-sm shrink-0 text-white" />
              <span className="text-base leading-tight font-medium whitespace-nowrap">
                <FormattedMessage
                  id="codexFastModeAnnouncementModal.heroLabel"
                  defaultMessage="Frontier intelligence, 1.5x the speed"
                  description="Label shown over the Fast mode announcement hero image"
                />
              </span>
            </div>
          </div>
        </div>
      }
      dismissLabel={
        <FormattedMessage
          id="codexFastModeAnnouncementModal.dismissLabel"
          defaultMessage="Use standard speed"
          description="Secondary action to dismiss the Fast mode announcement and keep standard speed"
        />
      }
      primaryActionLabel={
        <FormattedMessage
          id="codexFastModeAnnouncementModal.primaryActionLabel"
          defaultMessage="Turn on Fast mode"
          description="Primary action to enable Fast mode from the announcement"
        />
      }
      onDismiss={handleUseStandardSpeed}
      onPrimaryAction={handleTurnOnFastMode}
    />
  );
}
