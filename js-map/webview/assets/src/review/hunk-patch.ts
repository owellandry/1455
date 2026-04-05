import type { Hunk } from "@pierre/diffs";

import { NULL_FILE } from "@/diff/diff-file-utils";
import { parseDiff, type CodexDiffFile } from "@/diff/parse-diff";

function stripTrailingNewline(line: string): string {
  return line.replace(/\r?\n$/, "");
}

function buildHeaderLines(file: CodexDiffFile): Array<string> {
  const headerOldPath = file.metadata.prevName ?? file.metadata.name;
  const oldPath = file.oldPath ?? file.metadata.prevName ?? file.metadata.name;
  const newPath = file.newPath ?? file.metadata.name;

  const lines: Array<string> = [
    `diff --git a/${headerOldPath} b/${file.metadata.name}`,
  ];

  if (oldPath === NULL_FILE) {
    const newFileMode = file.metadata.mode ?? "100644";
    lines.push(`new file mode ${newFileMode}`);
  } else if (newPath === NULL_FILE) {
    const deletedFileMode =
      file.metadata.prevMode ?? file.metadata.mode ?? "100644";
    lines.push(`deleted file mode ${deletedFileMode}`);
  }

  lines.push(
    `--- ${oldPath === NULL_FILE ? "/dev/null" : `a/${oldPath}`}`,
    `+++ ${newPath === NULL_FILE ? "/dev/null" : `b/${newPath}`}`,
  );

  return lines;
}

function buildHunkLines(file: CodexDiffFile, hunk: Hunk): Array<string> {
  const specs = stripTrailingNewline(
    hunk.hunkSpecs ??
      `@@ -${hunk.deletionStart ?? 0},${hunk.deletionCount ?? 0} +${hunk.additionStart ?? 0},${hunk.additionCount ?? 0} @@`,
  );
  const lines: Array<string> = [specs];

  for (const item of hunk.hunkContent) {
    if (item.type === "context") {
      const contextLines = file.metadata.additionLines.slice(
        item.additionLineIndex,
        item.additionLineIndex + item.lines,
      );
      lines.push(
        ...contextLines.map((line) => ` ${stripTrailingNewline(line)}`),
      );
      continue;
    }
    const deletionLines = file.metadata.deletionLines.slice(
      item.deletionLineIndex,
      item.deletionLineIndex + item.deletions,
    );
    const additionLines = file.metadata.additionLines.slice(
      item.additionLineIndex,
      item.additionLineIndex + item.additions,
    );
    lines.push(
      ...deletionLines.map(
        (line) => `-${stripTrailingNewline(line)}`, // deletions must be prefixed
      ),
      ...additionLines.map(
        (line) => `+${stripTrailingNewline(line)}`, // additions must be prefixed
      ),
    );
  }

  return lines;
}

function shouldIncludeFileWithoutHunks(file: CodexDiffFile): boolean {
  return file.metadata.type === "new" || file.metadata.type === "deleted";
}

function getRawDiffChunks(rawDiff: string): Array<string> {
  const headerMatches = Array.from(rawDiff.matchAll(/^diff --git .*$/gm));
  if (headerMatches.length === 0) {
    return rawDiff.trim().length === 0 ? [] : [rawDiff];
  }

  return headerMatches.map((match, index) => {
    const start = match.index ?? 0;
    const end =
      index + 1 < headerMatches.length
        ? (headerMatches[index + 1]?.index ?? rawDiff.length)
        : rawDiff.length;

    return rawDiff.slice(start, end);
  });
}

export function extractFilePatch(
  rawDiff: string | null,
  path: string,
): string | null {
  if (!rawDiff || rawDiff.trim().length === 0) {
    return null;
  }

  for (const chunk of getRawDiffChunks(rawDiff)) {
    if (parseDiff(chunk).some((file) => file.metadata.name === path)) {
      return chunk.endsWith("\n") ? chunk : `${chunk}\n`;
    }
  }

  return null;
}

export function buildHunkPatch(
  rawDiff: string | null,
  path: string,
  hunkIndex: number,
): string | null {
  if (!rawDiff || rawDiff.trim().length === 0) {
    return null;
  }

  const parsed = parseDiff(rawDiff);
  const file = parsed.find((diff) => diff.metadata.name === path);
  if (!file) {
    return null;
  }

  const hunk = file.metadata.hunks[hunkIndex];
  if (!hunk) {
    return null;
  }

  const lines = [...buildHeaderLines(file), ...buildHunkLines(file, hunk)];
  if (lines[lines.length - 1] !== "") {
    lines.push("");
  }

  return lines.join("\n");
}

export function buildFilePatch(
  rawDiff: string | null,
  path: string,
): string | null {
  if (!rawDiff || rawDiff.trim().length === 0) {
    return null;
  }

  const parsed = parseDiff(rawDiff);
  const file = parsed.find((diff) => diff.metadata.name === path);
  if (!file) {
    return null;
  }

  const lines = [...buildHeaderLines(file)];

  for (const hunk of file.metadata.hunks) {
    lines.push(...buildHunkLines(file, hunk));
  }

  if (lines[lines.length - 1] !== "") {
    lines.push("");
  }

  return lines.join("\n");
}

export function buildSectionPatch(rawDiff: string | null): string | null {
  if (!rawDiff || rawDiff.trim().length === 0) {
    return null;
  }

  // Rebuild the patch from parsed hunks so we avoid raw diff baggage, but keep
  // new/deleted files with no hunks so empty files can be reverted.
  const parsed = parseDiff(rawDiff);
  const patches: Array<string> = [];

  for (const file of parsed) {
    if (
      file.metadata.hunks.length === 0 &&
      !shouldIncludeFileWithoutHunks(file)
    ) {
      continue;
    }

    const lines = [...buildHeaderLines(file)];

    for (const hunk of file.metadata.hunks) {
      lines.push(...buildHunkLines(file, hunk));
    }

    if (lines[lines.length - 1] !== "") {
      lines.push("");
    }

    patches.push(lines.join("\n"));
  }

  if (patches.length === 0) {
    return null;
  }

  return patches.join("\n");
}

/**  Builds a unified diff string from parsed files and their hunks. */
export function buildPatchFromFiles(
  files: Array<CodexDiffFile>,
): string | null {
  if (files.length === 0) {
    return null;
  }
  const patches: Array<string> = [];

  for (const file of files) {
    if (
      file.metadata.hunks.length === 0 &&
      !shouldIncludeFileWithoutHunks(file)
    ) {
      continue;
    }

    const lines = [...buildHeaderLines(file)];

    for (const hunk of file.metadata.hunks) {
      lines.push(...buildHunkLines(file, hunk));
    }

    if (lines[lines.length - 1] !== "") {
      lines.push("");
    }

    patches.push(lines.join("\n"));
  }

  if (patches.length === 0) {
    return null;
  }

  return patches.join("\n");
}
