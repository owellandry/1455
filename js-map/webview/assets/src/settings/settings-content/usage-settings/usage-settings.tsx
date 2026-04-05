import type React from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import {
  useAutoTopUpSettingsMutations,
  useAutoTopUpSettingsQuery,
  useRateLimit,
} from "@/queries/usage-queries";
import { SettingsContentLayout } from "@/settings/settings-content-layout";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsRow } from "@/settings/settings-row";
import { SettingsSectionTitleMessage } from "@/settings/settings-shared";
import { SettingsSurface } from "@/settings/settings-surface";
import { useUsageSettingsAccess } from "@/settings/use-usage-settings-access";

import { AutoTopUpSettingsForm } from "./auto-top-up-settings-form";
import { UsageLimitSettingsGroup } from "./usage-limit-settings-group";

export function UsageSettings(): React.ReactElement | null {
  const { isUsageSettingsVisible, isUsageSettingsAccessLoading } =
    useUsageSettingsAccess();
  const {
    data: rateLimitStatus,
    isLoading: isRateLimitStatusLoading,
    isError: isRateLimitStatusError,
    refetch: refetchRateLimitStatus,
  } = useRateLimit(isUsageSettingsVisible);
  const {
    data: autoTopUpSettings,
    isLoading: isAutoTopUpSettingsLoading,
    isError: isAutoTopUpSettingsError,
    refetch: refetchAutoTopUpSettings,
  } = useAutoTopUpSettingsQuery({
    enabled: isUsageSettingsVisible,
  });
  const {
    enableAutoTopUpMutation,
    updateAutoTopUpMutation,
    disableAutoTopUpMutation,
  } = useAutoTopUpSettingsMutations();
  const usageTitle = <SettingsSectionTitleMessage slug="usage" />;

  if (!isUsageSettingsVisible && !isUsageSettingsAccessLoading) {
    return null;
  }

  const shouldShowAccessLoading =
    !isUsageSettingsVisible && isUsageSettingsAccessLoading;
  const shouldShowSettingsLoading =
    (isAutoTopUpSettingsLoading && autoTopUpSettings == null) ||
    (isRateLimitStatusLoading && rateLimitStatus == null);
  const shouldShowSettingsLoadError =
    (isAutoTopUpSettingsError && autoTopUpSettings == null) ||
    (isRateLimitStatusError && rateLimitStatus == null);

  if (
    shouldShowAccessLoading ||
    shouldShowSettingsLoadError ||
    shouldShowSettingsLoading
  ) {
    let statusLabel: React.ReactNode = null;
    let statusControl: React.ReactNode = null;

    if (shouldShowAccessLoading) {
      statusLabel = (
        <FormattedMessage
          id="settings.usage.access.loading"
          defaultMessage="Checking subscription…"
          description="Loading label while checking whether Usage settings should be visible"
        />
      );
    } else if (shouldShowSettingsLoadError) {
      statusLabel = (
        <FormattedMessage
          id="settings.usage.load.error"
          defaultMessage="Could not load usage settings."
          description="Error label shown when usage settings cannot be fetched"
        />
      );
      statusControl = (
        <Button
          color="secondary"
          size="toolbar"
          onClick={() => {
            void Promise.all([
              refetchAutoTopUpSettings(),
              refetchRateLimitStatus(),
            ]);
          }}
        >
          <FormattedMessage
            id="settings.usage.load.retry"
            defaultMessage="Retry"
            description="Retry button for usage settings fetch errors"
          />
        </Button>
      );
    } else {
      statusLabel = (
        <FormattedMessage
          id="settings.usage.load.loading"
          defaultMessage="Loading usage settings…"
          description="Loading label while usage settings are being fetched"
        />
      );
    }

    return (
      <UsageSettingsStatusLayout
        title={usageTitle}
        rowLabel={statusLabel}
        rowControl={statusControl}
      />
    );
  }

  if (autoTopUpSettings == null) {
    return null;
  }

  return (
    <SettingsContentLayout title={usageTitle}>
      <UsageLimitSettingsGroup rateLimitStatus={rateLimitStatus ?? null} />
      <AutoTopUpSettingsForm
        serverState={autoTopUpSettings}
        creditDetails={rateLimitStatus?.credits ?? null}
        enableAutoTopUpMutation={enableAutoTopUpMutation}
        updateAutoTopUpMutation={updateAutoTopUpMutation}
        disableAutoTopUpMutation={disableAutoTopUpMutation}
      />
    </SettingsContentLayout>
  );
}

function UsageSettingsStatusLayout({
  title,
  rowLabel,
  rowControl,
}: {
  title: React.ReactNode;
  rowLabel: React.ReactNode;
  rowControl: React.ReactNode;
}): React.ReactElement {
  return (
    <SettingsContentLayout title={title}>
      <SettingsGroup>
        <SettingsGroup.Content>
          <SettingsSurface>
            <SettingsRow
              className="gap-6"
              label={rowLabel}
              control={rowControl}
            />
          </SettingsSurface>
        </SettingsGroup.Content>
      </SettingsGroup>
    </SettingsContentLayout>
  );
}
