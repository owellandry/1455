import type React from "react";
import { FormattedMessage } from "react-intl";
import { useLocation, useNavigate } from "react-router";

import { Button } from "@/components/button";
import { useWindowType } from "@/hooks/use-window-type";
import ArrowLeftIcon from "@/icons/arrow-left.svg";
import { SettingsContentLayout } from "@/settings/settings-content-layout";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsSurface } from "@/settings/settings-surface";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useFetchFromVSCode } from "@/vscode-api";

export function OpenSourceLicensesPage(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const windowType = useWindowType();
  const isSupported = windowType === "electron";
  const backPath = resolveBackPath(location.state);
  const locationState =
    location.state != null &&
    typeof location.state === "object" &&
    !Array.isArray(location.state)
      ? location.state
      : null;

  const { data, isLoading } = useFetchFromVSCode("third-party-notices", {
    queryConfig: {
      enabled: isSupported,
      staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    },
  });

  return (
    <SettingsContentLayout
      backSlot={
        <Button
          color="ghost"
          size="toolbar"
          onClick={(): void => {
            void navigate(backPath, {
              replace: true,
              state: locationState,
            });
          }}
        >
          <ArrowLeftIcon className="icon-2xs" />
          <FormattedMessage
            id="settings.openSourceLicenses.back"
            defaultMessage="Back"
            description="Button label to go back to the main settings page"
          />
        </Button>
      }
      title={
        <FormattedMessage
          id="settings.openSourceLicenses.title"
          defaultMessage="Open source licenses"
          description="Title for the open source licenses settings page"
        />
      }
      subtitle={
        <FormattedMessage
          id="settings.openSourceLicenses.subtitle"
          defaultMessage="Third-party notices for dependencies included in this app"
          description="Subtitle for the open source licenses settings page"
        />
      }
    >
      <SettingsGroup>
        <SettingsGroup.Content>
          <SettingsSurface>
            {!isSupported ? (
              <div className="text-sm text-token-text-secondary">
                <FormattedMessage
                  id="settings.openSourceLicenses.notSupported"
                  defaultMessage="Not available in this host."
                  description="Message shown when open source licenses are not available in this window type"
                />
              </div>
            ) : isLoading ? (
              <div className="text-sm text-token-text-secondary">
                <FormattedMessage
                  id="settings.openSourceLicenses.loading"
                  defaultMessage="Loading…"
                  description="Loading label while fetching third-party notices"
                />
              </div>
            ) : data?.text ? (
              <pre className="bg-token-surface-secondary rounded p-3 text-xs leading-relaxed break-words whitespace-pre-wrap text-token-text-primary">
                {data.text}
              </pre>
            ) : (
              <div className="text-sm text-token-text-secondary">
                <FormattedMessage
                  id="settings.openSourceLicenses.missing"
                  defaultMessage="No third-party notices were found."
                  description="Message shown when the third-party notices file is missing"
                />
              </div>
            )}
          </SettingsSurface>
        </SettingsGroup.Content>
      </SettingsGroup>
    </SettingsContentLayout>
  );
}

function resolveBackPath(state: unknown): string {
  if (
    state != null &&
    typeof state === "object" &&
    !Array.isArray(state) &&
    "licensesBackPath" in state
  ) {
    const licensesBackPath = state.licensesBackPath;
    if (
      typeof licensesBackPath === "string" &&
      licensesBackPath.startsWith("/settings/")
    ) {
      return licensesBackPath;
    }
  }
  return "/settings/general";
}
