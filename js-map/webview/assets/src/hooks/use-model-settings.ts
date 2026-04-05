import { useQuery } from "@tanstack/react-query";
import type { ReasoningEffort } from "app-server-types";
import type { ConversationId } from "protocol";
import { useCallback, useMemo } from "react";

import {
  useAppServerManagerForHost,
  useDefaultAppServerManager,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import { setModelAndReasoningForNextTurn } from "@/app-server/requests/set-model-and-reasoning-for-next-turn";
import { useAuth } from "@/auth/use-auth";
import {
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
} from "@/constants/models-and-reasoning-efforts";
import { useGlobalState } from "@/hooks/use-global-state";
import { useInvalidateQueriesAndBroadcast } from "@/queries/invalidate-queries-and-broadcast";
import { useListModels } from "@/queries/model-queries";
import { useModelAvailabilityConfig } from "@/queries/use-model-availability-config";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import type { ModelSettings } from "@/types/models";
import { logger } from "@/utils/logger";
import { getValidModelSettings } from "@/utils/normalize-model-settings";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useFetchFromVSCode } from "@/vscode-api";

export type ModelSettingsChangeHandler = {
  modelSettings: ModelSettings;
  setModelAndReasoningEffort: (
    model: string,
    reasoningEffort: ReasoningEffort | null,
  ) => Promise<void>;
};

const DEFAULT_MODEL_SETTINGS_QUERY_KEY = [
  "models",
  "default-settings",
] as const;

type SavedModelSettings = {
  model: string | null;
  reasoningEffort: ModelSettings["reasoningEffort"];
};

function getDefaultModelSettingsQueryKey(
  hostId: string,
  cwd: string | null,
): Array<string | null> {
  return [...DEFAULT_MODEL_SETTINGS_QUERY_KEY, hostId, cwd];
}

function useCopilotAPIModelSettings(): ModelSettings {
  // modelAvailabilityConfig is dynamic config based on auth method and we are safe to directly consume
  // the default value here.
  const modelAvailabilityConfig = useModelAvailabilityConfig();
  const { data, isLoading } = useGlobalState("copilot-default-model");
  return {
    model: data ?? modelAvailabilityConfig.defaultModel,
    reasoningEffort: "medium",
    isLoading,
  };
}

const DEFAULT_MODEL_SETTINGS = {
  model: DEFAULT_MODEL,
  reasoningEffort: DEFAULT_EFFORT,
};

function useDefaultModelSettings({
  hostId,
  cwd,
}: {
  hostId: string;
  cwd: string | null;
}): ModelSettings {
  const appServerManager = useAppServerManagerForHost(hostId);
  const { data: listModelsData } = useListModels({ hostId });
  const { data: userSavedModelSettings } = useQuery<
    SavedModelSettings,
    Error,
    SavedModelSettings,
    Array<string | null>
  >({
    queryKey: getDefaultModelSettingsQueryKey(hostId, cwd),
    enabled: appServerManager != null,
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    queryFn: async (): Promise<SavedModelSettings> => {
      if (appServerManager == null) {
        return DEFAULT_MODEL_SETTINGS;
      }

      try {
        const config = await appServerManager.getUserSavedConfiguration(
          cwd ?? undefined,
        );
        return {
          model: config.model,
          reasoningEffort: config.model_reasoning_effort,
        };
      } catch (error) {
        logger.error("Failed to load default model settings", {
          safe: { cwd, hostId },
          sensitive: { error },
        });
        return DEFAULT_MODEL_SETTINGS;
      }
    },
  });

  if (userSavedModelSettings == null) {
    return {
      ...DEFAULT_MODEL_SETTINGS,
      isLoading: true,
    };
  }

  return getValidModelSettings({
    userSavedModelString: userSavedModelSettings.model,
    userSavedReasoningEffort: userSavedModelSettings.reasoningEffort,
    listModelsData,
  });
}

