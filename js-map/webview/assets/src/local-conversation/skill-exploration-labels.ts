import type { GitCwd } from "protocol";

import { resolveFsPath } from "@/utils/path";

import type { ParsedCmd } from "./items/parsed-cmd";
import { normalizeConversationFilePath } from "./normalize-conversation-file-path";
import { getSkillPathInfo } from "./skill-path-utils";

export function formatSkillAwareExplorationLine({
  summary,
  cwd,
}: {
  summary: Extract<ParsedCmd, { type: "read" | "list_files" | "search" }>;
  cwd: GitCwd | null;
}): string | null {
  const skillPathInfo = getSkillPathInfoForSummary({ summary, cwd });
  if (!skillPathInfo) {
    return null;
  }
  const skillTarget = `${skillPathInfo.skillName} skill`;

  switch (summary.type) {
    case "read":
      return `Read ${skillTarget}`;
    case "list_files":
      return `Listed files in ${skillTarget}`;
    case "search": {
      if (summary.query && summary.query.trim().length > 0) {
        return `Searched for ${summary.query} in ${skillTarget}`;
      }
      return `Searched in ${skillTarget}`;
    }
  }
}

function getSkillPathInfoForSummary({
  summary,
  cwd,
}: {
  summary: Extract<ParsedCmd, { type: "read" | "list_files" | "search" }>;
  cwd: GitCwd | null;
}): ReturnType<typeof getSkillPathInfo> {
  const candidatePath = getSummaryCandidatePath({ summary, cwd });
  if (!candidatePath) {
    return null;
  }

  return getSkillPathInfo(candidatePath);
}

function getSummaryCandidatePath({
  summary,
  cwd,
}: {
  summary: Extract<ParsedCmd, { type: "read" | "list_files" | "search" }>;
  cwd: GitCwd | null;
}): string | null {
  switch (summary.type) {
    case "read":
      return resolveCandidatePath({
        path: summary.path ?? summary.name,
        cwd,
      });
    case "list_files":
      if (!summary.path) {
        return null;
      }
      return resolveCandidatePath({ path: summary.path, cwd });
    case "search":
      if (!summary.path) {
        return null;
      }
      return resolveCandidatePath({ path: summary.path, cwd });
  }
}

function resolveCandidatePath({
  path,
  cwd,
}: {
  path: string | null | undefined;
  cwd: GitCwd | null;
}): string | null {
  if (!path) {
    return null;
  }

  const normalizedPath = normalizeConversationFilePath(path);
  if (normalizedPath.length === 0) {
    return null;
  }

  if (cwd != null) {
    return normalizeConversationFilePath(resolveFsPath(cwd, normalizedPath));
  }
  return normalizedPath;
}
