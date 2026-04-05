import clsx from "clsx";
import type React from "react";
import { defineMessages, useIntl } from "react-intl";

import { useCanUseFastMode } from "@/hooks/use-is-fast-mode-enabled";
import { useServiceTierSettings } from "@/hooks/use-service-tier-settings";
import LightningBoltOutlineIcon from "@/icons/lightning-bolt-outline.svg";
import LightningBoltIcon from "@/icons/lightning-bolt.svg";
import { coerceServiceTier } from "@/utils/service-tier";

import { useProvideSlashCommand } from "./slash-command";

const speedSlashMessages = defineMessages({
  title: {
    id: "composer.speedSlashCommand.title",
    defaultMessage: "Fast",
    description: "Title for the Fast slash command",
  },
  commandDescription: {
    id: "composer.speedSlashCommand.description",
    defaultMessage:
      "Turn on Fast mode to speed up inference across threads, subagents, and compaction at 2x plan usage",
    description: "Description for the Fast slash command",
  },
  disableDescription: {
    id: "composer.speedSlashCommand.disableDescription",
    defaultMessage: "Turn off Fast mode and return to standard inference speed",
    description: "Description for the Fast slash command when Fast mode is on",
  },
});

export function SpeedSlashCommand(): null {
  const intl = useIntl();
  const isFastModeEnabled = useCanUseFastMode();
  const { serviceTierSettings, setServiceTier } = useServiceTierSettings();
  const isFastModeOn =
    coerceServiceTier(serviceTierSettings.serviceTier) === "fast";
  const Icon = ({ className }: { className?: string }): React.ReactElement => {
    const BoltIcon = isFastModeOn
      ? LightningBoltIcon
      : LightningBoltOutlineIcon;
    return (
      <BoltIcon
        className={clsx(
          className,
          isFastModeOn ? "text-token-link-foreground" : undefined,
        )}
      />
    );
  };

  useProvideSlashCommand({
    id: "speed",
    title: intl.formatMessage(speedSlashMessages.title),
    description: intl.formatMessage(
      isFastModeOn
        ? speedSlashMessages.disableDescription
        : speedSlashMessages.commandDescription,
    ),
    requiresEmptyComposer: false,
    enabled: isFastModeEnabled,
    Icon,
    onSelect: async () => {
      await setServiceTier(isFastModeOn ? null : "fast", "slash_command");
    },
    dependencies: [
      isFastModeEnabled,
      isFastModeOn,
      serviceTierSettings.isLoading,
      setServiceTier,
    ],
  });

  return null;
}
