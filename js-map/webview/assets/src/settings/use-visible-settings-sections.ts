import {
  DEFAULT_SETTINGS_SECTION,
  SETTINGS_SECTIONS,
  type SettingsSection,
  type SettingsSectionSlug,
} from "@/constants/settings-sections";
import { useIsPluginsEnabled } from "@/hooks/use-is-plugins-enabled";
import { useIsRemoteHost } from "@/hooks/use-is-remote-host";
import { useWindowType } from "@/hooks/use-window-type";
import { useGate } from "@/statsig/statsig";

import { useUsageSettingsAccess } from "./use-usage-settings-access";

type VisibleSettingsSectionsResult = {
  activeSettingsSection: SettingsSectionSlug;
  shouldRedirectToVisibleSettingsSection: boolean;
  visibleSettingsSections: Array<SettingsSection>;
};

export function useVisibleSettingsSections(
  routeSection: string | null = null,
): VisibleSettingsSectionsResult {
  const isPluginsEnabled = useIsPluginsEnabled();
  const windowType = useWindowType();
  const isRemoteHost = useIsRemoteHost();
  const isRemoteConnectionsEnabled = useGate(
    __statsigName("codex-app-enable-remote-connections"),
  );
  const { isUsageSettingsVisible, isUsageSettingsAccessLoading } =
    useUsageSettingsAccess();
  const visibleSettingsSections = SETTINGS_SECTIONS.filter((section) => {
    switch (section.slug) {
      case "plugins-settings":
        return windowType === "extension" && isPluginsEnabled;
      case "skills-settings":
        return windowType === "extension" && !isPluginsEnabled;
      case "connections":
        return (
          windowType === "electron" &&
          isRemoteConnectionsEnabled &&
          !isRemoteHost
        );
      case "usage":
        return isUsageSettingsVisible;
      case "appearance":
      case "git-settings":
      case "worktrees":
      case "local-environments":
      case "data-controls":
      case "environments":
        return windowType === "electron";
      case "account":
      case "general-settings":
      case "agent":
      case "personalization":
      case "mcp-settings":
        return true;
    }
  });
  // `visibleRouteSection` checks the filtered visible list for the current user.
  // `knownRouteSection` checks the full section registry so we can tell
  // "known but hidden" routes apart from unknown/invalid routes.
  const visibleRouteSection = visibleSettingsSections.find((section) => {
    return section.slug === routeSection;
  });
  const knownRouteSection = findSettingsSection(routeSection);
  const isKnownRouteSectionHidden =
    knownRouteSection != null && visibleRouteSection == null;
  let shouldWaitForRouteVisibility = false;
  if (isKnownRouteSectionHidden) {
    switch (knownRouteSection.slug) {
      case "usage":
        shouldWaitForRouteVisibility = isUsageSettingsAccessLoading;
        break;
      case "appearance":
      case "general-settings":
      case "agent":
      case "git-settings":
      case "account":
      case "data-controls":
      case "personalization":
      case "local-environments":
      case "worktrees":
      case "environments":
      case "mcp-settings":
      case "connections":
      case "plugins-settings":
      case "skills-settings":
        shouldWaitForRouteVisibility = false;
        break;
    }
  }

  return {
    activeSettingsSection:
      visibleRouteSection?.slug ?? DEFAULT_SETTINGS_SECTION,
    shouldRedirectToVisibleSettingsSection:
      isKnownRouteSectionHidden && !shouldWaitForRouteVisibility,
    visibleSettingsSections,
  };
}

function findSettingsSection(section: string | null): SettingsSection | null {
  if (section == null) {
    return null;
  }
  return (
    SETTINGS_SECTIONS.find((candidateSection) => {
      return candidateSection.slug === section;
    }) ?? null
  );
}
