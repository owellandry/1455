import path from "path";

import {
  isAbsoluteFilesystemPath,
  replaceBackslashesWithSlashes,
} from "protocol";

import { logger } from "@/utils/logger";
import { fetchFromVSCode } from "@/vscode-api";

const IMAGE_MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export async function readImageFileAsDataUrl(
  imagePath: string | null | undefined,
): Promise<string | null> {
  const resolvedImagePath = getAbsoluteImageFilePath(imagePath);
  if (resolvedImagePath == null) {
    return null;
  }

  try {
    const response = await fetchFromVSCode("read-file-binary", {
      params: { path: resolvedImagePath },
    });
    if (!response.contentsBase64) {
      return null;
    }

    return `data:${getImageMimeType(resolvedImagePath)};base64,${response.contentsBase64}`;
  } catch (error) {
    logger.warning("Failed to inline local image", {
      safe: {},
      sensitive: {
        error,
        resolvedImagePath,
      },
    });
    return null;
  }
}

export function getAbsoluteImageFilePath(
  imagePath: string | null | undefined,
): string | null {
  if (imagePath == null) {
    return null;
  }

  const trimmedImagePath = imagePath.trim();
  if (trimmedImagePath.length === 0) {
    return null;
  }

  const lowerCasedImagePath = trimmedImagePath.toLowerCase();
  if (
    lowerCasedImagePath.startsWith("data:") ||
    lowerCasedImagePath.startsWith("http:") ||
    lowerCasedImagePath.startsWith("https:") ||
    lowerCasedImagePath.startsWith("file:") ||
    lowerCasedImagePath.startsWith("vscode-resource:") ||
    lowerCasedImagePath.startsWith("vscode-webview:") ||
    lowerCasedImagePath.startsWith("vscode-file:")
  ) {
    return null;
  }

  const normalizedImagePath = replaceBackslashesWithSlashes(trimmedImagePath);
  if (!isAbsoluteFilesystemPath(normalizedImagePath)) {
    return null;
  }

  return normalizedImagePath;
}

function getImageMimeType(filePath: string): string {
  return (
    IMAGE_MIME_TYPE_BY_EXTENSION[path.extname(filePath).toLowerCase()] ??
    "application/octet-stream"
  );
}
