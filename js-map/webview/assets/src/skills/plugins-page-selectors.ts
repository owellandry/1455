import type * as AppServer from "app-server-types";
import type { RecommendedSkillMetadata } from "protocol";

import { formatSkillTitle } from "@/skills/format-skill-title";
import { getSkillDescription } from "@/skills/get-skill-description";
import { getSkillIdFromPath } from "@/skills/plugins-page-utils";
import {
  RECOMMENDED_SKILL_NAME_ORDER_INDEX,
  RECOMMENDED_SKILL_NAMES,
} from "@/skills/recommended-skills-whitelist";
import { getSkillDisplayName } from "@/skills/skill-utils";

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeSkillMatchKey(name: string): Array<string> {
  const normalizedName = normalizeName(name);
  if (normalizedName.length === 0) {
    return [];
  }

  const compactName = normalizedName.replace(/[^a-z0-9]+/g, "");
  return compactName === normalizedName
    ? [normalizedName]
    : [normalizedName, compactName];
}

function createSkillMatchKeySet(
  values: Array<string | null | undefined>,
): Set<string> {
  const matchKeys = new Set<string>();

  for (const value of values) {
    if (value == null) {
      continue;
    }

    for (const matchKey of normalizeSkillMatchKey(value)) {
      matchKeys.add(matchKey);
    }
  }

  return matchKeys;
}

export function getInstalledSkillMatchKeys(
  skill: AppServer.v2.SkillMetadata,
): Set<string> {
  return createSkillMatchKeySet([
    getSkillIdFromPath(skill.path),
    skill.name,
    formatSkillTitle(skill.name),
    getSkillDisplayName(skill),
  ]);
}

export function getRecommendedSkillMatchKeys(
  skill: RecommendedSkillMetadata,
): Set<string> {
  return createSkillMatchKeySet([
    skill.id,
    skill.name,
    formatSkillTitle(skill.name),
  ]);
}

export function createInstalledSkillMatchKeySet(
  skills: Array<{ skill: AppServer.v2.SkillMetadata }>,
): Set<string> {
  const matchKeys = new Set<string>();

  for (const { skill } of skills) {
    for (const matchKey of getInstalledSkillMatchKeys(skill)) {
      matchKeys.add(matchKey);
    }
  }

  return matchKeys;
}

export function isRecommendedSkillInstalled({
  installedSkillMatchKeys,
  skill,
}: {
  installedSkillMatchKeys: Set<string>;
  skill: RecommendedSkillMetadata;
}): boolean {
  for (const matchKey of getRecommendedSkillMatchKeys(skill)) {
    if (installedSkillMatchKeys.has(matchKey)) {
      return true;
    }
  }

  return false;
}

export function selectInstalledSkillsWithoutRecommended({
  installedSkills,
  recommendedSkills,
}: {
  installedSkills: Array<{ skill: AppServer.v2.SkillMetadata }>;
  recommendedSkills: Array<RecommendedSkillMetadata>;
}): Array<{ skill: AppServer.v2.SkillMetadata }> {
  const recommendedSkillMatchKeys = new Set<string>();

  for (const skill of recommendedSkills) {
    for (const matchKey of getRecommendedSkillMatchKeys(skill)) {
      recommendedSkillMatchKeys.add(matchKey);
    }
  }

  return installedSkills.filter(({ skill }) => {
    for (const matchKey of getInstalledSkillMatchKeys(skill)) {
      if (recommendedSkillMatchKeys.has(matchKey)) {
        return false;
      }
    }

    return true;
  });
}

export function matchesSearchQuery(
  query: string,
  values: Array<string>,
): boolean {
  if (query.length === 0) {
    return true;
  }
  return values.join(" ").toLowerCase().includes(query);
}

export function selectFilteredInstalledSkills({
  skills,
  query,
}: {
  skills: Array<{
    skill: AppServer.v2.SkillMetadata;
  }>;
  query: string;
}): Array<{
  skill: AppServer.v2.SkillMetadata;
}> {
  return skills.filter(({ skill }) => {
    return matchesSearchQuery(query, [
      skill.name,
      getSkillDisplayName(skill),
      getSkillDescription(skill),
    ]);
  });
}

export function selectFilteredRecommendedSkills({
  skills,
  query,
}: {
  skills: Array<RecommendedSkillMetadata>;
  query: string;
}): Array<RecommendedSkillMetadata> {
  return skills.filter((skill) => {
    return matchesSearchQuery(query, [
      skill.name,
      skill.description,
      skill.shortDescription ?? "",
    ]);
  });
}

export function selectOrderedWhitelistedRecommendedSkills(
  skills: Array<RecommendedSkillMetadata>,
): Array<RecommendedSkillMetadata> {
  const filteredWhitelistedRecommendedSkills = skills.filter((skill) => {
    const normalizedRawName = normalizeName(skill.name);
    const normalizedDisplayName = normalizeName(formatSkillTitle(skill.name));
    return (
      RECOMMENDED_SKILL_NAMES.has(normalizedRawName) ||
      RECOMMENDED_SKILL_NAMES.has(normalizedDisplayName)
    );
  });

  return [...filteredWhitelistedRecommendedSkills].sort((a, b) => {
    const aIndex =
      RECOMMENDED_SKILL_NAME_ORDER_INDEX.get(
        normalizeName(formatSkillTitle(a.name)),
      ) ?? Number.MAX_SAFE_INTEGER;
    const bIndex =
      RECOMMENDED_SKILL_NAME_ORDER_INDEX.get(
        normalizeName(formatSkillTitle(b.name)),
      ) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

export function selectFilteredDirectoryApps({
  apps,
  query,
}: {
  apps: Array<AppServer.v2.AppInfo>;
  query: string;
}): Array<AppServer.v2.AppInfo> {
  return apps.filter((app) => {
    return matchesSearchQuery(query, [app.name, app.description ?? ""]);
  });
}

export function partitionAppsByAccessibility(
  apps: Array<AppServer.v2.AppInfo>,
): {
  installedApps: Array<AppServer.v2.AppInfo>;
  discoverApps: Array<AppServer.v2.AppInfo>;
} {
  return apps.reduce<{
    installedApps: Array<AppServer.v2.AppInfo>;
    discoverApps: Array<AppServer.v2.AppInfo>;
  }>(
    (acc, app) => {
      if (app.isAccessible) {
        acc.installedApps.push(app);
      } else {
        acc.discoverApps.push(app);
      }
      return acc;
    },
    {
      installedApps: [],
      discoverApps: [],
    },
  );
}
