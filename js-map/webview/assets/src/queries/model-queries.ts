import type { QueryStatus, UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";

import { useAppServerManagerForHost } from "@/app-server/app-server-manager-hooks";
import { useAuthForHost } from "@/auth/use-auth";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import type { ListModelsQueryResult, ModelsByType } from "@/types/models";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

import { useModelAvailabilityConfig } from "./use-model-availability-config";

const DEFAULT_MODEL_LIST_LIMIT = 100;
const MODELS_LIST_QUERY_KEY = ["models", "list"] as const;

export function getListModelsQueryKey(
  hostId: string,
  authMethod: string | null,
  limit: number = DEFAULT_MODEL_LIST_LIMIT,
): Array<string | number> {
  return [...MODELS_LIST_QUERY_KEY, hostId, authMethod ?? "no-auth", limit];
}

export function useListModels(options?: {
  hostId?: string;
  limit?: number;
}): UseQueryResult<ListModelsQueryResult, Error> {
  const hostId = options?.hostId ?? DEFAULT_HOST_ID;
  const limit = options?.limit ?? DEFAULT_MODEL_LIST_LIMIT;
  const appServerManager = useAppServerManagerForHost(hostId);
  const auth = useAuthForHost(hostId);
  const authMethod = auth?.authMethod ?? null;
  const isAuthLoading = auth?.isLoading ?? false;
  // https://console.statsig.com/50aWbk2p4R76rNX9lN5VUw/dynamic_configs/codex-app-vscode-model-availability
  const modelAvailabilityConfig = useModelAvailabilityConfig();

  return useQuery<
    AppServer.v2.ModelListResponse,
    Error,
    ListModelsQueryResult,
    Array<string | number>
  >({
    queryKey: getListModelsQueryKey(hostId, authMethod, limit),
    enabled: appServerManager != null && !isAuthLoading,
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    queryFn: (): Promise<AppServer.v2.ModelListResponse> => {
      if (appServerManager == null) {
        throw new Error(`Missing AppServerManager for host ${hostId}`);
      }

      return appServerManager.listModels({
        includeHidden: true,
        cursor: null,
        limit,
      });
    },
    select: ({ data: models }): ListModelsQueryResult => {
      const modelsByType: ModelsByType = {
        models: [],
      };

      let defaultModel: AppServer.v2.Model | null = null;
      models.forEach((model) => {
        // Model availability is driven by the codex-app-vscode-model-availability dynamic config,
        // which emits based on auth method. Future gating for API and Copilot rollout will come
        // from dynamic config updates.
        //
        // If hidden models are disabled, we only need to filter out hidden entries. This covers
        // ChatGPT login and internal model testing.
        const isModelAvailable = !modelAvailabilityConfig.useHiddenModels
          ? !model.hidden
          : modelAvailabilityConfig.availableModels.has(model.model);

        if (isModelAvailable) {
          const supportedReasoningEffort =
            authMethod === "copilot"
              ? [
                  model.supportedReasoningEfforts.find(
                    (r) => r.reasoningEffort === "medium",
                  ) ?? {
                    reasoningEffort: "medium",
                    description: "medium effort",
                  },
                ]
              : [...model.supportedReasoningEfforts];

          modelsByType.models.push({
            ...model,
            supportedReasoningEfforts: supportedReasoningEffort,
          });

          defaultModel = model.isDefault ? model : defaultModel;
        }
      });

      // model/list should always return a default model, but for API key and Copilot users the
      // server default might not be available yet. In that case, fall back to the dynamic-config
      // default model if it survived availability filtering.
      if (defaultModel == null) {
        defaultModel =
          modelsByType.models.find(
            (m) => m.model === modelAvailabilityConfig.defaultModel,
          ) ?? null;
      }

      return { modelsByType, defaultModel };
    },
  });
}

export function hasListModelsLoaded(status: QueryStatus): boolean {
  return status !== "pending";
}
