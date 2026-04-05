import type * as AppServer from "app-server-types";

type InstalledSkillMatchers = {
  byComparableKey: Map<string, Array<AppServer.v2.SkillMetadata>>;
  byName: Map<string, AppServer.v2.SkillMetadata>;
  byPath: Map<string, AppServer.v2.SkillMetadata>;
};

export function buildPluginDetailApps({
  directoryApps,
  pluginApps,
}: {
  directoryApps: Array<AppServer.v2.AppInfo>;
  pluginApps: Array<AppServer.v2.AppSummary>;
}): Array<AppServer.v2.AppInfo> {
  return pluginApps.flatMap((app) => {
    const matchingApp =
      directoryApps.find((directoryApp) => directoryApp.id === app.id) ?? null;
    return matchingApp == null ? [] : [matchingApp];
  });
}

export function buildPluginDetailSkills({
  installedSkills,
  pluginSkills,
}: {
  installedSkills: Array<{ skill: AppServer.v2.SkillMetadata }>;
  pluginSkills: Array<AppServer.v2.SkillSummary>;
}): {
  installedSkills: Array<AppServer.v2.SkillMetadata>;
  unavailableSkills: Array<AppServer.v2.SkillSummary>;
} {
  const matchers = createInstalledSkillMatchers(installedSkills);
  const matchedInstalledSkills: Array<AppServer.v2.SkillMetadata> = [];
  const unavailableSkills: Array<AppServer.v2.SkillSummary> = [];

  for (const pluginSkill of pluginSkills) {
    const installedSkill = findInstalledSkillForPluginSkill(
      pluginSkill,
      matchers,
    );

    if (installedSkill != null) {
      matchedInstalledSkills.push(installedSkill);
      continue;
    }

    unavailableSkills.push(pluginSkill);
  }

  return {
    installedSkills: matchedInstalledSkills,
    unavailableSkills,
  };
}

function createInstalledSkillMatchers(
  installedSkills: Array<{ skill: AppServer.v2.SkillMetadata }>,
): InstalledSkillMatchers {
  const byComparableKey = new Map<string, Array<AppServer.v2.SkillMetadata>>();
  const byName = new Map<string, AppServer.v2.SkillMetadata>();
  const byPath = new Map<string, AppServer.v2.SkillMetadata>();

  for (const { skill } of installedSkills) {
    byPath.set(skill.path, skill);
    byName.set(skill.name, skill);

    const comparableKey = getComparablePluginSkillKey(skill.name);
    const existingSkills = byComparableKey.get(comparableKey);
    if (existingSkills == null) {
      byComparableKey.set(comparableKey, [skill]);
      continue;
    }

    existingSkills.push(skill);
  }

  return {
    byComparableKey,
    byName,
    byPath,
  };
}

function findInstalledSkillForPluginSkill(
  pluginSkill: AppServer.v2.SkillSummary,
  matchers: InstalledSkillMatchers,
): AppServer.v2.SkillMetadata | null {
  const exactMatch =
    matchers.byPath.get(pluginSkill.path) ??
    matchers.byName.get(pluginSkill.name);
  if (exactMatch != null) {
    return exactMatch;
  }

  const comparableMatches = matchers.byComparableKey.get(
    getComparablePluginSkillKey(pluginSkill.name),
  );
  if (comparableMatches?.length === 1) {
    return comparableMatches[0];
  }

  return null;
}

function getComparablePluginSkillKey(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .split(":")
    .map((segment) => segment.replace(/[\s_-]+/g, ""))
    .join(":");
}
