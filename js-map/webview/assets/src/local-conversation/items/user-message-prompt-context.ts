import {
  COMMENT_HEADER_BEGIN,
  COMMENTS_BEGIN,
  PULL_REQUEST_CHECKS_BEGIN,
  PROMPT_REQUEST_BEGIN,
} from "@/prompts/render-prompt";

import type { UserMessageDiffComment } from "./local-conversation-item";

export function parseInlineComments(
  message: string,
): Array<UserMessageDiffComment> {
  const startIndex = message.indexOf(COMMENTS_BEGIN);
  if (startIndex === -1) {
    return [];
  }

  const commentSectionStart = startIndex + COMMENTS_BEGIN.length;
  const afterStart = message.slice(commentSectionStart);
  const endIndex = afterStart.indexOf(PROMPT_REQUEST_BEGIN);
  const commentSection =
    endIndex === -1 ? afterStart : afterStart.slice(0, endIndex);
  const lines = commentSection.split("\n");
  const comments: Array<UserMessageDiffComment> = [];
  let currentHeaderIndex: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith(COMMENT_HEADER_BEGIN)) {
      continue;
    }

    if (currentHeaderIndex != null) {
      const parsedComment = parseCommentBlock(
        lines.slice(currentHeaderIndex, index),
      );
      if (parsedComment != null) {
        comments.push(parsedComment);
      }
    }
    currentHeaderIndex = index;
  }

  if (currentHeaderIndex != null) {
    const parsedComment = parseCommentBlock(lines.slice(currentHeaderIndex));
    if (parsedComment != null) {
      comments.push(parsedComment);
    }
  }

  return comments;
}

export function countPullRequestChecks(message: string): number {
  const startIndex = message.indexOf(PULL_REQUEST_CHECKS_BEGIN);
  if (startIndex === -1) {
    return 0;
  }

  const checksSectionStart = startIndex + PULL_REQUEST_CHECKS_BEGIN.length;
  const afterStart = message.slice(checksSectionStart);
  const endIndex = afterStart.indexOf(PROMPT_REQUEST_BEGIN);
  const checksSection =
    endIndex === -1 ? afterStart : afterStart.slice(0, endIndex);
  return checksSection
    .split("\n")
    .filter((line) => line.startsWith("## Check ")).length;
}

function parseCommentBlock(
  lines: Array<string>,
): UserMessageDiffComment | null {
  const header = lines[0] ?? "";
  if (!header.startsWith(COMMENT_HEADER_BEGIN)) {
    return null;
  }

  const legacyMatch = header.match(/^## Comment \d+ \((.*):([0-9-]+)\)$/);
  if (legacyMatch) {
    return {
      path: legacyMatch[1] ?? "",
      side: null,
      lineRange: legacyMatch[2] ?? null,
      body: lines.slice(1).join("\n").trim(),
    };
  }

  const path = getCommentMetadataValue(lines, "File:");
  const sideValue = getCommentMetadataValue(lines, "Side:");
  let side: UserMessageDiffComment["side"] = null;
  if (sideValue === "L") {
    side = "left";
  } else if (sideValue === "R") {
    side = "right";
  }
  const lineRange = getCommentMetadataValue(lines, "Lines:");
  const bodyIndex = lines.findIndex((line) => line === "Comment:");
  const body =
    bodyIndex === -1
      ? lines.slice(1).join("\n").trim()
      : lines
          .slice(bodyIndex + 1)
          .join("\n")
          .trim();

  return {
    path: path ?? "",
    side,
    lineRange,
    body,
  };
}

function getCommentMetadataValue(
  lines: Array<string>,
  prefix: string,
): string | null {
  const line = lines.find((candidate) => candidate.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : null;
}
