import { formatSkillTitle } from "@/skills/format-skill-title";

import { normalizeConversationFilePath } from "./normalize-conversation-file-path";

const CODEX_DIR_NAME = ".codex";
const AGENTS_DIR_NAME = ".agents";
const SKILLS_DIR_NAME = "skills";
const IMPORT_DIR_NAME = "_import";
const SYSTEM_DIR_NAME = ".system";
const SCRIPTS_DIR_NAME = "scripts";

export type SkillPathInfo = {
  skillName: string;
  isInScriptsFolder: boolean;
};

export function getSkillPathInfo(path: string): SkillPathInfo | null {
  const normalized = normalizeConversationFilePath(path).replace(/\/+$/, "");
  const segments = normalized
    .split("/")
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return null;
  }

  for (let index = 0; index < segments.length; index += 1) {
    const rootSegment = segments[index]?.toLowerCase();
    const skillsSegment = segments[index + 1]?.toLowerCase();
    const isSupportedSkillsRoot =
      rootSegment === CODEX_DIR_NAME || rootSegment === AGENTS_DIR_NAME;
    if (!isSupportedSkillsRoot || skillsSegment !== SKILLS_DIR_NAME) {
      continue;
    }

    const skillRootCandidate = segments[index + 2] ?? null;
    const skillRootCandidateLower = skillRootCandidate?.toLowerCase();
    const skillId =
      skillRootCandidateLower === IMPORT_DIR_NAME ||
      skillRootCandidateLower === SYSTEM_DIR_NAME
        ? (segments[index + 3] ?? null)
        : skillRootCandidate;
    if (skillId != null && skillId.length > 0) {
      const relativePathSegments =
        skillRootCandidateLower === IMPORT_DIR_NAME ||
        skillRootCandidateLower === SYSTEM_DIR_NAME
          ? segments.slice(index + 4)
          : segments.slice(index + 3);
      return {
        skillName: formatSkillTitle(skillId.replaceAll("_", "-")),
        isInScriptsFolder:
          relativePathSegments[0]?.toLowerCase() === SCRIPTS_DIR_NAME,
      };
    }
  }

  return null;
}
