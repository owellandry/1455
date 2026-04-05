import type * as AppServer from "app-server-types";

export function getThreadConversationTimestamps(thread: AppServer.v2.Thread): {
  createdAt: number;
  updatedAt: number;
} {
  const createdAtMs = Number(thread.createdAt) * 1000;
  const createdAt = Number.isFinite(createdAtMs) ? createdAtMs : Date.now();
  const updatedAtMs = Number(thread.updatedAt) * 1000;
  const updatedAt = Number.isFinite(updatedAtMs) ? updatedAtMs : createdAt;
  return {
    createdAt,
    updatedAt,
  };
}