function useRefreshDefaultModelSettings({
  hostId,
  cwd,
}: {
  hostId: string;
  cwd: string | null;
}): () => Promise<void> {
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();

  return async (): Promise<void> => {
    await invalidateQueriesAndBroadcast(
      getDefaultModelSettingsQueryKey(hostId, cwd),
    );
  };
}

/**
 * Should be consistent with whatever the current conversation is using.
 * Though if we can't find it, fall back to the default settings.
 * If conversationId is null, use the local default settings.
 */
export function useModelSettings(
  conversationId: ConversationId | null = null,
): ModelSettingsChangeHandler {
  const { authMethod } = useAuth();
  const appServerManager = useDefaultAppServerManager();
  const { data: workspaceRoot } = useFetchFromVSCode("active-workspace-roots", {
    select: (data): string | null => data.roots?.[0] ?? null,
  });
  const defaultModelSettings = useDefaultModelSettings({
    hostId: DEFAULT_HOST_ID,
    cwd: workspaceRoot ?? null,
  });
  const defaultModelSettingsForCopilot = useCopilotAPIModelSettings();
  const hasConversation = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation != null,
  );
  const conversationModel = useLocalConversationSelector(
    conversationId,
    (conversation) =>
      conversation?.latestCollaborationMode?.settings?.model ?? null,
  );
  const normalizedConversationModel =
    conversationModel != null && conversationModel.trim().length > 0
      ? conversationModel
      : null;
  const conversationReasoningEffort = useLocalConversationSelector(
    conversationId,
    (conversation) =>
      conversation?.latestCollaborationMode?.settings?.reasoning_effort ?? null,
  );
  const isUsingCopilotApi = authMethod === "copilot";

  const changeSettingsForNextTurn = useCallback(
    async (model: string, reasoningEffort: ReasoningEffort | null) => {
      if (conversationId == null) {
        return;
      }

      await setModelAndReasoningForNextTurn(
        appServerManager,
        conversationId,
        model,
        reasoningEffort,
      );
    },
    [conversationId, appServerManager],
  );

  const { model, reasoningEffort, isLoading } = hasConversation
    ? {
        model: normalizedConversationModel ?? defaultModelSettings.model,
        reasoningEffort: conversationReasoningEffort,
        isLoading: false,
      }
    : isUsingCopilotApi
      ? defaultModelSettingsForCopilot
      : defaultModelSettings;

  const { setData: setCopilotDefaultModel } = useGlobalState(
    "copilot-default-model",
  );

  const refreshDefaultModelSettings = useRefreshDefaultModelSettings({
    hostId: DEFAULT_HOST_ID,
    cwd: workspaceRoot ?? null,
  });
  const setModelAndReasoningEffort = useCallback(
    async (newModel: string, newEffort: ReasoningEffort | null) => {
      await changeSettingsForNextTurn(newModel, newEffort);

      if (isUsingCopilotApi) {
        void setCopilotDefaultModel(newModel);
        return;
      }

      // First, notify the backend to update the user's default model settings.
      try {
        await appServerManager.setDefaultModelConfig(newModel, newEffort);
      } catch (err) {
        logger.error(`Failed to set default model and reasoning effort`, {
          safe: {},
          sensitive: {
            error: err,
          },
        });
        return;
      }

      // Now that config.toml should have been updated, refresh the query
      // that reads from it.
      await refreshDefaultModelSettings();
    },
    [
      isUsingCopilotApi,
      setCopilotDefaultModel,
      changeSettingsForNextTurn,
      refreshDefaultModelSettings,
      appServerManager,
    ],
  );

  // Leverage useMemo to ensure we return a stable reference.
  const modelSettings = useMemo(
    () => ({
      model,
      reasoningEffort,
      isLoading,
    }),
    [model, reasoningEffort, isLoading],
  );

  return {
    setModelAndReasoningEffort,
    modelSettings,
  };
}
