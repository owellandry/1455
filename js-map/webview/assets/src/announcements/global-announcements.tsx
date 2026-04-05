import { useAtom, useAtomValue } from "jotai";
import { useEffect, useRef, type ReactElement } from "react";

import { useFastModePersonalizedEstimate } from "@/components/use-fast-mode-personalized-estimate";
import {
  useFastModeAnnouncement,
  useModelUpgradeAnnouncement,
  useNewModelAnnouncement,
} from "@/hooks/use-announcement";
import { useServiceTierSettings } from "@/hooks/use-service-tier-settings";
import { coerceServiceTier } from "@/utils/service-tier";

import {
  aHasSeenFastModeAnnouncement,
  aHasShownAnnouncementThisSession,
} from "./announcement-atoms";
import {
  aAnnouncements,
  useProvideAnnouncement,
} from "./announcement-registry";
import { FastModeAnnouncementModal } from "./fast-mode-announcement-modal";
import {
  ModelUpgradeAnnouncementModal,
  NewModelAnnouncementModal,
} from "./new-model-announcement-modal";

const FAST_MODE_ANNOUNCEMENT_ID = "fast-mode-announcement";

export function GlobalAnnouncements(): ReactElement | null {
  useRegisterNewModelAnnouncement();
  useRegisterModelUpgradeAnnouncement();
  useRegisterFastModeAnnouncement();

  const announcements = useAtomValue(aAnnouncements);
  const [hasShownAnnouncementThisSession, setHasShownAnnouncementThisSession] =
    useAtom(aHasShownAnnouncementThisSession);
  // Keep one winner stable to avoid switching modals mid-session.
  const activeAnnouncementIdRef = useRef<string | null>(null);

  if (hasShownAnnouncementThisSession) {
    activeAnnouncementIdRef.current = null;
    return null;
  }

  let currentAnnouncement = announcements.find((announcement) => {
    return announcement.id === activeAnnouncementIdRef.current;
  });

  if (!currentAnnouncement?.enabled) {
    // Pick the first enabled announcement by registration order.
    currentAnnouncement = announcements.find((announcement) => {
      return announcement.enabled;
    });
    activeAnnouncementIdRef.current = currentAnnouncement?.id ?? null;
  }

  if (currentAnnouncement == null) {
    return null;
  }

  return currentAnnouncement.render(() => {
    // Dismissal ends announcements for this session.
    setHasShownAnnouncementThisSession(true);
    activeAnnouncementIdRef.current = null;
    currentAnnouncement.dismissAnnouncement();
  });
}

function useRegisterNewModelAnnouncement(): void {
  const {
    announcementContent: newModelAnnouncement,
    dismissAnnouncement: dismissNewModelAnnouncement,
    showAnnouncement: showNewModelAnnouncement,
  } = useNewModelAnnouncement();
  const enabled = showNewModelAnnouncement && newModelAnnouncement != null;
  const render: (dismissAnnouncement: () => void) => ReactElement | null =
    newModelAnnouncement == null
      ? (): null => null
      : (dismissAnnouncement: () => void): ReactElement => (
          <NewModelAnnouncementModal
            dismissAnnouncement={dismissAnnouncement}
            newModelAnnouncement={newModelAnnouncement}
          />
        );

  useProvideAnnouncement({
    id: "new-model-announcement",
    enabled,
    dismissAnnouncement: dismissNewModelAnnouncement,
    render,
    dependencies: [
      showNewModelAnnouncement,
      newModelAnnouncement?.model,
      newModelAnnouncement?.message,
    ],
  });
}

function useRegisterModelUpgradeAnnouncement(): void {
  const {
    announcementContent: modelUpgradeInfo,
    dismissAnnouncement: dismissUpgradeAnnouncement,
    showAnnouncement: showUpgradeAnnouncement,
  } = useModelUpgradeAnnouncement();
  const enabled = showUpgradeAnnouncement && modelUpgradeInfo != null;
  const render: (dismissAnnouncement: () => void) => ReactElement | null =
    modelUpgradeInfo == null
      ? (): null => null
      : (dismissAnnouncement: () => void): ReactElement => (
          <ModelUpgradeAnnouncementModal
            dismissAnnouncement={dismissAnnouncement}
            modelUpgradeInfo={modelUpgradeInfo}
          />
        );

  useProvideAnnouncement({
    id: "model-upgrade-announcement",
    enabled,
    dismissAnnouncement: dismissUpgradeAnnouncement,
    render,
    dependencies: [
      showUpgradeAnnouncement,
      modelUpgradeInfo?.model,
      modelUpgradeInfo?.upgradeCopy,
      modelUpgradeInfo?.modelLink,
      modelUpgradeInfo?.migrationMarkdown,
      modelUpgradeInfo?.reasoningEffort,
    ],
  });
}

function useRegisterFastModeAnnouncement(): void {
  const {
    announcementContent: fastModeAnnouncement,
    dismissAnnouncement: dismissFastModeAnnouncement,
    showAnnouncement: showFastModeAnnouncement,
  } = useFastModeAnnouncement();
  const [hasSeenFastModeAnnouncement, setHasSeenFastModeAnnouncement] = useAtom(
    aHasSeenFastModeAnnouncement,
  );
  const { serviceTierSettings } = useServiceTierSettings();
  const isFastModeOn =
    coerceServiceTier(serviceTierSettings.serviceTier) === "fast";
  const shouldLoadFastModeEstimate =
    !hasSeenFastModeAnnouncement &&
    showFastModeAnnouncement &&
    fastModeAnnouncement != null &&
    !serviceTierSettings.isLoading &&
    !isFastModeOn;
  const { estimate, estimateStatus, isEstimateFreshForAnnouncement } =
    useFastModePersonalizedEstimate(shouldLoadFastModeEstimate);
  const enabled =
    !hasSeenFastModeAnnouncement &&
    showFastModeAnnouncement &&
    fastModeAnnouncement != null &&
    estimateStatus === "ready" &&
    estimate != null &&
    isEstimateFreshForAnnouncement;
  const dismissAnnouncement = (): void => {
    setHasSeenFastModeAnnouncement(true);
    dismissFastModeAnnouncement();
  };
  const render: (dismissAnnouncement: () => void) => ReactElement | null =
    fastModeAnnouncement == null || estimate == null
      ? (): null => null
      : (dismissAnnouncement: () => void): ReactElement => (
          <FastModeAnnouncementModal
            dismissAnnouncement={dismissAnnouncement}
            estimate={estimate}
            fastModeAnnouncement={fastModeAnnouncement}
          />
        );

  useEffect(() => {
    if (
      serviceTierSettings.isLoading ||
      !isFastModeOn ||
      hasSeenFastModeAnnouncement
    ) {
      return;
    }

    setHasSeenFastModeAnnouncement(true);
  }, [
    hasSeenFastModeAnnouncement,
    isFastModeOn,
    serviceTierSettings.isLoading,
    setHasSeenFastModeAnnouncement,
  ]);

  useProvideAnnouncement({
    id: FAST_MODE_ANNOUNCEMENT_ID,
    enabled,
    dismissAnnouncement,
    render,
    dependencies: [
      showFastModeAnnouncement,
      fastModeAnnouncement?.model,
      estimate?.savedDuration,
      estimate?.threadCountLabel,
      estimateStatus,
      isEstimateFreshForAnnouncement,
      hasSeenFastModeAnnouncement,
      serviceTierSettings.isLoading,
      isFastModeOn,
    ],
  });
}
