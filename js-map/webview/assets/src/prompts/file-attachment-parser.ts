import type { FileDescriptor } from "protocol";

import { isAbsolutePath, normalizePath } from "@/utils/path";

import { FILES_MENTIONED_BEGIN, PROMPT_REQUEST_BEGIN } from "./render-prompt";

const FILE_ATTACHMENT_LINE_RE = /^##\s+(.+?):\s+(.+?)\s*$/;

function parseFileAttachmentLine(line: string): FileDescriptor | null {
  const match = line.match(FILE_ATTACHMENT_LINE_RE);
  if (!match) {
    return null;
  }
  const label = match[1]?.trim();
  const pathWithLine = match[2]?.trim();
  if (!label || !pathWithLine) {
    return null;
  }

  const path = pathWithLine.replace(
    /\s+\((?:lines\s+\d+-\d+|line\s+\d+)\)\s*$/,
    "",
  );
  if (!isAbsolutePath(normalizePath(path))) {
    return null;
  }

  return {
    label,
    path,
    fsPath: path,
  };
}

export function extractFileAttachmentsFromPrompt(
  message: string,
): Array<FileDescriptor> {
  const promptIndex = message.indexOf(PROMPT_REQUEST_BEGIN);
  if (promptIndex === -1) {
    return [];
  }
  const scopedMessage = message.slice(0, promptIndex);
  const markerIndex = scopedMessage.indexOf(FILES_MENTIONED_BEGIN);
  if (markerIndex === -1) {
    return [];
  }
  const afterMarker = scopedMessage.slice(
    markerIndex + FILES_MENTIONED_BEGIN.length,
  );
  const lines = afterMarker.split("\n");
  const attachments: Array<FileDescriptor> = [];
  for (const line of lines) {
    const trimmedLine = line.trimStart();
    if (!trimmedLine) {
      continue;
    }
    const parsed = parseFileAttachmentLine(trimmedLine);
    if (!parsed) {
      break;
    }
    attachments.push(parsed);
  }
  return attachments;
}
