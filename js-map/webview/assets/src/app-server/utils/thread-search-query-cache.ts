import type { QueryClient } from "@tanstack/react-query";
import type { ThreadTitleState } from "protocol";
import { GlobalStateKey } from "protocol";

import { logger } from "@/utils/logger";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { fetchFromVSCode } from "@/vscode-api";

import { THREAD_TITLE_MAX_ENTRIES } from "../app-server-manager-constants";
import { normalizeThreadTitleState } from "./normalize-thread-title-state";

export function getThreadTitleStateQueryKey(): Array<unknown> {
  return ["thread-title-state"];
}

export async function loadThreadTitleState({
  queryClient,
  forceRefresh = false,
}: {
  queryClient: QueryClient;
  forceRefresh?: boolean;
}): Promise<ThreadTitleState> {
  const queryKey = getThreadTitleStateQueryKey();
  if (forceRefresh) {
    await queryClient.invalidateQueries({ queryKey, exact: true });
  }
  return queryClient.fetchQuery({
    queryKey,
    staleTime: QUERY_STALE_TIME.INFINITE,
    queryFn: async (): Promise<ThreadTitleState> => {
      try {
        const response = await fetchFromVSCode("get-global-state", {
          params: { key: GlobalStateKey.THREAD_TITLES },
        });
        return normalizeThreadTitleState(
          response.value,
          THREAD_TITLE_MAX_ENTRIES,
        );
      } catch (error) {
        logger.warning(`Failed to load thread titles`, {
          safe: {},
          sensitive: {
            error: error,
          },
        });
        return { titles: {}, order: [] };
      }
    },
  });
}

export function getCachedThreadTitle({
  conversationId,
  queryClient,
}: {
  conversationId: string;
  queryClient: QueryClient;
}): string | null {
  const persistedTitles =
    queryClient.getQueryData<ThreadTitleState>(getThreadTitleStateQueryKey()) ??
    null;
  return persistedTitles?.titles[conversationId] ?? null;
}

export function cacheThreadTitle({
  conversationId,
  queryClient,
  title,
}: {
  conversationId: string;
  queryClient: QueryClient;
  title: string;
}): void {
  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0) {
    return;
  }

  const persistedTitles = queryClient.getQueryData<ThreadTitleState>(
    getThreadTitleStateQueryKey(),
  ) ?? { titles: {}, order: [] };
  const nextOrder = persistedTitles.order.filter(
    (entry) => entry !== conversationId,
  );
  nextOrder.unshift(conversationId);
  while (nextOrder.length > THREAD_TITLE_MAX_ENTRIES) {
    const dropped = nextOrder.pop();
    if (dropped) {
      delete persistedTitles.titles[dropped];
    }
  }

  queryClient.setQueryData<ThreadTitleState>(getThreadTitleStateQueryKey(), {
    titles: {
      ...persistedTitles.titles,
      [conversationId]: trimmedTitle,
    },
    order: nextOrder,
  });
}

export function invalidateThreadSearchQueries({
  hostId,
  queryClient,
}: {
  hostId: string;
  queryClient: QueryClient;
}): void {
  void queryClient.invalidateQueries({
    queryKey: getThreadTitleStateQueryKey(),
    exact: true,
  });
  void queryClient.invalidateQueries({
    queryKey: ["command-menu-thread-search", hostId],
  });
}
