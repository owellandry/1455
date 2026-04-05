import { useQueryClient } from "@tanstack/react-query";
import type { InboxItem } from "protocol";

import { useWindowType } from "@/hooks/use-window-type";
import { messageBus } from "@/message-bus";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { getQueryKey, useFetchFromVSCode } from "@/vscode-api";

export function useInboxItems(): {
  items: Array<InboxItem>;
  isLoading: boolean;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
} {
  const windowType = useWindowType();
  const queryClient = useQueryClient();
  const inboxQuery = useFetchFromVSCode("inbox-items", {
    params: { limit: 200 },
    queryConfig: {
      enabled: windowType === "electron",
      staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
      intervalMs: QUERY_STALE_TIME.ONE_MINUTE,
    },
  });

  const markRead = (id: string): void => {
    queryClient.setQueryData(
      getQueryKey("inbox-items", { limit: 200 }),
      (previous: { items: Array<InboxItem> } | undefined) => {
        if (previous == null) {
          return previous;
        }
        return {
          ...previous,
          items: previous.items.map((item) =>
            item.id === id && item.readAt == null
              ? {
                  ...item,
                  readAt: Date.now(),
                }
              : item,
          ),
        };
      },
    );
    messageBus.dispatchMessage("inbox-item-set-read-state", {
      id,
      isRead: true,
    });
  };

  const markUnread = (id: string): void => {
    queryClient.setQueryData(
      getQueryKey("inbox-items", { limit: 200 }),
      (previous: { items: Array<InboxItem> } | undefined) => {
        if (previous == null) {
          return previous;
        }
        return {
          ...previous,
          items: previous.items.map((item) =>
            item.id === id && item.readAt != null
              ? {
                  ...item,
                  readAt: null,
                }
              : item,
          ),
        };
      },
    );
    messageBus.dispatchMessage("inbox-item-set-read-state", {
      id,
      isRead: false,
    });
  };

  return {
    items: inboxQuery.data?.items ?? [],
    isLoading: inboxQuery.isLoading,
    markRead,
    markUnread,
  };
}
