import type * as AppServer from "app-server-types";
import { INTERACTIVE_THREAD_SOURCE_KINDS } from "protocol";

type ListThreadsContext = {
  sendRequest: (
    method: "thread/list",
    params: AppServer.v2.ThreadListParams,
  ) => Promise<AppServer.v2.ThreadListResponse>;
  recentConversationsSortKey: AppServer.v2.ThreadSortKey;
};

export async function listAllThreads(
  context: ListThreadsContext,
  {
    modelProviders,
    archived = false,
  }: {
    modelProviders: Array<string> | null;
    archived?: boolean;
  },
): Promise<Array<AppServer.v2.Thread>> {
  const threads: Array<AppServer.v2.Thread> = [];
  const collectThreads = async (cursor: string | null): Promise<void> => {
    const threadList = await context.sendRequest("thread/list", {
      limit: 200,
      cursor,
      sortKey: context.recentConversationsSortKey,
      modelProviders,
      sourceKinds: INTERACTIVE_THREAD_SOURCE_KINDS,
      archived,
    });
    threads.push(...threadList.data);
    if (threadList.nextCursor) {
      await collectThreads(threadList.nextCursor);
    }
  };
  await collectThreads(null);
  return threads;
}
