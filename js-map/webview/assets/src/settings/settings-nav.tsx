import clsx from "clsx";
import type { ComponentType, ReactElement } from "react";
import { useState } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { NavItem, NavSection } from "@/components/nav/nav-list";
import { Tooltip } from "@/components/tooltip";
import type {
  SettingsSection,
  SettingsSectionSlug,
} from "@/constants/settings-sections";
import AppsIcon from "@/icons/apps.svg";
import ArchiveIcon from "@/icons/archive.svg";
import ArrowLeftIcon from "@/icons/arrow-left.svg";
import ArrowTopRightIcon from "@/icons/arrow-top-right.svg";
import AvatarIcon from "@/icons/avatar.svg";
import BranchIcon from "@/icons/branch.svg";
import DockIcon from "@/icons/dock.svg";
import FaceIcon from "@/icons/face.svg";
import GlobeIcon from "@/icons/globe.svg";
import McpIcon from "@/icons/mcp.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import ShieldCodeIcon from "@/icons/shield-code.svg";
import SidebarHiddenIcon from "@/icons/sidebar-hidden.svg";
import SidebarIcon from "@/icons/sidebar.svg";
import SkillsIcon from "@/icons/skills.svg";
import SpeedometerIcon from "@/icons/speedometer.svg";
import SunIcon from "@/icons/sun.svg";
import WorktreeIcon from "@/icons/worktree.svg";

import { getSettingsNavTitleMessage } from "./settings-nav-title-message";
import { SettingsNavTitleMessage } from "./settings-shared";

const SETTINGS_NAV_ICONS: Record<
  SettingsSectionSlug,
  ComponentType<{ className?: string }>
> = {
  "general-settings": SettingsCogIcon,
  appearance: SunIcon,
  agent: ShieldCodeIcon,
  "git-settings": BranchIcon,
  account: AvatarIcon,
  "data-controls": ArchiveIcon,

  personalization: FaceIcon,
  usage: SpeedometerIcon,
  "local-environments": DockIcon,
  worktrees: WorktreeIcon,
  environments: DockIcon,
  "mcp-settings": McpIcon,
  connections: GlobeIcon,
  "plugins-settings": AppsIcon,
  "skills-settings": SkillsIcon,
};

const messages = defineMessages({
  collapseSidebar: {
    id: "settings.nav.collapseSidebar",
    defaultMessage: "Collapse settings navigation",
    description:
      "Tooltip and accessible label for the button that collapses the settings navigation",
  },
  expandSidebar: {
    id: "settings.nav.expandSidebar",
    defaultMessage: "Expand settings navigation",
    description:
      "Tooltip and accessible label for the button that expands the settings navigation",
  },
});

const collapseToggleConfigs = {
  collapsed: {
    icon: SidebarIcon,
    message: messages.expandSidebar,
  },
  expanded: {
    icon: SidebarHiddenIcon,
    message: messages.collapseSidebar,
  },
} as const;

