import { useQueryClient } from "@tanstack/react-query";
import type {
  GlobalStateDefaults,
  GlobalStateKeyWithDefault,
  GlobalStateValueByKey,
} from "protocol";
import { getGlobalStateDefault } from "protocol";
import { useCallback, useMemo } from "react";

import {
  getQueryKey,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";

/**
 * Generic, type-safe wrapper around get-global-state and set-global-state.
 * Returns the current value, async setter, and loading state.
 */
// Type moved to protocol for cross-package reuse.

export function useGlobalState<K extends GlobalStateKeyWithDefault>(
  key: K,
): {
  data: GlobalStateDefaults[K];
  setData: (value: GlobalStateValueByKey[K]) => Promise<void>;
  isLoading: boolean;
};
export function useGlobalState<K extends keyof GlobalStateValueByKey>(
  key: K,
): {
  data: GlobalStateValueByKey[K] | undefined;
  setData: (value: GlobalStateValueByKey[K]) => Promise<void>;
  isLoading: boolean;
};
export function useGlobalState<K extends keyof GlobalStateValueByKey>(
  key: K,
): {
  data: GlobalStateValueByKey[K] | undefined;
  setData: (value: GlobalStateValueByKey[K]) => Promise<void>;
  isLoading: boolean;
} {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => getQueryKey("get-global-state", { key }),
    [key],
  );
  const defaultValue = getGlobalStateDefault(key);

  const { data, isLoading } = useFetchFromVSCode("get-global-state", {
    params: { key },
    select: (resp) => resp.value as GlobalStateValueByKey[K],
  });

  const { mutateAsync: setGlobalState } =
    useMutationFromVSCode("set-global-state");

  const setData = useCallback(
    async (value: GlobalStateValueByKey[K]): Promise<void> => {
      const previous = queryClient.getQueryData<{
        value: GlobalStateValueByKey[K];
      }>(queryKey);
      // Optimistically update cache to reflect user intent immediately
      queryClient.setQueryData(queryKey, { value });
      try {
        await setGlobalState({ key, value });
      } catch (err) {
        // Roll back optimistic update on failure
        queryClient.setQueryData(queryKey, previous);
        throw err;
      } finally {
        // Ensure eventual consistency with extension state
        await queryClient.invalidateQueries({ queryKey });
      }
    },
    [key, queryClient, queryKey, setGlobalState],
  );

  const resolvedData = (data ?? defaultValue) as GlobalStateValueByKey[K];
  return { data: resolvedData, setData, isLoading };
}
