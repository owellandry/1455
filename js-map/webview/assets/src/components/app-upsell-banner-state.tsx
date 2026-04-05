import { useAtom } from "jotai";
import { FormattedMessage } from "react-intl";

import { useAuth } from "@/auth/use-auth";
import { usePlatform } from "@/hooks/use-platform";
import { persistedAtom } from "@/utils/persisted-atom";
import { AccountPlanType } from "@/utils/skus";
import { useFetchFromVSCode } from "@/vscode-api";

const aHasSeenAppUpsellBanner = persistedAtom<boolean>(
  "has-seen-app-upsell-banner",
  false,
);

function useAppUpsellBannerMessageState(hasSeenAppUpsellBanner: boolean): {
  isLoading: boolean;
  message: React.ReactNode | null;
} {
  const { platform, isLoading: platformLoading } = usePlatform();
  const { authMethod, planAtLogin, isLoading: authLoading } = useAuth();
  const isChatGptAuth = authMethod === "chatgpt";
  const isApiKeyAuth = authMethod === "apikey";
  const { data: accountInfo, isLoading: accountInfoLoading } =
    useFetchFromVSCode("account-info", {
      queryConfig: {
        enabled: isChatGptAuth || isApiKeyAuth,
      },
    });
  const isCopilotAuth = authMethod === "copilot";
  const isMac = platform === "macOS";
  const plan = (accountInfo?.plan ?? planAtLogin) as AccountPlanType | null;
  const isFreeOrGo =
    plan === AccountPlanType.FREE || plan === AccountPlanType.GO;
  const isBusiness = plan === AccountPlanType.SELF_SERVE_BUSINESS;
  const isLegacyEnterpriseAndEdu =
    plan === AccountPlanType.DEPRECATED_ENTERPRISE_2 ||
    plan === AccountPlanType.DEPRECATED_ENTERPRISE ||
    plan === AccountPlanType.DEPRECATED_EDU ||
    plan === AccountPlanType.DEPRECATED_EDU_2;
  const isPro = plan === AccountPlanType.PRO;
  const isProlite = plan === AccountPlanType.PROLITE;
  const isPlus = plan === AccountPlanType.PLUS;
  const isLoading =
    !hasSeenAppUpsellBanner &&
    (authLoading || platformLoading || (isChatGptAuth && accountInfoLoading));

  let message: React.ReactNode | null = null;

  if (
    !isLoading &&
    isMac &&
    !hasSeenAppUpsellBanner &&
    !isCopilotAuth &&
    authMethod &&
    accountInfo
  ) {
    if (
      isChatGptAuth &&
      (isPro || isProlite || isPlus || isBusiness || isLegacyEnterpriseAndEdu)
    ) {
      message = (
        <FormattedMessage
          id="codex.appUpsellBanner.proPlusBusiness.message"
          defaultMessage="Try the Codex app with 2x rate limits until April 2nd. Download now or {learnMoreLink}."
          description="Message shown in the app upsell banner for Pro, Plus, Business, and legacy enterprise plans"
          values={{
            learnMoreLink: (
              <a
                className="text-token-link focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
                href="https://chatgpt.com/codex"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FormattedMessage
                  id="codex.appUpsellBanner.learnMoreLowercase"
                  defaultMessage="learn more"
                  description="Lowercase learn more link text in the app upsell banner"
                />
              </a>
            ),
          }}
        />
      );
    } else if ((isChatGptAuth && !isFreeOrGo) || isApiKeyAuth) {
      message = (
        <FormattedMessage
          id="codex.appUpsellBanner.cbpApi.message"
          defaultMessage="Build faster with the Codex app. Download now or {learnMoreLink}."
          description="Message shown in the app upsell banner for CBP and API key users"
          values={{
            learnMoreLink: (
              <a
                className="text-token-link focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
                href="https://chatgpt.com/codex"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FormattedMessage
                  id="codex.appUpsellBanner.learnMoreLowercase"
                  defaultMessage="learn more"
                  description="Lowercase learn more link text in the app upsell banner"
                />
              </a>
            ),
          }}
        />
      );
    }
  }

  return {
    isLoading,
    message,
  };
}

export function useAppUpsellBannerState(): {
  isEligible: boolean;
  isLoading: boolean;
  message: React.ReactNode | null;
  setHasSeenAppUpsellBanner: (next: boolean) => void;
} {
  const [hasSeenAppUpsellBanner, setHasSeenAppUpsellBanner] = useAtom(
    aHasSeenAppUpsellBanner,
  );
  const { isLoading, message } = useAppUpsellBannerMessageState(
    hasSeenAppUpsellBanner,
  );

  return {
    isEligible: message != null,
    isLoading,
    message,
    setHasSeenAppUpsellBanner,
  };
}
