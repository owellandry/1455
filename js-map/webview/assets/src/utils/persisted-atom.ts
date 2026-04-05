import type { WritableAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import {
  getPersistedAtomStorage,
  resetPersistedAtomStore,
} from "./persisted-atom-store";

export function resetPersistedAtoms(): void {
  resetPersistedAtomStore();
}

export function persistedAtom<T>(
  key: string,
  initialValue: T,
): WritableAtom<T, [T], void> {
  const storage = getPersistedAtomStorage<T>();
  return atomWithStorage<T>(key, initialValue, storage);
}
