import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { ThreadSortKey } from "app-server-types/v2";
import { useAtomValue } from "jotai";
import { useScope } from "maitai";
import type { ConversationId, LocalOrRemoteConversationId } from "protocol";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useEnabledRemoteConnections } from "@/remote-connections/remote-connection-visibility";
import { AppScope } from "@/scopes/app-scope";
import { aThreadSortKey } from "@/thread-sort";
import { logger } from "@/utils/logger";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

import type { AppServerManager } from "./app-server-manager";
import type {
  AppServerConfigNotice,
  AppServerConversationState,
} from "./app-server-manager-types";
import { AppServerRegistry } from "./app-server-registry";

function getRecentConversationDisplayManagers({
  appServerRegistry,
  enabledRemoteHostIds,
}: {
  appServerRegistry: AppServerRegistry;
  enabledRemoteHostIds: Set<string>;
}): Array<AppServerManager> {
  const defaultHostId = appServerRegistry.getDefault().getHostId();
  return appServerRegistry.getAll().filter((manager) => {
    if (manager.getHostId() === defaultHostId) {
      return true;
    }

    return enabledRemoteHostIds.has(manager.getHostId());
  });
}

function getRecentConversationRefreshManagers(
  appServerRegistry: AppServerRegistry,
): Array<AppServerManager> {
  const defaultHostId = appServerRegistry.getDefault().getHostId();
  return appServerRegistry.getAll().filter((manager) => {
    if (manager.getHostId() === defaultHostId) {
      return true;
    }
    const connectionState = manager.getConnectionState();
    return connectionState === "connected" || connectionState === "unauthed";
  });
}

function unsubscribeAll(unsubscribes: Array<() => void>): () => void {
  return () => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
  };
}

function subscribeToConversation(
  appServerManager: AppServerManager,
  conversationId: ConversationId | null,
  onStoreChange: () => void,
): () => void {
  if (conversationId == null) {
    return () => {};
  }
  return appServerManager.addConversationCallback(
    conversationId,
    onStoreChange,
  );
}

export function subscribeToRegistryManagers({
  appServerRegistry,
  onStoreChange,
  subscribeToManager,
}: {
  appServerRegistry: AppServerRegistry;
  onStoreChange: () => void;
  subscribeToManager: (
    manager: AppServerManager,
    onStoreChange: () => void,
  ) => () => void;
}): () => void {
  const subscriptionByHostId = new Map<
    string,
    { manager: AppServerManager; unsubscribe: () => void }
  >();

  const syncManagerSubscriptions = (): void => {
    const managers = appServerRegistry.getAll();
    const hostIds = new Set(managers.map((manager) => manager.getHostId()));

    for (const [hostId, { unsubscribe }] of subscriptionByHostId) {
      if (!hostIds.has(hostId)) {
        unsubscribe();
        subscriptionByHostId.delete(hostId);
      }
    }

    for (const manager of managers) {
      const hostId = manager.getHostId();
      const currentSubscription = subscriptionByHostId.get(hostId);
      if (currentSubscription?.manager === manager) {
        continue;
      }

      currentSubscription?.unsubscribe();
      subscriptionByHostId.set(hostId, {
        manager,
        unsubscribe: subscribeToManager(manager, onStoreChange),
      });
    }
  };

  syncManagerSubscriptions();

  const unsubscribeRegistry = appServerRegistry.addRegistryCallback(() => {
    syncManagerSubscriptions();
    onStoreChange();
  });

  return unsubscribeAll([
    unsubscribeRegistry,
    () => {
      for (const { unsubscribe } of subscriptionByHostId.values()) {
        unsubscribe();
      }
    },
  ]);
}

function subscribeToRegistryConversationLookup(
  appServerRegistry: AppServerRegistry,
  onStoreChange: () => void,
): () => void {
  return subscribeToRegistryManagers({
    appServerRegistry,
    onStoreChange,
    subscribeToManager: (manager, notify) =>
      unsubscribeAll([
        manager.addAnyConversationCallback(notify),
        manager.addAnyConversationMetaCallback(notify),
      ]),
  });
}

function mergeRecentConversationsAcrossRegistry({
  appServerRegistry,
  enabledRemoteHostIds,
  sortKey,
}: {
  appServerRegistry: AppServerRegistry;
  enabledRemoteHostIds: Set<string>;
  sortKey: ThreadSortKey;
}): Array<AppServerConversationState> {
  return getRecentConversationDisplayManagers({
    appServerRegistry,
    enabledRemoteHostIds,
  })
    .flatMap((manager) => manager.getRecentConversations())
    .sort((first, second) => {
      switch (sortKey) {
        case "created_at":
          return second.createdAt - first.createdAt;
        case "updated_at":
          return second.updatedAt - first.updatedAt;
      }
    });
}

