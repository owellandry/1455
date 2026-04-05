import type { ConversationId } from "protocol";

import type { AppScopeHandle } from "@/scopes/app-scope";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";

import type { AppServerManager } from "./app-server-manager";
import {
  appServerManagerByHostId$,
  appServerManagers$,
  appServerRegistryLookupInvalidation$,
  defaultAppServerManager$,
  registeredHostIds$,
} from "./maitai/app-server-manager-signals";

/**
 * Wrapper around AppScope to manage the collection of app server managers.
 * This class should be stateless and fully backed by AppScope so it can be
 * created anywhere it is needed.
 * AppScope should be the source of truth for all data.
 */
export class AppServerRegistry {
  constructor(private readonly scope: AppScopeHandle) {}

  addManager(manager: AppServerManager): void {
    const hostId = manager.getHostId();

    this.scope.set(registeredHostIds$, (hostIds) => {
      if (hostIds.includes(hostId)) {
        return hostIds;
      }

      return [...hostIds, hostId];
    });
    this.scope.get(appServerManagerByHostId$, hostId).set(manager);
    this.scope.set(
      appServerRegistryLookupInvalidation$,
      (version) => version + 1,
    );
  }

  addRegistryCallback(callback: () => void): () => void {
    let hasObservedInitialState = false;

    return this.scope.watch((scope) => {
      scope.get(appServerRegistryLookupInvalidation$);

      if (hasObservedInitialState) {
        callback();
      } else {
        hasObservedInitialState = true;
      }
    });
  }

  deleteManager(hostId: string): void {
    this.scope.set(registeredHostIds$, (ids) =>
      ids.filter((id) => id !== hostId),
    );
    this.scope.get(appServerManagerByHostId$, hostId).set(null);
    this.scope.set(appServerRegistryLookupInvalidation$, (v) => v + 1);
  }

  getAll(): Array<AppServerManager> {
    return this.scope.get(appServerManagers$);
  }

  getDefault(): AppServerManager {
    return this.scope.get(defaultAppServerManager$);
  }

  getForConversationId(conversationId: ConversationId): AppServerManager {
    const manager = this.getMaybeForConversationId(conversationId);
    if (manager != null) {
      return manager;
    }

    throw new Error(
      `No AppServerManager registered for conversationId: ${conversationId}`,
    );
  }

  getForHostId(hostId: string): AppServerManager | null {
    if (!this.scope.get(registeredHostIds$).includes(hostId)) {
      return null;
    }

    return this.scope.get(appServerManagerByHostId$, hostId).get();
  }

  getForHostIdOrThrow(hostId: string): AppServerManager {
    const manager = this.getForHostId(hostId);
    if (manager != null) {
      return manager;
    }

    throw new Error(`No AppServerManager registered for hostId: ${hostId}`);
  }

  getForHostIdOrThrowWhenDefaultHost(hostId: string): AppServerManager | null {
    const manager = this.getForHostId(hostId);
    if (manager != null) {
      return manager;
    }

    if (hostId === DEFAULT_HOST_ID) {
      throw new Error(`No AppServerManager registered for hostId: ${hostId}`);
    }

    return null;
  }

  getMaybeForConversationId(
    conversationId: ConversationId,
  ): AppServerManager | null {
    const managers = this.scope.get(appServerManagers$);
    for (const manager of managers) {
      if (manager.getConversation(conversationId) != null) {
        return manager;
      }

      if (
        manager
          .getRecentConversations()
          .some((conversation) => conversation.id === conversationId)
      ) {
        return manager;
      }
    }
    return null;
  }

  notifyRegistryChanged(): void {
    this.scope.set(appServerRegistryLookupInvalidation$, (v) => v + 1);
  }
}
