import type React from "react";
import {
  defineMessages,
  FormattedMessage,
  useIntl,
  type MessageDescriptor,
} from "react-intl";

import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { useCanUseFastMode } from "@/hooks/use-is-fast-mode-enabled";
import { useServiceTierSettings } from "@/hooks/use-service-tier-settings";
import CheckIcon from "@/icons/check-md.svg";
import { SettingsRow } from "@/settings/settings-row";
import { SettingsDropdownTrigger } from "@/settings/settings-shared";
import { coerceServiceTier } from "@/utils/service-tier";
import {
  USER_VISIBLE_SERVICE_TIER_OPTIONS,
  type UserVisibleServiceTier,
} from "@/utils/user-visible-service-tier-options";

const speedMessages = defineMessages({
  description: {
    id: "settings.agent.speed.description",
    defaultMessage:
      "Choose how quickly inference runs across threads, subagents, and compaction. Fast uses 2x plan usage.",
    description: "Description for the Fast mode speed setting",
  },
  label: {
    id: "settings.agent.speed.label",
    defaultMessage: "Speed",
    description: "Label for the Fast mode speed setting",
  },
  optionFast: {
    id: "settings.agent.speed.option.fast",
    defaultMessage: "Fast",
    description: "Label for the fast Speed setting option",
  },
  optionFastDescription: {
    id: "settings.agent.speed.option.fast.description",
    defaultMessage: "1.5x speed, 2x plan usage",
    description: "Subtitle for the fast Speed setting option",
  },
  optionStandard: {
    id: "settings.agent.speed.option.standard",
    defaultMessage: "Standard",
    description: "Label for the standard Speed setting option",
  },
  optionStandardDescription: {
    id: "settings.agent.speed.option.standard.description",
    defaultMessage: "Default speed",
    description: "Subtitle for the standard Speed setting option",
  },
});

const SPEED_OPTIONS: Array<{
  label: MessageDescriptor;
  description: MessageDescriptor;
  value: UserVisibleServiceTier;
}> = USER_VISIBLE_SERVICE_TIER_OPTIONS.map((value) => ({
  label: getSpeedOptionLabel(value),
  description: getSpeedOptionDescription(value),
  value,
}));

export function SpeedSettingsRow(): React.ReactElement | null {
  const intl = useIntl();
  const isFastModeEnabled = useCanUseFastMode();
  const { serviceTierSettings, setServiceTier } = useServiceTierSettings();

  if (!isFastModeEnabled) {
    return null;
  }

  const selectedServiceTier = coerceServiceTier(
    serviceTierSettings.serviceTier,
  );
  const selectedOption =
    SPEED_OPTIONS.find((option) => option.value === selectedServiceTier) ??
    SPEED_OPTIONS[0];

  return (
    <SettingsRow
      label={<FormattedMessage {...speedMessages.label} />}
      description={<FormattedMessage {...speedMessages.description} />}
      control={
        <BasicDropdown
          contentWidth="menuWide"
          align="end"
          triggerButton={
            <SettingsDropdownTrigger disabled={serviceTierSettings.isLoading}>
              {intl.formatMessage(selectedOption.label)}
            </SettingsDropdownTrigger>
          }
        >
          {SPEED_OPTIONS.map((option) => {
            const isSelected = option.value === selectedServiceTier;
            return (
              <Dropdown.Item
                key={option.label.id}
                disabled={serviceTierSettings.isLoading}
                RightIcon={isSelected ? CheckIcon : undefined}
                SubText={
                  <span className="text-token-description-foreground">
                    <FormattedMessage {...option.description} />
                  </span>
                }
                onSelect={() => {
                  void setServiceTier(option.value, "settings");
                }}
              >
                <FormattedMessage {...option.label} />
              </Dropdown.Item>
            );
          })}
        </BasicDropdown>
      }
    />
  );
}

function getSpeedOptionLabel(value: UserVisibleServiceTier): MessageDescriptor {
  switch (value) {
    case null:
      return speedMessages.optionStandard;
    case "fast":
      return speedMessages.optionFast;
  }
}

function getSpeedOptionDescription(
  value: UserVisibleServiceTier,
): MessageDescriptor {
  switch (value) {
    case null:
      return speedMessages.optionStandardDescription;
    case "fast":
      return speedMessages.optionFastDescription;
  }
}
