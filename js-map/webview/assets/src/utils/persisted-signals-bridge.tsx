import { useScope, useSignal } from "maitai";
import { useEffect, useRef } from "react";

import { AppScope } from "@/scopes/app-scope";

import {
  getPersistedValue,
  setPersistedValue,
  subscribeToPersistedValue,
} from "./persisted-atom-store";
import {
  persistedSignalRegistrations$,
  persistedStateByKey,
  subscribeToDeclaredPersistedSignals,
} from "./persisted-signal";

export function PersistedSignalsBridge(): null {
  const scope = useScope(AppScope);
  const applyingExternalKeysRef = useRef(new Set<string>());
  const registrations = useSignal(persistedSignalRegistrations$);
  const hydratedKeysRef = useRef(new Set<string>());
  const lastSyncedValueByKeyRef = useRef(new Map<string, unknown>());

  useEffect(() => {
    return subscribeToDeclaredPersistedSignals((nextRegistrations) => {
      scope.set(persistedSignalRegistrations$, nextRegistrations);
    });
  }, [scope]);

  useEffect(() => {
    const unsubscribers = registrations.map((registration) => {
      const state = scope.get(persistedStateByKey, registration.key);
      if (!hydratedKeysRef.current.has(registration.key)) {
        const initialValue = getPersistedValue(
          registration.key,
          registration.initialValue,
        );
        lastSyncedValueByKeyRef.current.set(registration.key, initialValue);
        state.value$.set(initialValue);
        hydratedKeysRef.current.add(registration.key);
      }

      const unsubscribeExternal = subscribeToPersistedValue(
        registration.key,
        registration.initialValue,
        (value) => {
          applyingExternalKeysRef.current.add(registration.key);
          lastSyncedValueByKeyRef.current.set(registration.key, value);
          try {
            // Keep host-sync bookkeeping out of the reactive graph so stale
            // renderer state cannot observe a transient mismatch and republish it.
            state.value$.set(value);
          } finally {
            applyingExternalKeysRef.current.delete(registration.key);
          }
        },
      );
      const unsubscribeWatch = scope.watch(({ get }) => {
        const value = get(state.value$);
        if (applyingExternalKeysRef.current.has(registration.key)) {
          return undefined;
        }

        const lastSyncedValue = lastSyncedValueByKeyRef.current.get(
          registration.key,
        );
        if (Object.is(value, lastSyncedValue)) {
          return undefined;
        }

        lastSyncedValueByKeyRef.current.set(registration.key, value);
        setPersistedValue(registration.key, value);
        return undefined;
      });

      return (): void => {
        unsubscribeExternal();
        unsubscribeWatch();
      };
    });

    return (): void => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [scope, registrations]);

  return null;
}
