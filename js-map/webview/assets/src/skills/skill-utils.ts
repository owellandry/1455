import type * as AppServer from "app-server-types";

import { escapePromptLinkPath } from "@/composer/prosemirror/prompt-link-path";
import { formatSkillTitle } from "@/skills/format-skill-title";

export function getSkillDisplayName(skill: AppServer.v2.SkillMetadata): string {
  const displayName = skill.interface?.displayName?.trim();
  if (displayName) {
    return displayName;
  }
  return formatSkillTitle(skill.name);
}

export function getSkillDefaultPrompt(
  skill: AppServer.v2.SkillMetadata,
): string | null {
  const defaultPrompt = skill.interface?.defaultPrompt;
  if (!defaultPrompt) {
    return null;
  }
  const trimmed = defaultPrompt.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
}

export function formatSkillMentionText({
  name,
  path,
}: {
  name: string;
  path?: string | null;
}): string {
  if (!path) {
    return `$${name}`;
  }
  return `[$${name}](${escapePromptLinkPath(path)})`;
}

function ensureTrailingSpace(value: string): string {
  return value.endsWith(" ") ? value : `${value} `;
}

export function getSkillPrefillPrompt(
  skill: AppServer.v2.SkillMetadata,
): string {
  const defaultPrompt = getSkillDefaultPrompt(skill);
  const mention = formatSkillMentionText({
    name: skill.name,
    path: skill.path,
  });
  if (!defaultPrompt) {
    return ensureTrailingSpace(mention);
  }
  const normalizedDefault = defaultPrompt.toLowerCase();
  const normalizedNameMarker = `[$${skill.name.toLowerCase()}](`;
  if (normalizedDefault.includes(normalizedNameMarker)) {
    return ensureTrailingSpace(defaultPrompt);
  }
  const normalizedName = `$${skill.name.toLowerCase()}`;
  if (!skill.path) {
    if (normalizedDefault.includes(normalizedName)) {
      return ensureTrailingSpace(defaultPrompt);
    }
  }
  return ensureTrailingSpace(`${defaultPrompt} ${mention}`);
}
