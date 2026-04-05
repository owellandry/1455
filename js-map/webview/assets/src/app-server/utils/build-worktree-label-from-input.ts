import type * as AppServer from "app-server-types";

import { extractPromptRequest } from "@/prompts/render-prompt";

const DEFAULT_THREAD_NAME = "Codex Task";

export function buildWorktreeLabelFromInput(
  input: Array<AppServer.v2.UserInput>,
): string {
  const textItem = input.find((item) => item.type === "text");
  if (!textItem) {
    return DEFAULT_THREAD_NAME;
  }
  const extracted = extractPromptRequest(textItem.text).trim();
  if (extracted.length === 0) {
    return DEFAULT_THREAD_NAME;
  }
  const normalized = extracted.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return DEFAULT_THREAD_NAME;
  } else if (normalized.length <= 80) {
    return normalized;
  }
  return `${normalized.slice(0, 79).trimEnd()}…`;
}
