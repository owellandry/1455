import type * as AppServer from "app-server-types";
import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { getManageAppUrl } from "@/apps/app-connect-actions";
import { Button } from "@/components/button";
import { CardStatusIndicator } from "@/components/card-status-indicator";
import { CardTile } from "@/components/card-tile";
import { ConnectorLogo } from "@/components/connector-logo";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { MoreMenuTrigger } from "@/components/more-menu-trigger";
import { Spinner } from "@/components/spinner";
import { Toggle } from "@/components/toggle";
import { Tooltip } from "@/components/tooltip";
import CheckIcon from "@/icons/check-md.svg";
import ConnectedAppsIcon from "@/icons/connected-apps.svg";
import PlusIcon from "@/icons/plus.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import SlashIcon from "@/icons/slash.svg";

import type { InstalledCardAction } from "./installed-card-action";

const messages = defineMessages({
  noDescription: {
    id: "skills.appsPage.apps.noDescription",
    defaultMessage: "No description",
    description:
      "Fallback description for apps without description text on the Skills & Apps page",
  },
  manageOnChatGpt: {
    id: "skills.appsPage.apps.manageOnChatGpt",
    defaultMessage: "Manage on ChatGPT",
    description:
      "Button label to manage an installed app on ChatGPT from the Skills & Apps page",
  },
  moreActions: {
    id: "skills.appsPage.apps.moreActions",
    defaultMessage: "More actions",
    description: "Aria label for the app card actions menu trigger",
  },
  disableToggleTooltip: {
    id: "skills.appsPage.apps.disableToggle",
    defaultMessage: "Disable app",
    description:
      "Tooltip label for disabling an app from the Skills & Apps page",
  },
  enableToggleTooltip: {
    id: "skills.appsPage.apps.enableToggleTooltip",
    defaultMessage: "Enable app",
    description:
      "Tooltip label for enabling an app from the Skills & Apps page",
  },
  enableToggleAria: {
    id: "skills.appsPage.apps.enableToggle",
    defaultMessage: "Enable app",
    description:
      "Accessible label for toggling whether an installed app is enabled from the Skills & Apps page",
  },
  connectingApp: {
    id: "skills.appsPage.apps.connecting",
    defaultMessage: "Continue connecting app",
    description:
      "Accessible label for the button shown while an app OAuth flow is still finishing on the Skills & Apps page",
  },
  installApp: {
    id: "skills.appsPage.apps.installOnChatGpt",
    defaultMessage: "Install",
    description: "Button label to install an app from the Skills & Apps page",
  },
  enabledStatus: {
    id: "skills.appsPage.apps.enabledStatus",
    defaultMessage: "App enabled",
    description: "Status label for an installed app that is enabled",
  },
  disabledStatus: {
    id: "skills.appsPage.apps.disabledStatus",
    defaultMessage: "App disabled",
    description: "Status label for an installed app that is disabled",
  },
});

