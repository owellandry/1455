import { logger } from "@/utils/logger";
import { fetchFromVSCode } from "@/vscode-api";

export async function setThreadPinned(
  threadId: string,
  pinned: boolean,
): Promise<void> {
  void fetchFromVSCode("set-thread-pinned", {
    params: {
      threadId,
      pinned,
    },
  }).catch((e) => {
    logger.error(`Failed to set thread pinned`, {
      safe: {},
      sensitive: { error: e },
    });
  });
}

export async function setPinnedThreadOrder(
  threadIds: Array<string>,
): Promise<void> {
  void fetchFromVSCode("set-pinned-threads-order", {
    params: {
      threadIds,
    },
  }).catch((e) => {
    logger.error(`Failed to set pinned thread order`, {
      safe: {},
      sensitive: { error: e },
    });
  });
}
