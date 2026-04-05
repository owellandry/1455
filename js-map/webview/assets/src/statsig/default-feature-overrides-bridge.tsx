import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAppServerRegistry } from "@/app-server/app-server-manager-hooks";
import { setExperimentalFeatureEnablement } from "@/app-server/requests/experimental-features";
import { EXPERIMENTAL_FEATURES_QUERY_KEY } from "@/queries/experimental-features-queries";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { logger } from "@/utils/logger";

const APP_SERVER_EXPERIMENTAL_FEATURE_ENABLEMENT_KEYS = [
  "apps",
  "plugins",
  "tool_call_mcp_elicitation",
  "tool_search",
  "tool_suggest",
] as const;

export function UseDefaultFeatureOverrides(): null {
  const [overrides] = useSharedObject("statsig_default_enable_features");
  const appServerRegistry = useAppServerRegistry();
  const queryClient = useQueryClient();

  useEffect(() => {
    const syncDefaultFeatureOverrides = (): void => {
      const managers = appServerRegistry.getAll();
      const defaultManager = appServerRegistry.getDefault();
      for (const manager of managers) {
        manager.setDefaultFeatureOverrides(overrides ?? null);
      }

      if (overrides == null) {
        return;
      }

      const enablement = getAppServerExperimentalFeatureEnablement(overrides);
      const managersToSync = managers.filter((manager) => {
        return (
          manager === defaultManager ||
          manager.getConnectionState() === "connected"
        );
      });
      void Promise.all(
        managersToSync.map((manager) => {
          return setExperimentalFeatureEnablement(manager, {
            enablement,
          }).catch((error: unknown) => {
            logger.error("Failed to sync experimental feature enablement", {
              safe: {
                hostId: manager.getHostId(),
              },
              sensitive: {
                error,
              },
            });
          });
        }),
      ).then(() => {
        void queryClient.invalidateQueries({
          queryKey: EXPERIMENTAL_FEATURES_QUERY_KEY,
        });
      });
    };

    syncDefaultFeatureOverrides();
    return appServerRegistry.addRegistryCallback(syncDefaultFeatureOverrides);
  }, [appServerRegistry, overrides, queryClient]);

  return null;
}

function getAppServerExperimentalFeatureEnablement(
  overrides: Record<string, boolean>,
): Record<string, boolean> {
  const enablement: Record<string, boolean> = {};
  for (const key of APP_SERVER_EXPERIMENTAL_FEATURE_ENABLEMENT_KEYS) {
    const value = overrides[key];
    if (value != null) {
      enablement[key] = value;
    }
  }
  return enablement;
}
