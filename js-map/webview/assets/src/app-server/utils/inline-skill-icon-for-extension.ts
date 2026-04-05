import path from "path";

import type * as AppServer from "app-server-types";
import {
  isAbsoluteFilesystemPath,
  replaceBackslashesWithSlashes,
} from "protocol";

import { logger } from "@/utils/logger";
import { fetchFromVSCode } from "@/vscode-api";

export async function inlineSkillIconForExtension(
  skill: AppServer.v2.SkillMetadata,
  key: "iconSmall" | "iconLarge",
  value: string,
): Promise<void> {
  if (!skill.interface) {
    return;
  }
  const resolvedPath = resolveSkillIconPath(value, skill.path);
  if (!resolvedPath) {
    return;
  }
  const dataUrl = await readIconAsDataUrl(resolvedPath);
  if (!dataUrl) {
    return;
  }
  skill.interface[key] = dataUrl;
}

function resolveSkillIconPath(
  value: string,
  skillPath?: string | null,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const lowered = trimmed.toLowerCase();
  if (
    lowered.startsWith("data:") ||
    lowered.startsWith("http:") ||
    lowered.startsWith("https:") ||
    lowered.startsWith("file:") ||
    lowered.startsWith("vscode-resource:") ||
    lowered.startsWith("vscode-webview:") ||
    lowered.startsWith("vscode-file:")
  ) {
    return null;
  }
  const normalized = replaceBackslashesWithSlashes(trimmed);
  if (isAbsoluteFilesystemPath(normalized)) {
    return normalized;
  }
  if (!skillPath) {
    return null;
  }
  const baseDir = path.dirname(skillPath);
  return path.resolve(baseDir, normalized);
}

async function readIconAsDataUrl(fsPath: string): Promise<string | null> {
  try {
    const response = await fetchFromVSCode("read-file-binary", {
      params: { path: fsPath },
    });
    if (!response.contentsBase64) {
      return null;
    }
    const mime = getMimeTypeForPath(fsPath);
    return `data:${mime};base64,${response.contentsBase64}`;
  } catch (error) {
    logger.warning(`Failed to inline skill icon`, {
      safe: {},
      sensitive: {
        fsPath: fsPath,
        error: error,
      },
    });
    return null;
  }
}

function getMimeTypeForPath(fsPath: string): string {
  const ext = path.extname(fsPath).toLowerCase();
  switch (ext) {
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}
