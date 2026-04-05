import type * as AppServer from "app-server-types";
import { produce } from "immer";
import type { ConversationId } from "protocol";

import { extractPromptRequest } from "@/prompts/render-prompt";
import { logger } from "@/utils/logger";
import { fetchFromVSCode } from "@/vscode-api";

import type { AppServerManager } from "../app-server-manager";
import {
  MANUAL_THREAD_TITLE_MAX_CHARS,
  TITLE_INPUT_CHAR_LIMIT,
} from "../app-server-manager-constants";
import { normalizeManualThreadTitle } from "../utils/normalize-manual-thread-title";

export async function generateConversationTitle(
  manager: AppServerManager,
  conversationId: ConversationId,
  input: Array<AppServer.v2.UserInput>,
  cwd: string | null,
): Promise<void> {
  const conversation = manager.getConversation(conversationId);
  if (!conversation || conversation.title) {
    return;
  }

  const promptText = input
    .filter(
      (item): item is Extract<AppServer.v2.UserInput, { type: "text" }> =>
        item.type === "text",
    )
    .map((item) => item.text)
    .join("")
    .trim();
  const extractedPrompt = extractPromptRequest(promptText).trim();
  if (extractedPrompt.length === 0) {
    return;
  }
  const trimmedPrompt =
    extractedPrompt.length > TITLE_INPUT_CHAR_LIMIT
      ? extractedPrompt.slice(0, TITLE_INPUT_CHAR_LIMIT)
      : extractedPrompt;

  try {
    const response = await fetchFromVSCode("generate-thread-title", {
      params: {
        hostId: manager.getHostId(),
        prompt: trimmedPrompt,
        cwd,
      },
    });
    const title = response.title?.trim() ?? "";
    if (title.length === 0) {
      return;
    }
    manager.updateConversationState(conversationId, (draft) => {
      if (!draft.title) {
        draft.title = title;
      }
    });
    await persistThreadTitle(manager, { conversationId, title });
  } catch (error) {
    logger.warning("Failed to generate thread title", {
      safe: { conversationId },
      sensitive: {
        conversationId,
        error: error,
      },
    });
  }
}

async function persistThreadTitle(
  manager: AppServerManager,
  {
    conversationId,
    title,
  }: {
    conversationId: ConversationId;
    title: string;
  },
): Promise<void> {
  // TODO: Check for thread title duplication before setting it.
  try {
    await manager.sendRequest("thread/name/set", {
      threadId: conversationId,
      name: title,
    });
  } catch (error) {
    logger.warning(`Failed to set thread title`, {
      safe: { conversationId },
      sensitive: {
        error: error,
      },
    });
  }
}

export async function setThreadTitle(
  manager: AppServerManager,
  conversationId: ConversationId,
  title: string,
): Promise<void> {
  const normalized = normalizeManualThreadTitle(
    title,
    MANUAL_THREAD_TITLE_MAX_CHARS,
  );
  const nextTitle = normalized ?? null;
  if (!nextTitle) {
    return;
  }
  const conversation = manager.getConversation(conversationId);
  if (conversation) {
    const nextState = produce(conversation, (draft) => {
      draft.title = nextTitle;
    });
    manager.applyThreadTitleStateUpdateAndNotify(nextState);
  }
  await persistThreadTitle(manager, { conversationId, title: nextTitle });
}

export async function renameConversationTitle(
  manager: AppServerManager,
  conversationId: ConversationId,
  title: string,
): Promise<void> {
  const normalized = normalizeManualThreadTitle(
    title,
    MANUAL_THREAD_TITLE_MAX_CHARS,
  );
  const nextTitle = normalized ?? null;
  if (!nextTitle) {
    return;
  }
  const conversation = manager.getConversation(conversationId);
  if (!conversation) {
    return;
  }
  const nextState = produce(conversation, (draft) => {
    draft.title = nextTitle;
  });
  manager.applyThreadTitleStateUpdateAndNotify(nextState);
  await persistThreadTitle(manager, { conversationId, title: nextTitle });
}
