import type * as AppServer from "app-server-types";
import type { FileDescriptor } from "protocol";

import { filterNonImageFileAttachments } from "@/composer/image-file-attachments";
import {
  AUTO_RESOLVE_MERGE_BEGIN,
  CODE_REVIEW_BEGIN,
  extractPromptRequest,
  PULL_REQUEST_FIX_BEGIN,
  PRIOR_CONVERSATION_BEGIN,
  PROMPT_REQUEST_BEGIN,
} from "@/prompts/render-prompt";

import type { UserMessageLocalConversationItem } from "./local-conversation-item";
import {
  countPullRequestChecks,
  parseInlineComments,
} from "./user-message-prompt-context";

export type UserMessageItemCompareKey = {
  rawText: string;
  imageCount: number;
};

export type UserMessageItemFromInput = {
  compareKey: UserMessageItemCompareKey;
  item: UserMessageLocalConversationItem | null;
};

export function buildUserMessageItemFromInput(
  input: Array<AppServer.v2.UserInput> | undefined,
  attachments: Array<FileDescriptor> = [],
  options?: {
    enableHeartbeatAutomationRendering?: boolean;
  },
): UserMessageItemFromInput {
  if (!input || input.length === 0) {
    return {
      compareKey: {
        rawText: "",
        imageCount: 0,
      },
      item: null,
    };
  }

  const textItems = input.filter(
    (item): item is Extract<AppServer.v2.UserInput, { type: "text" }> =>
      item.type === "text",
  );
  const rawText = textItems.map((item) => item.text).join("\n");
  const imageUrls = input.flatMap((item) => {
    if (item.type === "image") {
      return [item.url];
    }
    if (item.type !== "localImage") {
      return [];
    }
    return [item.path];
  });
  const imageCount = input.filter(
    (item) => item.type === "image" || item.type === "localImage",
  ).length;

  if (textItems.length === 0) {
    return {
      compareKey: {
        rawText,
        imageCount,
      },
      item: null,
    };
  }

  const trimmedMessage = rawText.trim();
  const enableHeartbeatAutomationRendering =
    options?.enableHeartbeatAutomationRendering ?? false;
  const isSystemHeartbeat =
    enableHeartbeatAutomationRendering &&
    isHeartbeatAutomationUserMessage(rawText);
  const promptContext =
    trimmedMessage.indexOf(PROMPT_REQUEST_BEGIN) === -1
      ? trimmedMessage
      : trimmedMessage.slice(0, trimmedMessage.indexOf(PROMPT_REQUEST_BEGIN));
  const isCodeReview = promptContext.includes(CODE_REVIEW_BEGIN);
  const isPullRequestFix = promptContext.includes(PULL_REQUEST_FIX_BEGIN);
  const isAutoResolveSync = promptContext.includes(AUTO_RESOLVE_MERGE_BEGIN);
  const referencesPriorConversation =
    !isCodeReview &&
    !isPullRequestFix &&
    rawText.includes(PRIOR_CONVERSATION_BEGIN);
  const comments = parseInlineComments(rawText);
  const pullRequestCheckCount = countPullRequestChecks(rawText);
  const promptRequest = extractPromptRequest(rawText);

  return {
    compareKey: {
      rawText,
      imageCount,
    },
    item: {
      type: "user-message",
      message: isSystemHeartbeat ? "" : promptRequest,
      commentCount: comments.length,
      ...(comments.length > 0 ? { comments } : {}),
      pullRequestCheckCount,
      referencesPriorConversation,
      images: imageUrls,
      attachments: filterNonImageFileAttachments({
        attachments,
        input,
      }),
      ...(isSystemHeartbeat ? { systemHeartbeat: true } : {}),
      ...(isCodeReview ? { reviewMode: true } : {}),
      ...(isPullRequestFix ? { pullRequestFixMode: true } : {}),
      ...(isAutoResolveSync ? { autoResolveSync: true } : {}),
    },
  };
}

function isHeartbeatAutomationUserMessage(message: string): boolean {
  const trimmed = message.trim();
  // Heartbeat automations use a dedicated internal XML envelope. Keep this
  // matcher intentionally narrow so generic user text never picks up the
  // special divider treatment by accident.
  if (!trimmed.startsWith("<heartbeat>") || !trimmed.endsWith("</heartbeat>")) {
    return false;
  }
  return (
    /<current_time_iso>\s*[\s\S]*?\s*<\/current_time_iso>/i.test(trimmed) &&
    /<instructions>\s*[\s\S]*?\s*<\/instructions>/i.test(trimmed)
  );
}
