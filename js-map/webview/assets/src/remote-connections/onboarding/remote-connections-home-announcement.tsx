import type { useScope } from "maitai";
import type { ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import type { useNavigate } from "react-router";

import { OnboardingBanner } from "@/components/onboarding-banner";
import GlobeIcon from "@/icons/globe.svg";
import XIcon from "@/icons/x.svg";
import type { AppScope } from "@/scopes/app-scope";

import { hasSeenRemoteConnectionsHomeAnnouncement$ } from "./remote-connections-onboarding-signals";

export function RemoteConnectionsHomeAnnouncementContent({
  navigate,
  scope,
}: {
  navigate: ReturnType<typeof useNavigate>;
  scope: ReturnType<typeof useScope<typeof AppScope>>;
}): ReactElement {
  const intl = useIntl();

  return (
    <OnboardingBanner
      title={
        <FormattedMessage
          id="remoteConnections.homeBanner.title"
          defaultMessage="Let Codex work while you’re away"
          description="Title shown in the remote connections banner above the home composer"
        />
      }
      description={
        <FormattedMessage
          id="remoteConnections.homeBanner.body"
          defaultMessage="Run your threads on a remote machine and pick back up when you return."
          description="Body shown in the remote connections banner above the home composer"
        />
      }
      leadingVisual={<GlobeIcon className="icon-sm" />}
      primaryAction={{
        label: (
          <FormattedMessage
            id="remoteConnections.homeBanner.primary"
            defaultMessage="Add Connections"
            description="Primary CTA shown in the remote connections banner above the home composer"
          />
        ),
        onClick: () => {
          scope.set(hasSeenRemoteConnectionsHomeAnnouncement$, true);
          void navigate("/settings/connections");
        },
        className: "px-3 max-[400px]:flex-1 max-[400px]:justify-center",
      }}
      dismissAction={{
        ariaLabel: intl.formatMessage({
          id: "remoteConnections.homeBanner.dismiss",
          defaultMessage: "Dismiss remote connections banner",
          description:
            "Accessible label for dismissing the remote connections banner above the home composer",
        }),
        color: "ghost",
        icon: XIcon,
        onClick: () => {
          scope.set(hasSeenRemoteConnectionsHomeAnnouncement$, true);
        },
        uniform: true,
        className:
          "!border-transparent text-token-description-foreground hover:text-token-foreground",
      }}
    />
  );
}
