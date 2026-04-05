import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

import { messageBus } from "@/message-bus";

/**
 * Invalidates a query key in the current webview's QueryClient, then broadcasts
 * the same invalidation to sibling webviews.
 *
 * In multi-panel or multi-window environments, each webview has its own
 * QueryClient, so local invalidation alone does not make other views refetch or
 * mark the same data stale. The broadcast function is injected so the caller
 * can choose the transport separately from the cache operation.
 */
export async function invalidateQueriesAndBroadcast(
  queryClient: QueryClient,
  queryKey: QueryKey,
  broadcastInvalidation: (queryKey: QueryKey) => void | Promise<void>,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey });
  await broadcastInvalidation(queryKey);
}

/**
 * Returns a React-friendly invalidation helper bound to the current webview's
 * QueryClient and the app-level broadcast transport.
 */
export function useInvalidateQueriesAndBroadcast(): (
  queryKey: QueryKey,
) => Promise<void> {
  const queryClient = useQueryClient();

  return async (queryKey: QueryKey): Promise<void> => {
    await invalidateQueriesAndBroadcast(
      queryClient,
      queryKey,
      broadcastInvalidation,
    );
  };
}

function broadcastInvalidation(queryKey: QueryKey): void {
  messageBus.dispatchMessage("query-cache-invalidate", {
    queryKey: [...queryKey],
  });
}
