import { defineMessages, type MessageDescriptor } from "react-intl";

import type { SettingsSectionSlug } from "@/constants/settings-sections";

const message = defineMessages({
  account: {
    id: "settings.nav.account",
    defaultMessage: "Account",
    description: "Title for account settings section",
  },
  appearance: {
    id: "settings.nav.appearance",
    defaultMessage: "Appearance",
    description: "Title for appearance settings section",
  },
  "general-settings": {
    id: "settings.nav.general-settings",
    defaultMessage: "General",
    description: "Title for general settings section",
  },
  agent: {
    id: "settings.nav.agent",
    defaultMessage: "Configuration",
    description: "Title for configuration settings section",
  },
  "git-settings": {
    id: "settings.nav.git-settings",
    defaultMessage: "Git",
    description: "Title for git settings section",
  },
  "data-controls": {
    id: "settings.nav.data-controls",
    defaultMessage: "Archived threads",
    description: "Title for archived threads settings section",
  },
  personalization: {
    id: "settings.nav.personalization",
    defaultMessage: "Personalization",
    description: "Title for personalization settings section",
  },
  usage: {
    id: "settings.nav.usage",
    defaultMessage: "Usage",
    description: "Title for usage settings section",
  },
  "local-environments": {
    id: "settings.nav.local-environments",
    defaultMessage: "Environments",
    description: "Title for environments settings section",
  },
  worktrees: {
    id: "settings.nav.worktrees",
    defaultMessage: "Worktrees",
    description: "Title for worktrees settings section",
  },
  environments: {
    id: "settings.nav.environments",
    defaultMessage: "Cloud Environments",
    description: "Title for environments settings section",
  },
  "mcp-settings": {
    id: "settings.nav.mcp-settings",
    defaultMessage: "MCP servers",
    description: "Title for MCP servers settings section",
  },
  connections: {
    id: "settings.nav.connections",
    defaultMessage: "Connections",
    description: "Title for connections settings section",
  },
  "plugins-settings": {
    id: "settings.nav.plugins-settings",
    defaultMessage: "Plugins",
    description: "Title for plugins settings section",
  },
  "skills-settings": {
    id: "settings.nav.skills-settings",
    defaultMessage: "Skills",
    description: "Title for skills settings section",
  },
});

export function getSettingsNavTitleMessage(
  slug: SettingsSectionSlug,
): MessageDescriptor {
  return message[slug];
}
