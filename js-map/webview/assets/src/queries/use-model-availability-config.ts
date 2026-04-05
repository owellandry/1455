import { z } from "zod";

import { DEFAULT_MODEL } from "@/constants/models-and-reasoning-efforts";
import { useDynamicConfig } from "@/statsig/statsig";

type ModelAvailabilityConfig = {
  availableModels: Set<string>;
  useHiddenModels: boolean;
  defaultModel: string;
};

const DEFAULT_AVAILABLE_MODELS: Array<string> = [];

const DEFAULT_MODEL_AVAILABILITY_CONFIG: ModelAvailabilityConfig = {
  availableModels: new Set(DEFAULT_AVAILABLE_MODELS),
  useHiddenModels: false,
  defaultModel: DEFAULT_MODEL,
};

/**
 * Unpacks the value from
 * https://console.statsig.com/50aWbk2p4R76rNX9lN5VUw/dynamic_configs/codex-app-vscode-model-availability,
 * which controls model availability per auth method.
 */
export function useModelAvailabilityConfig(): ModelAvailabilityConfig {
  const { value } = useDynamicConfig(
    __statsigName("codex-app-vscode-model-availability"),
  );

  return parseModelAvailabilityConfig(value);
}

function parseModelAvailabilityConfig(
  value: Record<string, unknown>,
): ModelAvailabilityConfig {
  const availableModels = z.array(z.string()).safeParse(value.available_models);
  const useHiddenModels = z.boolean().safeParse(value.use_hidden_models);
  const defaultModel = z.string().safeParse(value.default_model);

  return {
    availableModels: new Set(
      availableModels.success ? availableModels.data : DEFAULT_AVAILABLE_MODELS,
    ),
    useHiddenModels: useHiddenModels.success
      ? useHiddenModels.data
      : DEFAULT_MODEL_AVAILABILITY_CONFIG.useHiddenModels,
    defaultModel: defaultModel.success
      ? defaultModel.data
      : DEFAULT_MODEL_AVAILABILITY_CONFIG.defaultModel,
  };
}
