import type { SyncStorage } from "jotai/vanilla/utils/atomWithStorage";

export const PERSISTED_ATOM_STORAGE_PREFIX = "codex:persisted-atom:";

export type PersistedAtomState = Record<string, unknown>;

type PublishUpdate = (key: string, value: unknown) => void;

type Subscriber = {
  callback: (value: unknown) => void;
  fallback: unknown;
};

const state = new Map<string, unknown>();
const subscribers = new Map<string, Set<Subscriber>>();

let publishUpdate: PublishUpdate | null = null;

function ensureInitialized(): PublishUpdate {
  const currentPublishUpdate = publishUpdate;

  if (currentPublishUpdate) {
    return currentPublishUpdate;
  } else if (__TEST__ || __STORYBOOK__) {
    initializePersistedAtomStore({}, () => {});
    return () => {};
  }
  throw new Error("Persisted atom store accessed before initialization");
}

function notifySubscribers(key: string): void {
  const listeners = subscribers.get(key);
  if (!listeners) {
    return;
  }

  const hasValue = state.has(key);
  const nextValue = hasValue ? state.get(key) : undefined;
  listeners.forEach((subscriber) => {
    if (hasValue) {
      subscriber.callback(nextValue);
      return;
    }
    subscriber.callback(subscriber.fallback);
  });
}

function setValue(key: string, value: unknown, shouldPublish: boolean): void {
  const publishUpdate = ensureInitialized();
  if (value === undefined) {
    state.delete(key);
  } else {
    state.set(key, value);
  }

  if (shouldPublish) {
    publishUpdate(key, value);
  }

  notifySubscribers(key);
}

export function initializePersistedAtomStore(
  initialState: PersistedAtomState,
  onPublish: PublishUpdate,
): void {
  state.clear();
  Object.entries(initialState).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    state.set(key, value);
  });
  publishUpdate = onPublish;
}

export function getPersistedAtomStorage<T>(): SyncStorage<T> {
  return {
    getItem: (key: string, fallback: T): T => {
      ensureInitialized();
      if (!state.has(key)) {
        return fallback;
      }
      return state.get(key) as T;
    },
    setItem: (key: string, newValue: T): void => {
      ensureInitialized();
      if (newValue === undefined) {
        setValue(key, undefined, true);
        return;
      }
      setValue(key, newValue, true);
    },
    removeItem: (key: string): void => {
      ensureInitialized();
      setValue(key, undefined, true);
    },
    subscribe: (key: string, callback: (value: T) => void, initialValue: T) => {
      ensureInitialized();
      const listener: Subscriber = {
        callback: callback as (value: unknown) => void,
        fallback: initialValue,
      };
      const existing = subscribers.get(key) ?? new Set<Subscriber>();
      existing.add(listener);
      subscribers.set(key, existing);
      return (): void => {
        const current = subscribers.get(key);
        if (!current) {
          return;
        }
        current.delete(listener);
        if (current.size === 0) {
          subscribers.delete(key);
        }
      };
    },
  };
}

export function getPersistedValue<T>(key: string, fallback: T): T {
  return getPersistedAtomStorage<T>().getItem(key, fallback);
}

export function setPersistedValue<T>(key: string, value: T): void {
  getPersistedAtomStorage<T>().setItem(key, value);
}

export function subscribeToPersistedValue<T>(
  key: string,
  fallback: T,
  callback: (value: T) => void,
): () => void {
  const subscribe = getPersistedAtomStorage<T>().subscribe;
  if (subscribe == null) {
    return (): void => {};
  }

  const unsubscribe = subscribe(key, callback, fallback);
  return (): void => {
    unsubscribe?.();
  };
}

export function applyExternalPersistedAtomUpdate(
  key: string,
  value: unknown,
): void {
  ensureInitialized();
  setValue(key, value, false);
}

export function resetPersistedAtomStore(): void {
  ensureInitialized();
  const keys = Array.from(state.keys());
  state.clear();
  const publisher = publishUpdate;
  if (publisher) {
    keys.forEach((key) => publisher(key, undefined));
  }
  keys.forEach((key) => notifySubscribers(key));
  clearLegacyPersistedAtomState();
}

export function readLegacyPersistedAtomState(): PersistedAtomState {
  if (typeof window === "undefined" || !window.localStorage) {
    return {};
  }

  const result: PersistedAtomState = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(PERSISTED_ATOM_STORAGE_PREFIX)) {
      continue;
    }
    const value = window.localStorage.getItem(key);
    if (value == null) {
      continue;
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      result[key.replace(PERSISTED_ATOM_STORAGE_PREFIX, "")] = parsed;
    } catch {
      window.localStorage.removeItem(key);
    }
  }
  return result;
}

export function clearLegacyPersistedAtomState(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  const keysToRemove: Array<string> = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(PERSISTED_ATOM_STORAGE_PREFIX)) {
      continue;
    }
    keysToRemove.push(key);
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}
