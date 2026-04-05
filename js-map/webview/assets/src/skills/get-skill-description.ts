import type * as AppServer from "app-server-types";

/**
 * Prefer the interface short description field sourced from SKILL.toml,
 * then the frontmatter metadata field sourced from SKILL.md (TODO: Remove once deprecated),
 * then the frontmatter description field sourced from SKILL.md.
 */
export function getSkillDescription(skill: AppServer.v2.SkillMetadata): string {
  const interfaceShortDescription = skill.interface?.shortDescription;
  if (
    interfaceShortDescription != null &&
    interfaceShortDescription.trim().length > 0
  ) {
    return interfaceShortDescription;
  }

  const { short_description, shortDescription } =
    skill as AppServer.v2.SkillMetadata & {
      shortDescription?: string | null;
      short_description?: string | null;
    };
  const legacyShortDescription = short_description ?? shortDescription;
  if (legacyShortDescription != null) {
    return legacyShortDescription;
  }

  return skill.description;
}
