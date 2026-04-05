import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { normalizeFeatureOverrideKey } from "protocol";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { listExperimentalFeatures } from "@/app-server/requests/experimental-features";
import { logger } from "@/utils/logger";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

const EXPERIMENTAL_FEATURE_LIST_LIMIT = 100;

export const EXPERIMENTAL_FEATURES_QUERY_KEY: Array<string> = [
  "experimental-features",
  "list",
];

export function useExperimentalFeatures(): UseQueryResult<
  Array<AppServer.v2.ExperimentalFeature>,
  Error
> {
  const appServerManager = useDefaultAppServerManager();

  return useQuery({
    queryKey: EXPERIMENTAL_FEATURES_QUERY_KEY,
    queryFn: async (): Promise<Array<AppServer.v2.ExperimentalFeature>> => {
      const readAllPages = async (
        cursor: string | null,
      ): Promise<Array<AppServer.v2.ExperimentalFeature>> => {
        const response = await listExperimentalFeatures(appServerManager, {
          cursor,
          limit: EXPERIMENTAL_FEATURE_LIST_LIMIT,
        });
        if (response.nextCursor == null) {
          return response.data;
        }
        return [...response.data, ...(await readAllPages(response.nextCursor))];
      };

      try {
        return await readAllPages(null);
      } catch (error) {
        logger.error("Failed to load experimental features", {
          safe: { error: String(error) },
          sensitive: {},
        });
        return [];
      }
    },
    staleTime: QUERY_STALE_TIME.ONE_MINUTE,
  });
}

export function useSetExperimentalFeatureEnabled(): UseMutationResult<
  AppServer.v2.ConfigWriteResponse,
  Error,
  { featureName: string; enabled: boolean },
  { previousFeatures: Array<AppServer.v2.ExperimentalFeature> | undefined }
> {
  const appServerManager = useDefaultAppServerManager();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      featureName,
      enabled,
    }): Promise<AppServer.v2.ConfigWriteResponse> =>
      appServerManager.batchWriteConfigValue({
        edits: [
          {
            keyPath: normalizeFeatureOverrideKey(featureName),
            value: enabled,
            mergeStrategy: "upsert",
          },
        ],
        filePath: null,
        expectedVersion: null,
      }),
    onMutate: ({ featureName, enabled }) => {
      const previousFeatures = queryClient.getQueryData<
        Array<AppServer.v2.ExperimentalFeature>
      >(EXPERIMENTAL_FEATURES_QUERY_KEY);
      if (previousFeatures) {
        queryClient.setQueryData(
          EXPERIMENTAL_FEATURES_QUERY_KEY,
          previousFeatures.map((feature) => {
            if (feature.name !== featureName) {
              return feature;
            }
            return {
              ...feature,
              enabled,
            };
          }),
        );
      }
      return { previousFeatures };
    },
    onError: (error, _variables, context) => {
      logger.error("Failed to update experimental feature", {
        safe: { error: String(error) },
        sensitive: {},
      });
      if (context?.previousFeatures) {
        queryClient.setQueryData(
          EXPERIMENTAL_FEATURES_QUERY_KEY,
          context.previousFeatures,
        );
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: EXPERIMENTAL_FEATURES_QUERY_KEY,
      });
    },
  });
}

export function useSetPluginsExperimentalFeatureEnabled(): UseMutationResult<
  AppServer.v2.ConfigWriteResponse,
  Error,
  { enabled: boolean },
  { previousFeatures: Array<AppServer.v2.ExperimentalFeature> | undefined }
> {
  const appServerManager = useDefaultAppServerManager();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ enabled }): Promise<AppServer.v2.ConfigWriteResponse> =>
      appServerManager.batchWriteConfigValue({
        edits: [
          {
            keyPath: normalizeFeatureOverrideKey("plugins"),
            value: enabled,
            mergeStrategy: "upsert",
          },
        ],
        filePath: null,
        expectedVersion: null,
      }),
    onMutate: ({ enabled }) => {
      const previousFeatures = queryClient.getQueryData<
        Array<AppServer.v2.ExperimentalFeature>
      >(EXPERIMENTAL_FEATURES_QUERY_KEY);
      if (previousFeatures) {
        queryClient.setQueryData(
          EXPERIMENTAL_FEATURES_QUERY_KEY,
          previousFeatures.map((feature) => {
            if (feature.name === "plugins") {
              return {
                ...feature,
                enabled,
              };
            }
            return feature;
          }),
        );
      }
      return { previousFeatures };
    },
    onError: (error, _variables, context) => {
      logger.error("Failed to update plugins experimental feature", {
        safe: { error: String(error) },
        sensitive: {},
      });
      if (context?.previousFeatures) {
        queryClient.setQueryData(
          EXPERIMENTAL_FEATURES_QUERY_KEY,
          context.previousFeatures,
        );
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: EXPERIMENTAL_FEATURES_QUERY_KEY,
      });
    },
  });
}
