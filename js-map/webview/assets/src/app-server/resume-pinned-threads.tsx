import { useSetAtom } from "jotai";
import { createConversationId } from "protocol";
import { useEffect, useEffectEvent, useRef, useSyncExternalStore } from "react";

import { useFetchFromVSCode } from "@/vscode-api";

import { useDefaultAppServerManager } from "./app-server-manager-hooks";
import {
  aPinnedThreadsHydratedKey,
  buildPinnedThreadsHydrationKey,
} from "./pinned-threads-hydration";

/**
 * Ensures pinned threads are present in the local conversation store by
 * reading any pinned thread that isn't already hydrated.
 */
export function ResumePinnedThreads(): null {
  const mcpManager = useDefaultAppServerManager();
  const { data: pinnedThreadsResponse } = useFetchFromVSCode(
    "list-pinned-threads",
  );
  const pinnedThreadIds = pinnedThreadsResponse?.threadIds;
  const pinnedIdsKey = buildPinnedThreadsHydrationKey(pinnedThreadIds);

  const setPinnedThreadsHydratedKey = useSetAtom(aPinnedThreadsHydratedKey);

  const lastHydratedKeyRef = useRef<string>("");
  const inFlightKeyRef = useRef<string>("");
  const lastMissingKeyRef = useRef<string>("");
  const missingPinnedThreadIdsRef = useRef<Array<string>>([]);

  const missingPinnedThreadsKey = useSyncExternalStore(
    (onStoreChange) =>
      mcpManager.addAnyConversationMetaCallback((): void => {
        onStoreChange();
      }),
    () => {
      if (!pinnedThreadIds || pinnedThreadIds.length === 0) {
        missingPinnedThreadIdsRef.current = [];
        return "";
      }
      const missingPinnedThreadIds = pinnedThreadIds.filter((threadId) => {
        const conversationId = createConversationId(threadId);
        return mcpManager.getConversation(conversationId) == null;
      });
      missingPinnedThreadIdsRef.current = missingPinnedThreadIds;
      return missingPinnedThreadIds.join(",");
    },
    () => "",
  );
  const missingPinnedThreadIds = missingPinnedThreadIdsRef.current;
  const hydratePinnedThreads = useEffectEvent(async (): Promise<void> => {
    try {
      await mcpManager.hydratePinnedThreads(missingPinnedThreadIds);
      if (inFlightKeyRef.current !== pinnedIdsKey) {
        return;
      }
      lastHydratedKeyRef.current = pinnedIdsKey;
      setPinnedThreadsHydratedKey(pinnedIdsKey);
    } finally {
      if (inFlightKeyRef.current === pinnedIdsKey) {
        inFlightKeyRef.current = "";
      }
    }
  });

  useEffect(() => {
    mcpManager.setPinnedThreadIds(pinnedThreadIds ?? []);
    if (!pinnedThreadIds || pinnedThreadIds.length === 0) {
      lastHydratedKeyRef.current = "";
      inFlightKeyRef.current = "";
      lastMissingKeyRef.current = "";
      setPinnedThreadsHydratedKey("");
      return;
    }
    if (missingPinnedThreadIds.length === 0) {
      if (lastHydratedKeyRef.current !== pinnedIdsKey) {
        lastHydratedKeyRef.current = pinnedIdsKey;
        setPinnedThreadsHydratedKey(pinnedIdsKey);
      }
      lastMissingKeyRef.current = "";
      return;
    }
    lastHydratedKeyRef.current = "";
    setPinnedThreadsHydratedKey("");
    if (
      pinnedIdsKey === inFlightKeyRef.current &&
      missingPinnedThreadsKey === lastMissingKeyRef.current
    ) {
      return;
    }

    inFlightKeyRef.current = pinnedIdsKey;
    lastMissingKeyRef.current = missingPinnedThreadsKey;

    void hydratePinnedThreads();
  }, [
    mcpManager,
    pinnedIdsKey,
    pinnedThreadIds,
    setPinnedThreadsHydratedKey,
    missingPinnedThreadsKey,
    missingPinnedThreadIds,
  ]);

  return null;
}
