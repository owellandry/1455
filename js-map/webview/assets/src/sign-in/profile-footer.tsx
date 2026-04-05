import type React from "react";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import { useAuth } from "@/auth/use-auth";
import { useAccounts, useCurrentAccount } from "@/codex-api";
import { Button } from "@/components/button";
import { NavItem } from "@/components/nav/nav-list";
import { CHATGPT_PRICING_URL } from "@/constants/links";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import { messageBus } from "@/message-bus";
import { useFetchFromVSCode } from "@/vscode-api";

import { ProfileDropdown } from "./profile-dropdown";
import { shouldShowUpgradeCta } from "./upgrade-cta-eligibility";

export function ProfileFooter(): React.ReactElement {
  const { authMethod, planAtLogin } = useAuth();
  const { data: accountsData } = useAccounts();
  const { data: account } = useCurrentAccount();
  const { data: accountInfo } = useFetchFromVSCode("account-info", {
    queryConfig: { enabled: authMethod === "chatgpt" },
  });
  const accountIconUrl = account?.profile_picture_url ?? null;
  const [failedAccountIconUrl, setFailedAccountIconUrl] = useState<
    string | null
  >(null);
  const plan = accountInfo?.plan ?? planAtLogin;
  const showUpgradeButton = shouldShowUpgradeCta({
    authMethod,
    plan,
    currentAccount: account,
    accounts: accountsData?.accounts,
  });

  const openUpgrade = (): void => {
    messageBus.dispatchMessage("open-in-browser", {
      url: CHATGPT_PRICING_URL,
    });
  };

  function AccountIcon({
    className,
  }: {
    className?: string;
  }): React.ReactElement {
    if (accountIconUrl && accountIconUrl !== failedAccountIconUrl) {
      return (
        <img
          src={accountIconUrl}
          alt=""
          className={`rounded-full ${className ?? ""}`}
          onError={() => {
            setFailedAccountIconUrl(accountIconUrl);
          }}
        />
      );
    }
    return <SettingsCogIcon className={className} />;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <ProfileDropdown
          triggerButton={
            <NavItem
              icon={AccountIcon}
              label={
                <FormattedMessage
                  id="codex.profileFooter.signedInFallback"
                  defaultMessage="Settings"
                  description="Label shown in profile footer"
                />
              }
              onClick={() => {}}
              iconClassName="icon-sm"
            />
          }
        />
      </div>
      {showUpgradeButton ? (
        <Button
          className="h-full shrink-0 rounded-lg px-2 text-sm"
          color="outline"
          onClick={openUpgrade}
        >
          <FormattedMessage
            id="codex.profileFooter.upgrade"
            defaultMessage="Upgrade"
            description="Button label in the sidebar footer to upgrade a free account"
          />
        </Button>
      ) : null}
    </div>
  );
}
