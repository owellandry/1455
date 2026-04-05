import type { CommentInputItem } from "protocol";

import { normalizePath } from "@/utils/path";

export const NULL_FILE = "/dev/null";

export function getCommentLineRange(comment: CommentInputItem): {
  startLine: number;
  endLine: number;
} {
  const endLine = comment.position.line;
  return {
    startLine: comment.position.start_line ?? endLine,
    endLine,
  };
}

export function formatCommentLineRange(comment: CommentInputItem): string {
  const { startLine, endLine } = getCommentLineRange(comment);
  if (startLine === endLine) {
    return String(endLine);
  }
  return `${startLine}-${endLine}`;
}

export function getProjectRelativePath(
  filePath: string,
  workspaceRoot?: string,
): string {
  if (!workspaceRoot) {
    return filePath;
  }
  const normRoot = workspaceRoot.replace(/\\/g, "/");
  const normPath = filePath.replace(/\\/g, "/");

  // 1) If filePath is absolute under the workspace root, strip the root prefix.
  const strippedRoot = normRoot.endsWith("/")
    ? normRoot.slice(0, -1)
    : normRoot;
  if (normPath.startsWith(strippedRoot + "/")) {
    return normPath.slice(strippedRoot.length + 1);
  }

  // 2) If filePath includes the workspace folder name as a segment (e.g.,
  //    codex/codex-apps/webview/...), strip everything up to the folder name.
  const lastSlash = strippedRoot.lastIndexOf("/");
  const folderName =
    lastSlash === -1 ? strippedRoot : strippedRoot.slice(lastSlash + 1);
  const marker = folderName + "/";
  const idx = normPath.indexOf(marker);
  if (idx !== -1 && (idx === 0 || normPath[idx - 1] === "/")) {
    return normPath.slice(idx + marker.length);
  }

  // 3) Otherwise, return as-is.
  return normPath;
}

export function getCommentText(comment: CommentInputItem): string {
  return comment.content
    .map((c) => (c.content_type === "text" ? c.text : ""))
    .join("");
}

export function normalizeDiffPath(
  path: string,
  workspaceRoot?: string,
): string | null {
  if (!path) {
    return null;
  }
  return normalizePath(getProjectRelativePath(path, workspaceRoot));
}

export function matchesCommentPath(
  commentPath: string,
  diffPath: string,
  workspaceRoot?: string,
): boolean {
  const normalizedCommentPath = normalizePath(commentPath);
  const normalizedDiffPath = normalizePath(diffPath);
  if (normalizedCommentPath === normalizedDiffPath) {
    return true;
  }
  const normalizedDiffRelative = normalizeDiffPath(diffPath, workspaceRoot);
  if (
    normalizedDiffRelative &&
    normalizedCommentPath === normalizedDiffRelative
  ) {
    return true;
  }
  const normalizedCommentRelative = normalizeDiffPath(
    commentPath,
    workspaceRoot,
  );
  if (
    normalizedCommentRelative &&
    normalizedCommentRelative === normalizedDiffPath
  ) {
    return true;
  }
  return (
    normalizedDiffPath.endsWith(`/${normalizedCommentPath}`) ||
    normalizedCommentPath.endsWith(`/${normalizedDiffPath}`)
  );
}