export function AppCard({
  app,
  cardIcon,
  cardIconContainer = true,
  badges,
  className,
  installBlockedReason = null,
  installedStateAction = "check",
  manageAction = "button",
  isConnectingApp,
  showInstallAction = true,
  updatingAppId,
  onInstallApp,
  onOpenAppTools,
  onOpenAppUrl,
  onSetAppEnabled,
}: {
  app: AppServer.v2.AppInfo;
  cardIcon?: ReactElement;
  cardIconContainer?: boolean;
  badges?: Array<ReactNode>;
  className?: string;
  installBlockedReason?: "disabled-by-admin" | null;
  installedStateAction?: InstalledCardAction;
  manageAction?: "button" | "menu";
  isConnectingApp: boolean;
  showInstallAction?: boolean;
  updatingAppId: string | null;
  onInstallApp: (app: AppServer.v2.AppInfo) => Promise<void>;
  onOpenAppTools: (app: AppServer.v2.AppInfo) => void;
  onOpenAppUrl: (url: string | null) => void;
  onSetAppEnabled: (params: {
    appId: string;
    enabled: boolean;
  }) => Promise<void>;
}): ReactElement {
  const intl = useIntl();
  const isEnabled = app.isEnabled;
  const isInstallBlockedByAdmin =
    installBlockedReason === "disabled-by-admin" && !app.isAccessible;
  const isUpdatingAppEnablement = updatingAppId === app.id;

  return (
    <CardTile
      className={clsx("group justify-center border-none", className)}
      actionsPlacement="center"
      iconContainer={cardIconContainer}
      icon={
        cardIcon ?? (
          <ConnectorLogo
            alt={app.name}
            className="icon-md"
            logoUrl={app.logoUrl}
            logoDarkUrl={app.logoUrlDark}
            fallback={
              <ConnectedAppsIcon className="icon-sm text-token-text-secondary" />
            }
          />
        )
      }
      title={app.name}
      badges={badges}
      description={
        app.description ?? <FormattedMessage {...messages.noDescription} />
      }
      descriptionClassName="line-clamp-1"
      onClick={(): void => {
        onOpenAppTools(app);
      }}
      actions={
        app.isAccessible && installedStateAction === "toggle" ? (
          <div className="flex items-center gap-2">
            {manageAction === "menu" ? (
              <div
                className="invisible opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
                onClick={(event): void => {
                  event.stopPropagation();
                }}
                onKeyDown={(event): void => {
                  event.stopPropagation();
                }}
              >
                <BasicDropdown
                  align="end"
                  contentWidth="icon"
                  triggerButton={
                    <MoreMenuTrigger
                      label={intl.formatMessage(messages.moreActions)}
                      size="toolbar"
                    />
                  }
                >
                  <Dropdown.Item
                    onSelect={() => {
                      onOpenAppUrl(getManageAppUrl(app));
                    }}
                  >
                    <FormattedMessage {...messages.manageOnChatGpt} />
                  </Dropdown.Item>
                </BasicDropdown>
              </div>
            ) : (
              <div className="invisible opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <Tooltip
                  tooltipContent={
                    <FormattedMessage {...messages.manageOnChatGpt} />
                  }
                >
                  <Button
                    color="ghost"
                    size="icon"
                    aria-label={intl.formatMessage(messages.manageOnChatGpt)}
                    onClick={(event): void => {
                      event.stopPropagation();
                      onOpenAppUrl(getManageAppUrl(app));
                    }}
                  >
                    <SettingsCogIcon className="icon-sm" />
                  </Button>
                </Tooltip>
              </div>
            )}
            <Tooltip
              tooltipContent={
                isEnabled ? (
                  <FormattedMessage {...messages.disableToggleTooltip} />
                ) : (
                  <FormattedMessage {...messages.enableToggleTooltip} />
                )
              }
            >
              <div
                onClick={(event): void => {
                  event.stopPropagation();
                }}
                onKeyDown={(event): void => {
                  event.stopPropagation();
                }}
              >
                <Toggle
                  checked={isEnabled}
                  disabled={isUpdatingAppEnablement}
                  onChange={(next): void => {
                    void onSetAppEnabled({
                      appId: app.id,
                      enabled: next,
                    });
                  }}
                  ariaLabel={intl.formatMessage(messages.enableToggleAria)}
                />
              </div>
            </Tooltip>
          </div>
        ) : app.isAccessible ? (
          <CardStatusIndicator
            ariaLabel={intl.formatMessage(
              isEnabled ? messages.enabledStatus : messages.disabledStatus,
            )}
            icon={
              isEnabled ? (
                <CheckIcon className="icon-sm" />
              ) : (
                <SlashIcon className="icon-sm" />
              )
            }
          />
        ) : !showInstallAction ? null : (
          <Tooltip
            tooltipContent={
              isInstallBlockedByAdmin ? (
                <FormattedMessage
                  id="plugins.install.disabledByAdmin"
                  defaultMessage="Disabled by admin"
                  description="Tooltip shown when plugin install is unavailable because all included connectors are disabled by admin"
                />
              ) : isConnectingApp ? (
                <FormattedMessage {...messages.connectingApp} />
              ) : (
                <FormattedMessage {...messages.installApp} />
              )
            }
          >
            <div>
              <Button
                color="ghost"
                size="icon"
                disabled={isInstallBlockedByAdmin}
                aria-label={intl.formatMessage(
                  isConnectingApp
                    ? messages.connectingApp
                    : messages.installApp,
                )}
                onClick={(event): void => {
                  event.stopPropagation();
                  if (isInstallBlockedByAdmin) {
                    return;
                  }
                  void onInstallApp(app);
                }}
              >
                {isConnectingApp ? (
                  <Spinner className="icon-xxs" />
                ) : (
                  <PlusIcon className="icon-sm" />
                )}
              </Button>
            </div>
          </Tooltip>
        )
      }
    />
  );
}
