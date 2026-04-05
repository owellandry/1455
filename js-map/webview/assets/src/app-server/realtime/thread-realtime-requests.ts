import type * as AppServer from "app-server-types";
import type { ConversationId } from "protocol";

import type { AppServerManager } from "../app-server-manager";

export async function startThreadRealtime({
  manager,
  conversationId,
  prompt,
  sessionId = null,
}: {
  manager: AppServerManager;
  conversationId: ConversationId;
  prompt: string;
  sessionId?: string | null;
}): Promise<void> {
  await manager.sendRequest("thread/realtime/start", {
    threadId: conversationId as string,
    prompt,
    sessionId,
  });
}

export function appendThreadRealtimeAudio({
  manager,
  audio,
  conversationId,
}: {
  manager: AppServerManager;
  audio: AppServer.v2.ThreadRealtimeAudioChunk;
  conversationId: ConversationId;
}): Promise<AppServer.v2.ThreadRealtimeAppendAudioResponse> {
  return manager.sendRequest("thread/realtime/appendAudio", {
    threadId: conversationId as string,
    audio,
  });
}

export async function stopThreadRealtime({
  manager,
  conversationId,
}: {
  manager: AppServerManager;
  conversationId: ConversationId;
}): Promise<void> {
  await manager.sendRequest("thread/realtime/stop", {
    threadId: conversationId as string,
  });
}
