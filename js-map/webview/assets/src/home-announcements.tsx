import type { ReactElement } from "react";

import { AppUpsellBannerContent } from "@/components/app-upsell-banner";
import { useAppUpsellBannerState } from "@/components/app-upsell-banner-state";
import { FastModeHomeBannerContent } from "@/components/fast-mode-home-banner";
import { useFastModeHomeBannerState } from "@/components/fast-mode-home-banner-state";
import { WithWindow } from "@/components/with-window";
import { MultiAgentComposerBanner } from "@/composer/multi-agent-composer-banner";
import { useMultiAgentHomeAnnouncementState } from "@/composer/multi-agent-home-announcement-state";
import {
  type HomeAnnouncementEntry,
  HomeAnnouncementSlot,
} from "@/home-announcement-slot";
import { RemoteConnectionsHomeAnnouncementContent } from "@/remote-connections/onboarding/remote-connections-home-announcement";
import { useRemoteConnectionsHomeAnnouncementState } from "@/remote-connections/onboarding/remote-connections-home-announcement-state";

export function HomeAnnouncements(): ReactElement {
  return (
    <>
      <WithWindow electron>
        <ElectronHomeAnnouncements />
      </WithWindow>
      <WithWindow extension>
        <ExtensionHomeAnnouncements />
      </WithWindow>
    </>
  );
}

function ElectronHomeAnnouncements(): ReactElement {
  const remoteConnectionsBanner = useRemoteConnectionsHomeAnnouncementState();
  const multiAgentBanner = useMultiAgentHomeAnnouncementState();
  const fastModeBanner = useFastModeHomeBannerState();
  const entries: Array<HomeAnnouncementEntry> = [
    {
      isEligible: remoteConnectionsBanner.isEligible,
      isLoading: remoteConnectionsBanner.isLoading,
      content: (
        <RemoteConnectionsHomeAnnouncementContent
          navigate={remoteConnectionsBanner.navigate}
          scope={remoteConnectionsBanner.scope}
        />
      ),
    },
    {
      isEligible: multiAgentBanner.isEligible,
      isLoading: multiAgentBanner.isLoading,
      content: <MultiAgentComposerBanner />,
    },
    {
      isEligible: fastModeBanner.isEligible,
      isLoading: fastModeBanner.isLoading,
      content:
        fastModeBanner.content == null ? null : (
          <FastModeHomeBannerContent {...fastModeBanner} />
        ),
    },
  ];

  return <HomeAnnouncementSlot entries={entries} />;
}

function ExtensionHomeAnnouncements(): ReactElement {
  const appUpsellBanner = useAppUpsellBannerState();
  const multiAgentBanner = useMultiAgentHomeAnnouncementState();
  const fastModeBanner = useFastModeHomeBannerState();
  const entries: Array<HomeAnnouncementEntry> = [
    {
      isEligible: appUpsellBanner.isEligible,
      isLoading: appUpsellBanner.isLoading,
      content:
        appUpsellBanner.message == null ? null : (
          <AppUpsellBannerContent
            message={appUpsellBanner.message}
            setHasSeenAppUpsellBanner={
              appUpsellBanner.setHasSeenAppUpsellBanner
            }
          />
        ),
    },
    {
      isEligible: multiAgentBanner.isEligible,
      isLoading: multiAgentBanner.isLoading,
      content: <MultiAgentComposerBanner />,
    },
    {
      isEligible: fastModeBanner.isEligible,
      isLoading: fastModeBanner.isLoading,
      content:
        fastModeBanner.content == null ? null : (
          <FastModeHomeBannerContent {...fastModeBanner} />
        ),
    },
  ];

  return <HomeAnnouncementSlot entries={entries} />;
}
