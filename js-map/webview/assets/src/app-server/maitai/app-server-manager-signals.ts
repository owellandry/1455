import {
  derived,
  family,
  signal,
  type FamilyHandle,
  type ValueHandle,
} from "maitai";
import type { ConversationId } from "protocol";

import { AppScope } from "@/scopes/app-scope";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import { isThreadOverlayContextFromWindow } from "@/thread-overlay/is-thread-overlay-context";

import { AppServerManager } from "../app-server-manager";
import type { AppServerConversationState } from "../app-server-manager-types";

export const defaultAppServerManager$ = signal(AppScope, ({ queryClient }) => {
  const appServerManager = new AppServerManager(DEFAULT_HOST_ID, queryClient);
  if (!isThreadOverlayContextFromWindow()) {
    void appServerManager.refreshRecentConversations();
  }
  return appServerManager;
});

export const registeredHostIds$ = signal(
  AppScope,
  (): Array<string> => [DEFAULT_HOST_ID],
);

export const appServerManagerByHostId$ = family(
  AppScope,
  (hostId: string, { get, signal }) =>
    signal(() => {
      if (hostId === DEFAULT_HOST_ID) {
        return get(defaultAppServerManager$);
      }
      // Additional managers are added via appServerRegistry.addManager.
      return null;
    }),
);

/**
 * All registered app server managers.
 */
export const appServerManagers$ = derived(AppScope, ({ get }) => {
  const hostIds = get(registeredHostIds$);

  return hostIds.flatMap((hostId) => {
    const manager = get(get(appServerManagerByHostId$, hostId));
    return manager == null ? [] : [manager];
  });
});

export const hostId$ = conversationSignal(({ hostId }) => hostId ?? null);

export const title$ = conversationSignal(({ title }) => title);

export const appServerManager$ = family(
  AppScope,
  (conversationId: ConversationId | null) =>
    derived(AppScope, ({ get }) => {
      const hostId = get(get(hostId$, conversationId));
      if (hostId == null) {
        return null;
      }

      const managers = get(appServerManagers$);
      return managers.find((manager) => manager.getHostId() === hostId) ?? null;
    }),
);

/**
 * TODO (gpeal): Remove this once all call sites have migrated to maitai.
 */
export const appServerRegistryLookupInvalidation$ = signal(AppScope, 0);

/**
 * Do not export this.
 * More granular signals should be derived and used instead.
 */
const conversationState$ = family(
  AppScope,
  (conversationId: ConversationId | null, { signal }) =>
    signal<AppServerConversationState | null>(null, {
      onMount: (setConversationState, scope) => {
        if (conversationId == null) {
          return;
        }

        const subscriptionsByHostId = new Map<
          string,
          {
            manager: AppServerManager;
            unsubscribe: () => void;
          }
        >();
        let hostId: string | null = null;

        const syncManagerSubscriptions = (
          managers: Array<AppServerManager>,
        ): void => {
          // Before discovery we must watch every manager, because the
          // conversation can appear on any host. Once discovered, only watch
          // the owning host to avoid unrelated invalidations.
          const managersToWatch =
            hostId == null
              ? managers
              : managers.filter((manager) => manager.getHostId() === hostId);
          const managersByHostId = new Map(
            managersToWatch.map((manager) => [manager.getHostId(), manager]),
          );

          for (const [hostId, subscription] of subscriptionsByHostId) {
            const nextManager = managersByHostId.get(hostId);
            if (nextManager === subscription.manager) {
              continue;
            }

            subscription.unsubscribe();
            subscriptionsByHostId.delete(hostId);
          }

          for (const manager of managersToWatch) {
            const hostId = manager.getHostId();
            const currentSubscription = subscriptionsByHostId.get(hostId);
            if (currentSubscription?.manager === manager) {
              continue;
            }

            currentSubscription?.unsubscribe();
            const unsubscribeConversation = manager.addConversationCallback(
              conversationId,
              updateConversationState,
            );
            const unsubscribeMeta = manager.addAnyConversationMetaCallback(
              updateConversationState,
            );

            subscriptionsByHostId.set(hostId, {
              manager,
              unsubscribe: (): void => {
                unsubscribeConversation();
                unsubscribeMeta();
              },
            });
          }
        };

        const readConversationState = (
          managers: Array<AppServerManager>,
        ): {
          conversation: AppServerConversationState | null;
          hostId: string | null;
        } => {
          if (hostId != null) {
            const currentManager = managers.find(
              (manager) => manager.getHostId() === hostId,
            );
            const conversation =
              currentManager?.getConversation(conversationId) ?? null;
            if (conversation != null) {
              return {
                conversation,
                hostId,
              };
            }
          }

          for (const manager of managers) {
            const conversation = manager.getConversation(conversationId);
            if (conversation != null) {
              return {
                conversation,
                hostId: manager.getHostId(),
              };
            }
          }

          return {
            conversation: null,
            hostId: null,
          };
        };

        const updateConversationState = (): void => {
          const managers = scope.get(appServerManagers$);
          const nextConversationState = readConversationState(managers);

          hostId = nextConversationState.hostId;
          syncManagerSubscriptions(managers);
          setConversationState(nextConversationState.conversation);
        };

        const stopWatchingManagers = scope.watch((scope) => {
          scope.get(appServerManagers$);
          updateConversationState();
        });

        updateConversationState();

        return (): void => {
          stopWatchingManagers();
          for (const { unsubscribe } of subscriptionsByHostId.values()) {
            unsubscribe();
          }
        };
      },
    }),
);

function conversationSignal<TValue>(
  selector: (conversation: AppServerConversationState) => TValue,
): FamilyHandle<
  ConversationId | null | undefined,
  ValueHandle<TValue | null, typeof AppScope>,
  typeof AppScope
> {
  return family(AppScope, (conversationId: ConversationId | null | undefined) =>
    derived(AppScope, ({ get }) => {
      const conversation = get(get(conversationState$, conversationId));
      if (conversation == null) {
        return null;
      }

      return selector(conversation);
    }),
  );
}
