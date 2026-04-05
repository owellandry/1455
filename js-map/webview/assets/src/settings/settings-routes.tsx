import { lazy, type ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import type { SettingsSectionSlug } from "@/constants/settings-sections";
import { SettingsContentLayout } from "@/settings/settings-content-layout";
import { SettingsSectionTitleMessage } from "@/settings/settings-shared";

export function SettingsSectionRoute({
  slug,
}: {
  slug: SettingsSectionSlug;
}): ReactElement {
  const SettingsContent = SETTINGS_CONTENT_MAP[slug];
  return <SettingsContent />;
}

const SETTINGS_CONTENT_MAP: Record<
  SettingsSectionSlug,
  ReturnType<typeof lazy>
> = {
  "general-settings": lazy(() =>
    import("./settings-content/general-settings").then((m) => ({
      default: m.GeneralSettings,
    })),
  ),
  appearance: lazy(() =>
    import("./settings-content/appearance-settings").then((m) => ({
      default: m.AppearanceSettings,
    })),
  ),
  agent: lazy(() =>
    import("./settings-content/agent-settings").then((m) => ({
      default: m.AgentSettings,
    })),
  ),
  "git-settings": lazy(() =>
    import("./settings-content/git-settings").then((m) => ({
      default: m.GitSettings,
    })),
  ),
  account: lazy(() => Promise.resolve({ default: SettingsUnavailableSection })),
  "data-controls": lazy(() =>
    import("./settings-content/data-controls").then((m) => ({
      default: m.DataControlsSettings,
    })),
  ),
  personalization: lazy(() =>
    import("./settings-content/personalization-settings").then((m) => ({
      default: m.PersonalizationSettings,
    })),
  ),
  usage: lazy(() =>
    import("./settings-content/usage-settings/usage-settings").then((m) => ({
      default: m.UsageSettings,
    })),
  ),
  "local-environments": lazy(() =>
    import("./settings-content/local-environments/local-environments-settings-page").then(
      (m) => ({
        default: m.LocalEnvironmentsSettings,
      }),
    ),
  ),
  worktrees: lazy(() =>
    import("./settings-content/worktrees/worktrees-settings-page").then(
      (m) => ({
        default: m.WorktreesSettingsPage,
      }),
    ),
  ),
  environments: lazy(() =>
    Promise.resolve({ default: SettingsExternalSection }),
  ),
  "mcp-settings": lazy(() =>
    import("./settings-content/mcp-settings").then((m) => ({
      default: m.McpSettings,
    })),
  ),
  connections: lazy(() =>
    import("../remote-connections/remote-connections-settings").then((m) => ({
      default: m.RemoteConnectionsSettings,
    })),
  ),
  "plugins-settings": lazy(() =>
    import("./settings-content/plugins-settings").then((m) => ({
      default: m.PluginsSettings,
    })),
  ),
  "skills-settings": lazy(() =>
    import("./settings-content/skills-settings").then((m) => ({
      default: m.SkillsSettings,
    })),
  ),
};

function SettingsUnavailableSection({
  slug,
}: {
  slug: SettingsSectionSlug;
}): ReactElement {
  return (
    <SettingsContentLayout
      title={<SettingsSectionTitleMessage slug={slug} />}
      subtitle={
        <FormattedMessage
          id="settings.section.unavailable"
          defaultMessage="Not available in Alpha yet"
          description="Subtitle for settings sections that are not available in the Alpha build"
        />
      }
    />
  );
}

function SettingsExternalSection({
  slug,
}: {
  slug: SettingsSectionSlug;
}): ReactElement {
  return (
    <SettingsContentLayout
      title={<SettingsSectionTitleMessage slug={slug} />}
      subtitle={
        <FormattedMessage
          id="settings.section.external"
          defaultMessage="Opens in your browser during Alpha"
          description="Subtitle for settings sections that open in a browser during the Alpha build"
        />
      }
    />
  );
}