async function refreshAndMergeRecentConversationsAcrossRegistry({
  appServerRegistry,
  enabledRemoteHostIds,
  sortKey,
}: {
  appServerRegistry: AppServerRegistry;
  enabledRemoteHostIds: Set<string>;
  sortKey: ThreadSortKey;
}): Promise<Array<AppServerConversationState>> {
  await Promise.all(
    getRecentConversationRefreshManagers(appServerRegistry).map((manager) =>
      manager.refreshRecentConversations({ sortKey }),
    ),
  );
  return mergeRecentConversationsAcrossRegistry({
    appServerRegistry,
    enabledRemoteHostIds,
    sortKey,
  });
}

function refreshConnectedManagersMissingRecentConversations({
  appServerRegistry,
  sortKey,
  refreshesInFlightHostIds,
}: {
  appServerRegistry: AppServerRegistry;
  sortKey: ThreadSortKey;
  refreshesInFlightHostIds: Set<string>;
}): void {
  for (const manager of getRecentConversationRefreshManagers(
    appServerRegistry,
  )) {
    const hostId = manager.getHostId();
    if (
      manager.hasFetchedRecentConversations ||
      refreshesInFlightHostIds.has(hostId)
    ) {
      continue;
    }
    refreshesInFlightHostIds.add(hostId);
    void manager
      .refreshRecentConversations({ sortKey })
      .catch((error) => {
        logger.warning("recent_conversations_refresh_failed", {
          safe: { hostId, sortKey },
          sensitive: { error },
        });
      })
      .finally(() => {
        refreshesInFlightHostIds.delete(hostId);
      });
  }
}

function getEnabledRemoteHostIdSetFromKey(
  enabledRemoteHostIdsKey: string,
): Set<string> {
  return new Set(JSON.parse(enabledRemoteHostIdsKey) as Array<string>);
}

function getEnabledRemoteHostIdsKey(enabledRemoteHostIds: Set<string>): string {
  return JSON.stringify(
    Array.from(enabledRemoteHostIds).sort((first, second) => {
      return first.localeCompare(second);
    }),
  );
}

export function useDefaultAppServerManager(): AppServerManager {
  const appServerRegistry = useAppServerRegistry();
  return useSyncExternalStore(
    (onStoreChange): (() => void) =>
      appServerRegistry.addRegistryCallback(onStoreChange),
    () => appServerRegistry.getDefault(),
  );
}

export function useAppServerRegistry(): AppServerRegistry {
  const scope = useScope(AppScope);
  const [appServerRegistry] = useState(() => new AppServerRegistry(scope));

  return useSyncExternalStore(
    (onStoreChange): (() => void) =>
      appServerRegistry.addRegistryCallback(onStoreChange),
    () => appServerRegistry,
  );
}

export function useAppServerManagerForHost(
  hostId: string,
): AppServerManager | null {
  const appServerRegistry = useAppServerRegistry();

  return useSyncExternalStore(
    (onStoreChange): (() => void) =>
      appServerRegistry.addRegistryCallback(onStoreChange),
    () => appServerRegistry.getForHostId(hostId),
  );
}

export function useAppServerManagerForConversationId(
  conversationId: ConversationId | null,
): AppServerManager {
  const appServerRegistry = useAppServerRegistry();
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) =>
      conversationId == null
        ? appServerRegistry.addRegistryCallback(onStoreChange)
        : subscribeToRegistryConversationLookup(
            appServerRegistry,
            onStoreChange,
          ),
    [appServerRegistry, conversationId],
  );
  return useSyncExternalStore(subscribe, () =>
    conversationId == null
      ? appServerRegistry.getDefault()
      : appServerRegistry.getForConversationId(conversationId),
  );
}

function useMaybeAppServerManagerForConversationId(
  conversationId: LocalOrRemoteConversationId | null,
): AppServerManager | null;
function useMaybeAppServerManagerForConversationId(
  conversationId: LocalOrRemoteConversationId | null,
): AppServerManager | null {
  const appServerRegistry = useAppServerRegistry();
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (conversationId == null) {
        return () => {};
      }
      return subscribeToRegistryConversationLookup(
        appServerRegistry,
        onStoreChange,
      );
    },
    [appServerRegistry, conversationId],
  );
  return useSyncExternalStore(subscribe, () =>
    conversationId == null
      ? null
      : appServerRegistry.getMaybeForConversationId(
          conversationId as ConversationId,
        ),
  );
}

export function useAppServerManagerForConversationIdOrDefault(
  conversationId: ConversationId | LocalOrRemoteConversationId | null,
): AppServerManager {
  const defaultAppServerManager = useDefaultAppServerManager();
  const conversationAppServerManager =
    useMaybeAppServerManagerForConversationId(conversationId);
  return conversationAppServerManager ?? defaultAppServerManager;
}

