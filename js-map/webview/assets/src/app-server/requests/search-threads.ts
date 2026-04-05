import type * as AppServer from "app-server-types";
import {
  INTERACTIVE_THREAD_SOURCE_KINDS,
  type ThreadTitleState,
} from "protocol";

import { RECENT_CONVERSATIONS_PAGE_SIZE } from "../app-server-manager-constants";
import type { ThreadSearchResult } from "../app-server-manager-types";
import {
  buildThreadSearchResult,
  rankThreadSearchResults,
  THREAD_SEARCH_FILTERED_CANDIDATE_LIMIT,
} from "../utils/thread-search";

type SearchThreadsContext = {
  loadThreadTitleCache: () => Promise<ThreadTitleState>;
  sendRequest: (
    method: "thread/list",
    params: AppServer.v2.ThreadListParams,
  ) => Promise<AppServer.v2.ThreadListResponse>;
  recentConversationsSortKey: AppServer.v2.ThreadSortKey;
};

export async function searchThreads(
  context: SearchThreadsContext,
  {
    query,
    limit = RECENT_CONVERSATIONS_PAGE_SIZE,
  }: {
    query: string;
    limit?: number;
  },
): Promise<Array<ThreadSearchResult>> {
  const persistedTitles = await context.loadThreadTitleCache();
  const searchTerm = query.trim();
  if (searchTerm.length === 0) {
    const threadList = await context.sendRequest("thread/list", {
      limit,
      cursor: null,
      sortKey: context.recentConversationsSortKey,
      modelProviders: null,
      archived: false,
      sourceKinds: INTERACTIVE_THREAD_SOURCE_KINDS,
      searchTerm: null,
    });

    return threadList.data.map((thread) =>
      buildThreadSearchResult(thread, persistedTitles),
    );
  }

  const filteredThreadList = await context.sendRequest("thread/list", {
    limit: THREAD_SEARCH_FILTERED_CANDIDATE_LIMIT,
    cursor: null,
    sortKey: context.recentConversationsSortKey,
    modelProviders: null,
    archived: false,
    sourceKinds: INTERACTIVE_THREAD_SOURCE_KINDS,
    searchTerm,
  });

  return rankThreadSearchResults(
    filteredThreadList.data,
    persistedTitles,
    searchTerm,
    limit,
  );
}
