import type * as AppServer from "app-server-types";

import { fetchFromVSCode } from "@/vscode-api";

type ProjectConfigField = "approval_policy" | "sandbox_mode" | "network_access";

export async function writeProjectConfigTomlValue({
  filePath,
  keyPath,
  value,
}: {
  filePath: string;
  keyPath: string;
  value: AppServer.v2.ConfigEdit["value"];
}): Promise<void> {
  const field = getProjectConfigField(keyPath, value);
  if (field == null) {
    throw new Error("Unsupported config key for project config write.");
  }

  await runProjectConfigTomlWrite({
    filePath,
    field,
  });
}

async function runProjectConfigTomlWrite({
  filePath,
  field,
}: {
  filePath: string;
  field: { name: ProjectConfigField; value: string | boolean };
}): Promise<void> {
  let currentContents = "";

  try {
    const response = await fetchFromVSCode("read-file", {
      params: { path: filePath },
    });
    currentContents = response.contents;
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw new Error("Failed to read project config.");
    }
  }

  const nextContents = updateTomlField(
    currentContents,
    field.name,
    field.value,
  );
  if (nextContents === currentContents) {
    return;
  }

  try {
    await fetchFromVSCode("local-environment-config-save", {
      params: {
        configPath: filePath,
        raw: nextContents,
      },
    });
  } catch {
    throw new Error("Failed to save project config.");
  }
}

function getProjectConfigField(
  keyPath: string,
  value: AppServer.v2.ConfigEdit["value"],
): { name: ProjectConfigField; value: string | boolean } | null {
  if (keyPath === "approval_policy" && typeof value === "string") {
    return { name: "approval_policy", value };
  }
  if (keyPath === "sandbox_mode" && typeof value === "string") {
    return { name: "sandbox_mode", value };
  }
  if (
    keyPath === "sandbox_workspace_write.network_access" &&
    typeof value === "boolean"
  ) {
    return { name: "network_access", value };
  }
  return null;
}

function updateTomlField(
  raw: string,
  field: ProjectConfigField,
  value: string | boolean,
): string {
  if (field === "network_access") {
    return updateSandboxWorkspaceWriteNetworkAccess(raw, value === true);
  }

  return updateTopLevelTomlString(raw, field, String(value));
}

function updateTopLevelTomlString(
  raw: string,
  key: "approval_policy" | "sandbox_mode",
  value: string,
): string {
  const lines = raw.length > 0 ? raw.split("\n") : [];
  let currentSection: string | null = null;
  let updated = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const sectionName = parseSectionName(line);
    if (sectionName != null) {
      currentSection = sectionName;
      continue;
    }

    if (currentSection == null && new RegExp(`^\\s*${key}\\s*=`).test(line)) {
      lines[index] = `${key} = "${value}"`;
      updated = true;
      break;
    }
  }

  if (!updated) {
    const firstSectionIndex = lines.findIndex(
      (line) => parseSectionName(line) != null,
    );
    const insertAt =
      firstSectionIndex === -1 ? lines.length : firstSectionIndex;
    lines.splice(insertAt, 0, `${key} = "${value}"`);
  }

  return ensureTrailingNewline(lines.join("\n"));
}

function updateSandboxWorkspaceWriteNetworkAccess(
  raw: string,
  value: boolean,
): string {
  const lines = raw.length > 0 ? raw.split("\n") : [];
  let inSection = false;
  let sectionEnd = lines.length;
  let foundKey = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const sectionName = parseSectionName(line);
    if (sectionName != null) {
      if (inSection) {
        sectionEnd = index;
        break;
      }
      if (sectionName === "sandbox_workspace_write") {
        inSection = true;
      }
      continue;
    }

    if (inSection && /^\s*network_access\s*=/.test(line)) {
      lines[index] = `network_access = ${value ? "true" : "false"}`;
      foundKey = true;
      break;
    }
  }

  if (inSection && !foundKey) {
    lines.splice(sectionEnd, 0, `network_access = ${value ? "true" : "false"}`);
    return ensureTrailingNewline(lines.join("\n"));
  }

  if (foundKey) {
    return ensureTrailingNewline(lines.join("\n"));
  }

  const prefix = raw.length > 0 && !raw.endsWith("\n") ? `${raw}\n` : raw;
  const separator = prefix.trim().length === 0 ? "" : "\n";
  return `${prefix}${separator}[sandbox_workspace_write]\nnetwork_access = ${
    value ? "true" : "false"
  }\n`;
}

function ensureTrailingNewline(raw: string): string {
  return raw.endsWith("\n") ? raw : `${raw}\n`;
}

function parseSectionName(line: string): string | null {
  const match = line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
  if (match?.[1] == null) {
    return null;
  }
  return match[1].trim();
}

function isMissingFileError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.trim().toLowerCase();
  return (
    message === "enoent" ||
    message.includes("no such file") ||
    message.includes("not found")
  );
}
