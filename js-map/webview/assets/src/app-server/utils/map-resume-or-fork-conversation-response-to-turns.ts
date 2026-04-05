import type * as AppServer from "app-server-types";
import type { FileDescriptor, PermissionsConfig } from "protocol";
import { buildWorkspaceWritePermissionsConfig } from "protocol";

import { extractFileAttachmentsFromPrompt } from "@/prompts/file-attachment-parser";

import type { AppServerConversationTurn } from "../app-server-manager-types";
import type { Item } from "../item-schema";

function extractAttachmentsFromUserInputs(
  userInputs: Array<AppServer.v2.UserInput>,
): Array<FileDescriptor> {
  const textItems = userInputs.filter(
    (item): item is Extract<AppServer.v2.UserInput, { type: "text" }> =>
      item.type === "text",
  );
  if (textItems.length === 0) {
    return [];
  }
  const message = textItems.map((item) => item.text).join("\n");
  return extractFileAttachmentsFromPrompt(message);
}

export function mapResumeOrForkConversationResponseToTurns(
  response: AppServer.v2.ThreadResumeResponse | AppServer.v2.ThreadForkResponse,
  {
    fallbackCwd = null,
  }: {
    fallbackCwd?: string | null;
  } = {},
): Array<AppServerConversationTurn> {
  const sessionCwd = (response as { sessionMeta?: { cwd?: string } | null })
    .sessionMeta?.cwd;
  const threadCwd = response.thread.cwd;
  const responseCwd =
    "cwd" in response && typeof response.cwd === "string" ? response.cwd : null;
  const cwd = threadCwd || sessionCwd || responseCwd || fallbackCwd || "/";
  const permissions: PermissionsConfig = {
    approvalPolicy: response.approvalPolicy,
    approvalsReviewer: response.approvalsReviewer,
    sandboxPolicy: response.sandbox,
  };
  return mapThreadToConversationTurns({
    thread: response.thread,
    model: response.model,
    reasoningEffort: response.reasoningEffort,
    cwd,
    permissions,
  });
}

export function mapThreadReadResponseToConversationTurns(
  response: AppServer.v2.ThreadReadResponse,
  {
    workspaceRoots = [],
    fallbackCwd = null,
    model = "",
    reasoningEffort = null,
  }: {
    workspaceRoots?: Array<string>;
    fallbackCwd?: string | null;
    model?: string;
    reasoningEffort?: AppServer.ReasoningEffort | null;
  } = {},
): Array<AppServerConversationTurn> {
  const cwd = response.thread.cwd || fallbackCwd || "/";
  const permissions = buildWorkspaceWritePermissionsConfig(workspaceRoots);
  return mapThreadToConversationTurns({
    thread: response.thread,
    model,
    reasoningEffort,
    cwd,
    permissions,
  });
}

function mapThreadToConversationTurns({
  thread,
  model,
  reasoningEffort,
  cwd,
  permissions,
}: {
  thread: AppServer.v2.Thread;
  model: string;
  reasoningEffort: AppServer.ReasoningEffort | null;
  cwd: string;
  permissions: PermissionsConfig;
}): Array<AppServerConversationTurn> {
  const turns: Array<AppServerConversationTurn> = [];
  for (const turn of thread.turns) {
    let userInputs: Array<AppServer.v2.UserInput> = [];
    const firstItem = turn.items[0];
    if (firstItem?.type === "userMessage") {
      userInputs = firstItem.content;
    }
    const attachments = extractAttachmentsFromUserInputs(userInputs);

    turns.push({
      params: {
        threadId: thread.id,
        input: userInputs,
        approvalPolicy: permissions.approvalPolicy,
        approvalsReviewer: permissions.approvalsReviewer,
        sandboxPolicy: permissions.sandboxPolicy,
        model,
        cwd: cwd || null,
        attachments,
        effort: reasoningEffort,
        summary: "none",
        personality: null,
        outputSchema: null,
        collaborationMode: null,
      },
      turnId: turn.id,
      turnStartedAtMs: null,
      finalAssistantStartedAtMs: null,
      status: turn.status,
      error: turn.error,
      diff: null,
      items: turn.items.map(normalizeThreadItemForConversationTurn),
    });
  }

  return turns;
}

function normalizeThreadItemForConversationTurn(
  item: AppServer.v2.ThreadItem,
): Item {
  if (item.type !== "collabAgentToolCall") {
    return item;
  }

  return {
    ...item,
    receiverThreads: item.receiverThreadIds.map((threadId) => ({
      threadId,
      thread: null,
    })),
  };
}
