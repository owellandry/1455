import clsx from "clsx";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { CODEX_MCP_URL } from "@/constants/links";
import type { SettingsSectionSlug } from "@/constants/settings-sections";
import ChevronIcon from "@/icons/chevron.svg";

import { getSettingsNavTitleMessage } from "./settings-nav-title-message";

export function SettingsDropdownTrigger({
  children,
  className,
  contentClassName,
  chevronClassName,
  ...props
}: Omit<ComponentProps<typeof Button>, "color" | "size"> & {
  children: ReactNode;
  contentClassName?: string;
  chevronClassName?: string;
}): ReactElement {
  return (
    <Button
      color="secondary"
      size="toolbar"
      className={clsx("w-[240px] justify-between", className)}
      {...props}
    >
      <span
        className={clsx(
          "flex min-w-0 flex-1 items-center gap-1.5",
          contentClassName,
        )}
      >
        {children}
      </span>
      <ChevronIcon
        className={clsx(
          "icon-2xs shrink-0 text-token-input-placeholder-foreground",
          chevronClassName,
        )}
      />
    </Button>
  );
}

export function SettingsNavTitleMessage({
  slug,
}: {
  slug: SettingsSectionSlug;
}): ReactElement {
  return <FormattedMessage {...getSettingsNavTitleMessage(slug)} />;
}

export function SettingsSectionTitleMessage({
  slug,
}: {
  slug: SettingsSectionSlug;
}): ReactElement {
  switch (slug) {
    case "account":
      return (
        <FormattedMessage
          id="settings.section.account"
          defaultMessage="Account"
          description="Title for account settings section"
        />
      );
    case "appearance":
      return (
        <FormattedMessage
          id="settings.section.appearance"
          defaultMessage="Appearance"
          description="Title for appearance settings section"
        />
      );
    case "general-settings":
      return (
        <FormattedMessage
          id="settings.section.general-settings"
          defaultMessage="General"
          description="Title for general settings section"
        />
      );
    case "agent":
      return (
        <FormattedMessage
          id="settings.section.agent"
          defaultMessage="Configuration"
          description="Title for configuration settings section"
        />
      );
    case "git-settings":
      return (
        <FormattedMessage
          id="settings.section.git-settings"
          defaultMessage="Git"
          description="Title for git settings section"
        />
      );
    case "data-controls":
      return (
        <FormattedMessage
          id="settings.section.data-controls"
          defaultMessage="Archived threads"
          description="Title for archived threads settings section"
        />
      );
    case "personalization":
      return (
        <FormattedMessage
          id="settings.section.personalization"
          defaultMessage="Personalization"
          description="Title for personalization settings section"
        />
      );
    case "usage":
      return (
        <FormattedMessage
          id="settings.section.usage"
          defaultMessage="Usage"
          description="Title for usage settings section"
        />
      );
    case "local-environments":
      return (
        <FormattedMessage
          id="settings.section.local-environments"
          defaultMessage="Environments"
          description="Title for environments settings section"
        />
      );
    case "worktrees":
      return (
        <FormattedMessage
          id="settings.section.worktrees"
          defaultMessage="Worktrees"
          description="Title for worktrees settings section"
        />
      );
    case "environments":
      return (
        <FormattedMessage
          id="settings.section.environments"
          defaultMessage="Cloud Environments"
          description="Title for environments settings section"
        />
      );
    case "mcp-settings":
      return (
        <FormattedMessage
          id="settings.section.mcp-settings"
          defaultMessage="MCP servers"
          description="Title for MCP servers settings section"
        />
      );
    case "connections":
      return (
        <FormattedMessage
          id="settings.section.connections"
          defaultMessage="Connections"
          description="Title for connections settings section"
        />
      );
    case "plugins-settings":
      return (
        <FormattedMessage
          id="settings.section.plugins-settings"
          defaultMessage="Plugins"
          description="Title for plugins settings section"
        />
      );
    case "skills-settings":
      return (
        <FormattedMessage
          id="settings.section.skills-settings"
          defaultMessage="Skills"
          description="Title for skills settings section"
        />
      );
  }
}

export function SettingsSectionSubtitleMessage({
  slug,
}: {
  slug: SettingsSectionSlug;
}): ReactElement | null {
  if (slug === "mcp-settings") {
    return (
      <div>
        <FormattedMessage
          id={"settings.section.mcp-settings.subtitle"}
          defaultMessage="Connect external tools and data sources. "
          description="Subtitle for MCP settings section"
        />
        <a
          className="inline-flex items-center gap-1 text-base text-token-text-link-foreground"
          href={CODEX_MCP_URL}
          target="_blank"
          rel="noreferrer"
        >
          <FormattedMessage
            id={"settings.section.mcp-settings.learnMore"}
            defaultMessage="Learn more."
            description="Label for MCP docs link"
          />
        </a>
      </div>
    );
  }

  return null;
}
