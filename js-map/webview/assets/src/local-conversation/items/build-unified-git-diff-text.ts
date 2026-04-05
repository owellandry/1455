import type { FileChange } from "app-server-types";

/**
 * Merges additions and removals into a unified diff.
 */
export function buildUnifiedGitDiffText(
  path: string,
  change: FileChange,
): string | null {
  if (change.type === "update") {
    const oldPath = path;
    const newPath = change.move_path ?? path;
    const body = change.unified_diff.trimStart();
    const hasDashHeaders = /\n?---\s/.test(body);
    const hasDiffHeader = /^diff --git /m.test(body);
    const patchedBody = hasDashHeaders
      ? body
      : `--- a/${oldPath}\n+++ b/${newPath}\n${body}`;
    const header = hasDiffHeader
      ? ""
      : `diff --git a/${oldPath} b/${newPath}\n`;
    return `${header}${patchedBody}`;
  }
  if (change.type === "add") {
    const linesRaw = change.content.replace(/\r\n/g, "\n").split("\n");
    const lines =
      linesRaw.length > 0 && linesRaw[linesRaw.length - 1] === ""
        ? linesRaw.slice(0, -1)
        : linesRaw;
    const count = lines.length;
    const plusLines = lines.map((l) => "+" + l).join("\n");
    const hunk = count > 0 ? `@@ -0,0 +1,${count} @@\n${plusLines}\n` : "";
    return [
      `diff --git a/${path} b/${path}`,
      "new file mode 100644",
      "--- /dev/null",
      `+++ b/${path}`,
      hunk,
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (change.type === "delete") {
    const linesRaw = change.content.replace(/\r\n/g, "\n").split("\n");
    const lines =
      linesRaw.length > 0 && linesRaw[linesRaw.length - 1] === ""
        ? linesRaw.slice(0, -1)
        : linesRaw;
    const count = lines.length;
    const minusLines = lines.map((l) => "-" + l).join("\n");
    const hunk = count > 0 ? `@@ -1,${count} +0,0 @@\n${minusLines}\n` : "";
    return [
      `diff --git a/${path} b/${path}`,
      "deleted file mode 100644",
      `--- a/${path}`,
      "+++ /dev/null",
      hunk,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return null;
}
