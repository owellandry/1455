import type * as AppServer from "app-server-types";
import type { IntlShape } from "react-intl";

import {
  CHATGPT_DEVELOPERS_APPS_URL,
  CODEX_PLUGINS_URL,
  CODEX_SKILLS_URL,
} from "@/constants/links";

const SCOPE_RANK: Record<AppServer.v2.SkillScope, number> = {
  repo: 0,
  user: 1,
  system: 2,
  admin: 3,
};

export type BrowsePluginsPageTab = "plugins" | "skills";

export type PluginsPageTab = BrowsePluginsPageTab | "apps" | "mcps";

export type PluginsPageHeaderCopy = {
  learnMoreUrl: string;
  subtitle: string;
  title: string;
};

export type PluginsPageTabConfig = {
  headerCopy: PluginsPageHeaderCopy;
  searchLabel: string;
  searchPlaceholder: string;
  sections: Array<PluginsPageSectionDescriptor>;
};

export type PluginsPageSectionDescriptor = {
  id: string;
  title: string;
};

export function dedupeSkills(
  skills: Array<AppServer.v2.SkillMetadata>,
): Array<{ skill: AppServer.v2.SkillMetadata }> {
  const byName = skills.reduce<
    Map<string, { skill: AppServer.v2.SkillMetadata }>
  >((acc, skill): typeof acc => {
    const existing = acc.get(skill.name);
    if (existing == null) {
      acc.set(skill.name, { skill });
      return acc;
    }

    const nextRank = SCOPE_RANK[skill.scope];
    const currentRank = SCOPE_RANK[existing.skill.scope];
    if (
      nextRank < currentRank ||
      (nextRank === currentRank &&
        skill.path.localeCompare(existing.skill.path) < 0)
    ) {
      existing.skill = skill;
    }
    return acc;
  }, new Map());

  return Array.from(byName.values())
    .map(({ skill }) => ({ skill }))
    .sort((a, b): number => a.skill.name.localeCompare(b.skill.name));
}

export function getPluginsPageRouteState(value: unknown): {
  connectAppId?: string;
  initialMode?: "browse" | "manage";
  initialTab: PluginsPageTab;
} {
  if (value == null || typeof value !== "object") {
    return { initialTab: "plugins" };
  }

  const initialTabValue = Reflect.get(value, "initialTab");
  const initialTab =
    initialTabValue === "plugins" ||
    initialTabValue === "skills" ||
    initialTabValue === "apps" ||
    initialTabValue === "mcps"
      ? initialTabValue
      : "plugins";
  const connectAppIdValue = Reflect.get(value, "connectAppId");
  const connectAppId =
    typeof connectAppIdValue === "string" ? connectAppIdValue.trim() : "";
  const initialModeValue = Reflect.get(value, "initialMode");
  const initialMode =
    initialModeValue === "browse" || initialModeValue === "manage"
      ? initialModeValue
      : undefined;

  if (connectAppId.length === 0) {
    return { initialMode, initialTab };
  }

  return {
    connectAppId,
    initialMode,
    initialTab,
  };
}

export function getRepoRootForSkillPath({
  skillPath,
  roots,
}: {
  skillPath: string;
  roots: Array<string>;
}): string | null {
  let bestRoot: string | null = null;
  for (const root of roots) {
    if (!skillPath.startsWith(root)) {
      continue;
    }
    if (bestRoot == null || root.length > bestRoot.length) {
      bestRoot = root;
    }
  }
  return bestRoot;
}