export function SettingsNav({
  settingsSections,
  activeSection,
  onSelect,
  className,
  onBack,
  canCollapse = false,
}: {
  settingsSections: Array<SettingsSection>;
  activeSection: SettingsSectionSlug;
  onSelect: (slug: SettingsSectionSlug) => void;
  className?: string;
  onBack?: () => void;
  canCollapse?: boolean;
}): ReactElement {
  const intl = useIntl();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hideLabels = canCollapse && isCollapsed;
  const notImplementedTooltip = (
    <FormattedMessage
      id="settings.nav.notImplemented"
      defaultMessage="[alpha] Not available in Alpha"
      description="Tooltip shown for settings sections that are not available in the alpha build"
    />
  );
  const externalTooltip = (
    <FormattedMessage
      id="settings.nav.externalTooltip"
      defaultMessage="[alpha] Opens in browser"
      description="Tooltip for settings items that open externally during alpha"
    />
  );
  const collapseToggleConfig = hideLabels
    ? collapseToggleConfigs.collapsed
    : collapseToggleConfigs.expanded;
  const collapseLabel = intl.formatMessage(collapseToggleConfig.message);
  const CollapseIcon = collapseToggleConfig.icon;

  return (
    <nav
      className={clsx("px-row-x", className)}
      aria-label={intl.formatMessage({
        id: "settings.nav.ariaLabel",
        defaultMessage: "Settings",
        description: "Aria label for settings navigation",
      })}
    >
      <div className="flex flex-col">
        {canCollapse ? (
          <div className="mb-2">
            <Tooltip
              tooltipContent={
                <FormattedMessage {...collapseToggleConfig.message} />
              }
            >
              <NavItem
                aria-label={collapseLabel}
                fullWidth={false}
                icon={CollapseIcon}
                iconClassName="icon-xs"
                hideLabel={true}
                label={<FormattedMessage {...collapseToggleConfig.message} />}
                title={collapseLabel}
                onClick={(): void => {
                  setIsCollapsed((current) => !current);
                }}
              />
            </Tooltip>
          </div>
        ) : null}
        {onBack ? (
          <div
            role="link"
            tabIndex={0}
            className={clsx(
              "group relative mb-2 flex w-full items-center rounded-lg px-row-x py-row-y text-base outline-none",
              !hideLabels && "gap-2",
              "cursor-interaction text-token-text-secondary hover:bg-token-list-hover-background",
              "focus-visible:ring-token-focus focus-visible:ring-1 electron:opacity-75",
            )}
            onClick={onBack}
            onKeyDown={(event): void => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onBack();
              }
            }}
          >
            <ArrowLeftIcon className="icon-xs" />
            {hideLabels ? (
              <span className="sr-only">
                <FormattedMessage
                  id="settings.nav.back"
                  defaultMessage="Back to app"
                  description="Button to return to the main app from settings"
                />
              </span>
            ) : (
              <FormattedMessage
                id="settings.nav.back"
                defaultMessage="Back to app"
                description="Button to return to the main app from settings"
              />
            )}
          </div>
        ) : null}
        <NavSection className="gap-0">
          {settingsSections.map((navItem) => {
            const isActive = navItem.slug === activeSection;
            const isExternal = Boolean(navItem.externalUrl);
            const isDisabled = Boolean(navItem.disabled);
            const LeadingIcon = SETTINGS_NAV_ICONS[navItem.slug];
            const navItemLabel = intl.formatMessage(
              getSettingsNavTitleMessage(navItem.slug),
            );
            const handleSelect = (): void => {
              if (isDisabled) {
                return;
              }
              if (isExternal && navItem.externalUrl) {
                window.open(
                  navItem.externalUrl,
                  "_blank",
                  "noopener,noreferrer",
                );
                return;
              }
              if (!isActive) {
                onSelect(navItem.slug);
              }
            };
            const tooltipContent = hideLabels ? (
              <SettingsNavTitleMessage slug={navItem.slug} />
            ) : isExternal ? (
              externalTooltip
            ) : (
              notImplementedTooltip
            );
            const entry = (
              <Tooltip
                key={navItem.slug}
                tooltipContent={tooltipContent}
                side="right"
                sideOffset={12}
                disabled={!hideLabels && !isDisabled && !isExternal}
              >
                <NavItem
                  aria-label={navItemLabel}
                  icon={LeadingIcon}
                  iconClassName="icon-sm inline-block align-middle"
                  isActive={isActive}
                  disabled={isDisabled}
                  hideLabel={canCollapse ? hideLabels : undefined}
                  onClick={handleSelect}
                  weightClassName="font-normal"
                  label={<SettingsNavTitleMessage slug={navItem.slug} />}
                  trailing={
                    !hideLabels && isExternal ? (
                      <ArrowTopRightIcon className="icon-xs text-token-text-secondary opacity-50" />
                    ) : undefined
                  }
                />
              </Tooltip>
            );
            return entry;
          })}
        </NavSection>
      </div>
    </nav>
  );
}
