import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { messageBus } from "@/message-bus";

import { logger } from "./logger";
import {
  applyExternalPersistedAtomUpdate,
  clearLegacyPersistedAtomState,
  initializePersistedAtomStore,
  readLegacyPersistedAtomState,
  type PersistedAtomState,
} from "./persisted-atom-store";

const SYNC_TIMEOUT_MS = 5000;

const isTestEnvironment = __TEST__ || __STORYBOOK__;

export function PersistedStateProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement | null {
  const [isHydrated, setIsHydrated] = useState<boolean>(isTestEnvironment);
  const hydratedRef = useRef<boolean>(isTestEnvironment);
  const [legacyState] = useState<PersistedAtomState>(() =>
    readLegacyPersistedAtomState(),
  );
  const publishUpdate = useCallback((key: string, value: unknown): void => {
    messageBus.dispatchMessage("persisted-atom-update", {
      key,
      value,
      deleted: value === undefined,
    });
  }, []);

  // Ensure this only happens once. useState is more reliable for that than useEffect.
  useState<boolean>(() => {
    initializePersistedAtomStore(legacyState, publishUpdate);
    return true;
  });

  useEffect(() => {
    if (isTestEnvironment) {
      return;
    }

    let canceled = false;

    const unsubscribeSync = messageBus.subscribe(
      "persisted-atom-sync",
      ({ state }): void => {
        if (canceled || hydratedRef.current) {
          return;
        }
        const hostState = state ?? {};
        const mergedState = { ...legacyState, ...hostState };
        initializePersistedAtomStore(mergedState, publishUpdate);
        hydratedRef.current = true;
        setIsHydrated(true);

        const migrations = computeLegacyMigrations(legacyState, hostState);
        migrations.forEach(({ key, value }) => publishUpdate(key, value));
        clearLegacyPersistedAtomState();
      },
    );
    const unsubscribeUpdated = messageBus.subscribe(
      "persisted-atom-updated",
      ({ key, value, deleted }): void => {
        if (!hydratedRef.current) {
          return;
        }
        const nextValue = deleted ? undefined : value;
        applyExternalPersistedAtomUpdate(key, nextValue);
      },
    );

    messageBus.dispatchMessage("persisted-atom-sync-request", {});

    const timeoutId = window.setTimeout(() => {
      if (canceled || hydratedRef.current) {
        return;
      }
      logger.error(
        "[persisted-atom] host did not respond to sync request; continuing with legacy state only",
      );
      initializePersistedAtomStore(legacyState, publishUpdate);
      hydratedRef.current = true;
      setIsHydrated(true);
      clearLegacyPersistedAtomState();
    }, SYNC_TIMEOUT_MS);

    return (): void => {
      canceled = true;
      window.clearTimeout(timeoutId);
      unsubscribeSync();
      unsubscribeUpdated();
    };
  }, [legacyState, publishUpdate]);

  if (!isHydrated) {
    return null;
  }

  return <>{children}</>;
}

type LegacyMigration = {
  key: string;
  value: unknown;
};

/**
 * Helper to migrate from LocalStorage to host global state.
 */
function computeLegacyMigrations(
  legacyState: PersistedAtomState,
  hostState: PersistedAtomState,
): Array<LegacyMigration> {
  const migrations: Array<LegacyMigration> = [];
  Object.entries(legacyState).forEach(([key, value]) => {
    const hostHasKey = Object.prototype.hasOwnProperty.call(hostState, key);
    if (!hostHasKey) {
      migrations.push({ key, value });
    }
  });
  return migrations;
}