export function getPluginsPageTabConfig(
  intl: IntlShape,
  selectedTab: PluginsPageTab,
): PluginsPageTabConfig {
  if (selectedTab === "skills") {
    return {
      headerCopy: {
        learnMoreUrl: CODEX_SKILLS_URL,
        subtitle: intl.formatMessage({
          id: "skills.appsPage.subheading.skills",
          defaultMessage: "Teach Codex reusable workflows with Skills.",
          description:
            "Subheading shown above the Skills tab on the Skills & Apps page",
        }),
        title: intl.formatMessage({
          id: "skills.appsPage.heading.skills",
          defaultMessage: "Skills",
          description:
            "Header title for the Skills tab on the Skills & Apps page",
        }),
      },
      searchLabel: intl.formatMessage({
        id: "skills.appsPage.search.skills.label",
        defaultMessage: "Search skills",
        description:
          "Accessible label for the skills search input on the Skills & Apps page",
      }),
      searchPlaceholder: intl.formatMessage({
        id: "skills.appsPage.search.skills",
        defaultMessage: "Search skills",
        description:
          "Placeholder text for searching skills on the Skills & Apps page",
      }),
      sections: [
        {
          id: "skills-installed",
          title: intl.formatMessage({
            id: "skills.appsPage.section.installedSkills",
            defaultMessage: "My Skills",
            description: "Heading for the installed skills section",
          }),
        },
        {
          id: "skills-recommended",
          title: intl.formatMessage({
            id: "skills.appsPage.section.recommendedSkills",
            defaultMessage: "Recommended",
            description: "Heading for the recommended skills section",
          }),
        },
      ],
    };
  }

  if (selectedTab === "apps") {
    return {
      headerCopy: {
        learnMoreUrl: CHATGPT_DEVELOPERS_APPS_URL,
        subtitle: intl.formatMessage({
          id: "skills.appsPage.subheading.apps",
          defaultMessage:
            "Connect Codex to external tools and services with Apps.",
          description:
            "Subheading shown above the Apps tab on the Skills & Apps page",
        }),
        title: intl.formatMessage({
          id: "skills.appsPage.heading.apps",
          defaultMessage: "Apps",
          description:
            "Header title for the Apps tab on the Skills & Apps page",
        }),
      },
      searchLabel: intl.formatMessage({
        id: "skills.appsPage.search.apps.label",
        defaultMessage: "Search apps",
        description:
          "Accessible label for the apps search input on the Skills & Apps page",
      }),
      searchPlaceholder: intl.formatMessage({
        id: "skills.appsPage.search.apps",
        defaultMessage: "Search apps",
        description:
          "Placeholder text for searching apps on the Skills & Apps page",
      }),
      sections: [
        {
          id: "apps-installed",
          title: intl.formatMessage({
            id: "skills.appsPage.section.installedApps",
            defaultMessage: "My Apps",
            description:
              "Section heading for installed apps on the Skills & Apps page",
          }),
        },
        {
          id: "apps-recommended",
          title: intl.formatMessage({
            id: "skills.appsPage.section.discover",
            defaultMessage: "Recommended",
            description:
              "Section heading for discoverable apps on the Skills & Apps page",
          }),
        },
      ],
    };
  }

  if (selectedTab === "mcps") {
    return {
      headerCopy: {
        learnMoreUrl: CHATGPT_DEVELOPERS_APPS_URL,
        subtitle: intl.formatMessage({
          id: "skills.appsPage.subheading.mcps",
          defaultMessage: "Manage MCP server connections and availability.",
          description:
            "Subheading shown above the MCPs tab on the Skills & Apps page",
        }),
        title: intl.formatMessage({
          id: "skills.appsPage.heading.mcps",
          defaultMessage: "MCPs",
          description:
            "Header title for the MCPs tab on the Skills & Apps page",
        }),
      },
      searchLabel: intl.formatMessage({
        id: "skills.appsPage.search.mcps.label",
        defaultMessage: "Search MCP servers",
        description:
          "Accessible label for the MCP search input on the Skills & Apps page",
      }),
      searchPlaceholder: intl.formatMessage({
        id: "skills.appsPage.search.mcps",
        defaultMessage: "Search MCP servers",
        description:
          "Placeholder text for searching MCP servers on the Skills & Apps page",
      }),
      sections: [
        {
          id: "mcps-installed",
          title: intl.formatMessage({
            id: "skills.appsPage.section.installedMcps",
            defaultMessage: "My MCPs",
            description:
              "Section heading for installed MCP servers on the Skills & Apps page",
          }),
        },
      ],
    };
  }

  return {
    headerCopy: {
      learnMoreUrl: CODEX_PLUGINS_URL,
      subtitle: intl.formatMessage({
        id: "skills.appsPage.subheading.plugins",
        defaultMessage: "Plugins make Codex work your way.",
        description:
          "Subheading shown above the Plugins tab on the Skills & Apps page",
      }),
      title: intl.formatMessage({
        id: "skills.appsPage.heading.plugins",
        defaultMessage: "Plugins",
        description:
          "Header title for the Plugins tab on the Skills & Apps page",
      }),
    },
    searchLabel: intl.formatMessage({
      id: "skills.appsPage.search.plugins.label",
      defaultMessage: "Search plugins",
      description:
        "Accessible label for the plugins search input on the Skills & Apps page",
    }),
    searchPlaceholder: intl.formatMessage({
      id: "skills.appsPage.search.plugins",
      defaultMessage: "Search plugins",
      description:
        "Placeholder text for searching plugins on the Skills & Apps page",
    }),
    sections: [],
  };
}

export function getSkillIdFromPath(skillPath: string): string | null {
  const normalized = skillPath.replace(/[\\/]+$/, "");
  const segments = normalized.split(/[\\/]/).filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const last = segments[segments.length - 1];
  if (last.toLowerCase() === "skill.md" && segments.length > 1) {
    return segments[segments.length - 2];
  }

  if (last.toLowerCase().endsWith(".md")) {
    return last.slice(0, -3);
  }

  return last;
}
