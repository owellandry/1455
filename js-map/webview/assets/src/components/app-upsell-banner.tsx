import { FormattedMessage, useIntl } from "react-intl";

import appLogo from "@/assets/app.png";
import { OnboardingBanner } from "@/components/onboarding-banner";
import XIcon from "@/icons/x.svg";
import { messageBus } from "@/message-bus";

export function AppUpsellBannerContent({
  message,
  setHasSeenAppUpsellBanner,
}: {
  message: React.ReactNode;
  setHasSeenAppUpsellBanner: (next: boolean) => void;
}): React.ReactElement {
  const intl = useIntl();

  return (
    <OnboardingBanner
      title={
        <FormattedMessage
          id="codex.appUpsellBanner.title"
          defaultMessage="Codex app"
          description="Title shown in the app upsell banner"
        />
      }
      description={message}
      leadingVisual={<img alt="" src={appLogo} className="h-8 w-8 shrink-0" />}
      leadingClassName="ml-0 h-8 w-8"
      primaryAction={{
        label: (
          <FormattedMessage
            id="codex.appUpsellBanner.download"
            defaultMessage="Download"
            description="Primary action label to download the Codex app"
          />
        ),
        onClick: () => {
          if (!__STORYBOOK__) {
            setHasSeenAppUpsellBanner(true);
          }
          messageBus.dispatchMessage("open-in-browser", {
            url: "https://persistent.oaistatic.com/codex-app-prod/Codex.dmg",
          });
        },
        className: "px-3 max-[400px]:flex-1 max-[400px]:justify-center",
      }}
      dismissAction={{
        ariaLabel: intl.formatMessage({
          id: "codex.appUpsellBanner.dismissLabel",
          defaultMessage: "Dismiss Codex app banner",
          description:
            "Accessible label for dismissing the Codex app upsell banner",
        }),
        color: "ghost",
        icon: XIcon,
        onClick: () => {
          if (!__STORYBOOK__) {
            setHasSeenAppUpsellBanner(true);
          }
        },
        uniform: true,
        className:
          "!border-transparent text-token-description-foreground hover:text-token-foreground",
      }}
    />
  );
}
