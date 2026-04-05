import { useQueryClient } from "@tanstack/react-query";
import type { ConfigValueByKey } from "protocol";
import { useCallback, useMemo } from "react";

import { useInvalidateQueriesAndBroadcast } from "@/queries/invalidate-queries-and-broadcast";
import {
  getQueryKey,
  useFetchFromVSCode,
  useMutationFromVSCode,
} from "@/vscode-api";

type ConfigurationQueryData<T> = {
  value: T;
};

export function useWriteConfiguration<K extends keyof ConfigValueByKey>(
  key: K,
): {
  getCachedData: () => ConfigurationQueryData<ConfigValueByKey[K]> | undefined;
  invalidate: () => Promise<void>;
  setCachedData: (value: ConfigValueByKey[K]) => void;
  writeData: (value: ConfigValueByKey[K]) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => getQueryKey("get-configuration", { key }),
    [key],
  );
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();
  const { mutateAsync: setConfiguration } =
    useMutationFromVSCode("set-configuration");

  const getCachedData = useCallback(() => {
    return queryClient.getQueryData<
      ConfigurationQueryData<ConfigValueByKey[K]>
    >(queryKey);
  }, [queryClient, queryKey]);

  const invalidate = useCallback(async (): Promise<void> => {
    await invalidateQueriesAndBroadcast(queryKey);
  }, [invalidateQueriesAndBroadcast, queryKey]);

  const setCachedData = useCallback(
    (value: ConfigValueByKey[K]): void => {
      queryClient.setQueryData(queryKey, { value });
    },
    [queryClient, queryKey],
  );

  const writeData = useCallback(
    async (value: ConfigValueByKey[K]): Promise<void> => {
      await setConfiguration({ key, value });
    },
    [key, setConfiguration],
  );

  return {
    getCachedData,
    invalidate,
    setCachedData,
    writeData,
  };
}

export function useConfiguration<K extends keyof ConfigValueByKey>(
  key: K,
  options?: {
    enabled?: boolean;
  },
): {
  data: ConfigValueByKey[K] | undefined;
  setData: (value: ConfigValueByKey[K]) => Promise<void>;
  isLoading: boolean;
} {
  const { enabled } = options ?? {};
  const { data, isLoading } = useFetchFromVSCode("get-configuration", {
    params: { key },
    select: (resp) => resp.value as ConfigValueByKey[K],
    queryConfig: {
      enabled,
    },
  });
  const { getCachedData, invalidate, setCachedData, writeData } =
    useWriteConfiguration(key);

  const setData = useCallback(
    async (value: ConfigValueByKey[K]): Promise<void> => {
      const previous = getCachedData();
      setCachedData(value);

      try {
        await writeData(value);
      } catch (err) {
        if (previous != null) {
          setCachedData(previous.value);
        }
        throw err;
      } finally {
        await invalidate();
      }
    },
    [getCachedData, invalidate, setCachedData, writeData],
  );

  return { data, setData, isLoading };
}
