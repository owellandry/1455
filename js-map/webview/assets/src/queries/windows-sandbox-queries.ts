import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { z } from "zod";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useInvalidateQueriesAndBroadcast } from "@/queries/invalidate-queries-and-broadcast";
import { logger } from "@/utils/logger";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

const WindowsSandboxModeSchema = z.enum(["elevated", "unelevated"]);
const WindowsConfigSchema = z
  .object({
    sandbox: WindowsSandboxModeSchema.optional(),
  })
  .passthrough();

function getWindowsSandboxModeQueryKey(
  appServerManager: AppServerManager,
): Array<string> {
  return ["windows-sandbox", "mode", appServerManager.getHostId()];
}

export function useWindowsSandboxMode(
  appServerManager?: AppServerManager,
): UseQueryResult<AppServer.v2.WindowsSandboxSetupMode | null, Error> {
  const defaultAppServerManager = useDefaultAppServerManager();
  const activeAppServerManager = appServerManager ?? defaultAppServerManager;
  const queryKey = getWindowsSandboxModeQueryKey(activeAppServerManager);

  return useQuery({
    queryKey,
    queryFn: async (): Promise<AppServer.v2.WindowsSandboxSetupMode | null> => {
      try {
        const response = await activeAppServerManager.readConfig({
          includeLayers: false,
          cwd: null,
        });
        return getWindowsSandboxModeFromWindowsConfig(response.config.windows);
      } catch (error) {
        logger.error("Failed to load Windows sandbox mode", {
          safe: { error: String(error) },
          sensitive: {},
        });
        return null;
      }
    },
    staleTime: QUERY_STALE_TIME.ONE_MINUTE,
  });
}

export function useSetWindowsSandboxMode(
  appServerManager?: AppServerManager,
): UseMutationResult<
  AppServer.v2.ConfigWriteResponse,
  Error,
  AppServer.v2.WindowsSandboxSetupMode | null,
  { previousMode: AppServer.v2.WindowsSandboxSetupMode | null | undefined }
> {
  const defaultAppServerManager = useDefaultAppServerManager();
  const activeAppServerManager = appServerManager ?? defaultAppServerManager;
  const queryClient = useQueryClient();
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();
  const queryKey = getWindowsSandboxModeQueryKey(activeAppServerManager);

  return useMutation({
    mutationFn: (sandboxMode) =>
      activeAppServerManager.batchWriteConfigValue({
        edits: [
          {
            keyPath: "windows.sandbox",
            value: sandboxMode,
            mergeStrategy: sandboxMode == null ? "replace" : "upsert",
          },
        ],
        filePath: null,
        expectedVersion: null,
      }),
    onMutate: (sandboxMode) => {
      const previousMode =
        queryClient.getQueryData<AppServer.v2.WindowsSandboxSetupMode | null>(
          queryKey,
        );
      queryClient.setQueryData(queryKey, sandboxMode);
      return { previousMode };
    },
    onError: (error, _sandboxMode, context) => {
      logger.error("Failed to update Windows sandbox mode", {
        safe: { error: String(error) },
        sensitive: {},
      });
      if (context?.previousMode !== undefined) {
        queryClient.setQueryData(queryKey, context.previousMode);
      }
    },
    onSettled: async () => {
      await invalidateQueriesAndBroadcast(queryKey);
    },
  });
}

export function getWindowsSandboxModeFromWindowsConfig(
  windowsConfig: unknown,
): AppServer.v2.WindowsSandboxSetupMode | null {
  const parsed = WindowsConfigSchema.safeParse(windowsConfig);
  if (!parsed.success) {
    return null;
  }

  return parsed.data.sandbox ?? null;
}
