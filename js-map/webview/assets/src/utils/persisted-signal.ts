import { family, signal, type SignalHandle } from "maitai";

import { AppScope } from "@/scopes/app-scope";

/**
 * Creates an app-scoped signal whose value is synchronized through the
 * persisted-signals bridge using the provided storage key.
 */
export function persistedSignal<T>(
  key: string,
  initialValue: T,
): SignalHandle<T, typeof AppScope> {
  registerPersistedSignal({
    initialValue,
    key,
  });

  return {
    cache: "signal",
    resolve(scopeNode, chain) {
      const state = persistedStateByKey.resolve(scopeNode, chain, key);
      return state.value$.atom;
    },
    scope: AppScope,
  } as SignalHandle<T, typeof AppScope>;
}

export type PersistedSignalRegistration = {
  initialValue: unknown;
  key: string;
};

const declaredPersistedSignalByKey = new Map<
  string,
  PersistedSignalRegistration
>();
const declaredPersistedSignalListeners = new Set<
  (registrations: Array<PersistedSignalRegistration>) => void
>();

export const persistedSignalRegistrations$ = signal(
  AppScope,
  [] as Array<PersistedSignalRegistration>,
);

export const persistedStateByKey = family(
  AppScope,
  (key: string, { signal }) => {
    const value$ = signal<unknown>(undefined);

    return {
      key,
      value$,
    };
  },
);
export function subscribeToDeclaredPersistedSignals(
  listener: (registrations: Array<PersistedSignalRegistration>) => void,
): () => void {
  declaredPersistedSignalListeners.add(listener);
  listener(Array.from(declaredPersistedSignalByKey.values()));

  return (): void => {
    declaredPersistedSignalListeners.delete(listener);
  };
}

function registerPersistedSignal(
  registration: PersistedSignalRegistration,
): void {
  if (declaredPersistedSignalByKey.has(registration.key)) {
    return;
  }

  declaredPersistedSignalByKey.set(registration.key, registration);
  const registrations = Array.from(declaredPersistedSignalByKey.values());
  declaredPersistedSignalListeners.forEach((listener) =>
    listener(registrations),
  );
}