/**
 * @deprecated Use `useLocalConversationSelector` or a focused wrapper like
 * `useLocalConversationCwd` so components only subscribe to the fields they
 * render.
 */
export function useLocalConversation(
  conversationId: ConversationId | null,
): AppServerConversationState | null {
  return useLocalConversationSelector(
    conversationId,
    (conversation) => conversation,
  );
}

export function useLocalConversationSelector<T>(
  conversationId: ConversationId | null,
  selector: (conversation: AppServerConversationState | null) => T,
  isEqual: (previous: T, next: T) => boolean = Object.is,
): T {
  const appServerManager =
    useAppServerManagerForConversationIdOrDefault(conversationId);
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) =>
      subscribeToConversation(appServerManager, conversationId, onStoreChange),
    [appServerManager, conversationId],
  );
  const selectedRef = useRef<T | null>(null);
  const hasSelectedRef = useRef(false);
  return useSyncExternalStore(subscribe, () => {
    const nextSelected = selector(
      conversationId != null
        ? (appServerManager.getConversation(conversationId) ?? null)
        : null,
    );
    if (hasSelectedRef.current) {
      const previousSelected = selectedRef.current as T;
      if (isEqual(previousSelected, nextSelected)) {
        return previousSelected;
      }
    }

    hasSelectedRef.current = true;
    selectedRef.current = nextSelected;
    return nextSelected;
  });
}

export function useLocalConversationCwd(
  conversationId: ConversationId | null,
): string | null {
  return useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.cwd ?? null,
  );
}

export function useConversations(): UseQueryResult<
  Array<AppServerConversationState>,
  Error
> {
  return useRecentConversationQuery({
    queryKeyPrefix: "recent-conversations",
    subscribeToManager: (manager, notify) =>
      manager.addAnyConversationCallback(() => {
        notify();
      }),
  });
}

export function useConversationsMeta(): UseQueryResult<
  Array<AppServerConversationState>,
  Error
> {
  return useRecentConversationQuery({
    queryKeyPrefix: "recent-conversations-meta",
    subscribeToManager: (manager, notify) =>
      manager.addAnyConversationMetaCallback(() => {
        notify();
      }),
  });
}

function useRecentConversationQuery({
  queryKeyPrefix,
  subscribeToManager,
}: {
  queryKeyPrefix: "recent-conversations" | "recent-conversations-meta";
  subscribeToManager: (
    manager: AppServerManager,
    notify: () => void,
  ) => () => void;
}): UseQueryResult<Array<AppServerConversationState>, Error> {
  const appServerRegistry = useAppServerRegistry();
  const { enabledRemoteHostIdSet } = useEnabledRemoteConnections();
  const enabledRemoteHostIdsKey = getEnabledRemoteHostIdsKey(
    enabledRemoteHostIdSet,
  );
  const sortKey = useAtomValue(aThreadSortKey);
  const queryClient = useQueryClient();
  const refreshesInFlightHostIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const syncMergedConversations = (): void => {
      const enabledRemoteHostIdSet = getEnabledRemoteHostIdSetFromKey(
        enabledRemoteHostIdsKey,
      );
      queryClient.setQueryData(
        [queryKeyPrefix, sortKey, enabledRemoteHostIdsKey],
        mergeRecentConversationsAcrossRegistry({
          appServerRegistry,
          enabledRemoteHostIds: enabledRemoteHostIdSet,
          sortKey,
        }),
      );
      refreshConnectedManagersMissingRecentConversations({
        appServerRegistry,
        sortKey,
        refreshesInFlightHostIds: refreshesInFlightHostIdsRef.current,
      });
    };

    syncMergedConversations();
    return subscribeToRegistryManagers({
      appServerRegistry,
      onStoreChange: syncMergedConversations,
      subscribeToManager,
    });
  }, [
    appServerRegistry,
    enabledRemoteHostIdsKey,
    queryClient,
    queryKeyPrefix,
    sortKey,
    subscribeToManager,
  ]);

  return useQuery({
    queryKey: [queryKeyPrefix, sortKey, enabledRemoteHostIdsKey],
    staleTime: QUERY_STALE_TIME.INFINITE,
    queryFn: async (): Promise<Array<AppServerConversationState>> => {
      const enabledRemoteHostIdSet = getEnabledRemoteHostIdSetFromKey(
        enabledRemoteHostIdsKey,
      );
      return refreshAndMergeRecentConversationsAcrossRegistry({
        appServerRegistry,
        enabledRemoteHostIds: enabledRemoteHostIdSet,
        sortKey,
      });
    },
  });
}

export function useAppServerConfigNotices(): Array<AppServerConfigNotice> {
  const manager = useDefaultAppServerManager();
  return useSyncExternalStore(
    (onStoreChange): (() => void) =>
      manager.addConfigNoticeCallback(onStoreChange),
    () => manager.getConfigNotices(),
  );
}
