import {
  getIpcMessageVersion,
  type IpcBroadcastMessageContent,
  type IpcBroadcastMessageForView,
} from "protocol";

import { logger } from "@/utils/logger";

import { messageBus } from "./message-bus";

export function registerIpcBroadcastHandler<
  K extends keyof IpcBroadcastMessageContent,
>(
  method: K,
  handler: (message: IpcBroadcastMessageForView<K>) => void,
): () => void {
  return messageBus.subscribe("ipc-broadcast", (message): void => {
    if (message.method !== method) {
      return;
    }
    const expectedVersion = getIpcMessageVersion(method);
    const messageVersion = message.version ?? 0;
    if (messageVersion !== expectedVersion) {
      logger.warning(`Ignoring ipc-broadcast`, {
        safe: {},
        sensitive: {
          method: method,
          sourceClientId: message.sourceClientId,
          version: messageVersion,
          expectedVersion: expectedVersion,
        },
      });
      return;
    }
    handler(message as IpcBroadcastMessageForView<K>);
  });
}
