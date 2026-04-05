import type * as AppServer from "app-server-types";

/**
 * Create an image input item for MCP from either a data: URI or a local file path/URL.
 * - If `source` is a data URL (e.g. data:image/png;base64,...), send as `image` with `image_url`.
 * - Otherwise, treat as a local file path or file:// URL and send as `localImage` with `path`.
 */
export function createImageLocalInputItem(
  source: string,
  localPath?: string,
): AppServer.v2.UserInput {
  if (localPath) {
    return { type: "localImage", path: localPath };
  }
  const isDataUrl = /^data:image\//i.test(source);
  if (isDataUrl) {
    return { type: "image", url: source };
  }
  // file:// URIs → local file path; otherwise assume raw path
  let path = source;
  if (source.startsWith("file://")) {
    try {
      // Remove file:// prefix and decode URI components
      const withoutScheme = source.replace(/^file:\/\//i, "");
      path = decodeURIComponent(withoutScheme);
    } catch {
      // Fallback to original source if decoding fails
      path = source;
    }
  }
  return { type: "localImage", path };
}
