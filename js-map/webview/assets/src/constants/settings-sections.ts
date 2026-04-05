export type SettingsSectionSlug =
  | "general-settings"
  | "appearance"
  | "agent"
  | "git-settings"
  | "account"
  | "data-controls"
  | "personalization"
  | "usage"
  | "local-environments"
  | "worktrees"
  | "environments"
  | "mcp-settings"
  | "connections"
  | "plugins-settings"
  | "skills-settings";

export type SettingsSection = {
  slug: SettingsSectionSlug;
  fullWidth?: boolean;
  externalUrl?: string;
  disabled?: boolean;
};

export const DEFAULT_SETTINGS_SECTION: SettingsSectionSlug = "general-settings";

export enum SettingsEditRowType {
  String = "string",
  Array = "array",
  Record = "record",
}

export const SETTINGS_SECTIONS: Array<SettingsSection> = [
  { slug: "general-settings" },
  { slug: "appearance" },
  { slug: "agent" },
  { slug: "personalization" },
  { slug: "usage" },
  { slug: "mcp-settings" },
  { slug: "connections" },
  { slug: "plugins-settings" },
  { slug: "skills-settings" },
  { slug: "git-settings" },
  { slug: "local-environments" },
  { slug: "worktrees" },
  { slug: "data-controls" },
];
