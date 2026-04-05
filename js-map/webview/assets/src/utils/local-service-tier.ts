import type { ServiceTier } from "app-server-types";
import { useAtomValue, useSetAtom } from "jotai";
import { DEFAULT_SERVICE_TIER_PERSISTED_ATOM_KEY } from "protocol";

import { persistedAtom } from "@/utils/persisted-atom";
import { getPersistedAtomStorage } from "@/utils/persisted-atom-store";
import { coerceServiceTier } from "@/utils/service-tier";

export const aDefaultServiceTier = persistedAtom<ServiceTier | null>(
  DEFAULT_SERVICE_TIER_PERSISTED_ATOM_KEY,
  null,
);

export function getDefaultServiceTierValue(): ServiceTier | null {
  const storage = getPersistedAtomStorage<ServiceTier | null>();
  return coerceServiceTier(
    storage.getItem(DEFAULT_SERVICE_TIER_PERSISTED_ATOM_KEY, null),
  );
}

export function useDefaultServiceTier(): {
  serviceTier: ServiceTier | null;
  isLoading: boolean;
} {
  return {
    serviceTier: coerceServiceTier(useAtomValue(aDefaultServiceTier)),
    isLoading: false,
  };
}

export function useSetDefaultServiceTier(): (
  serviceTier: ServiceTier | null,
) => void {
  const setDefaultServiceTier = useSetAtom(aDefaultServiceTier);
  return (serviceTier: ServiceTier | null) => {
    setDefaultServiceTier(coerceServiceTier(serviceTier));
  };
}
