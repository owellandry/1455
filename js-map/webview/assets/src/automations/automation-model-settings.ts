import type * as AppServer from "app-server-types";
import {
  DEFAULT_AUTOMATION_MODEL,
  getAutomationFallbackModel,
  getAutomationModelDetails,
  getAutomationReasoningEffort,
} from "protocol";

import type { ModelsByType } from "@/types/models";
import { formatModelDisplayName } from "@/utils/format-model-display-name";

export function getDefaultAutomationModelSettings(
  modelsByType: ModelsByType | undefined,
): {
  model: string;
  reasoningEffort: AppServer.ReasoningEffort | null;
  isLoading: boolean;
} {
  const fallbackModel = getAutomationFallbackModel(modelsByType?.models ?? []);
  if (fallbackModel != null) {
    return {
      model: fallbackModel.model,
      reasoningEffort: getAutomationReasoningEffort({
        model: fallbackModel,
        reasoningEffort: null,
      }),
      isLoading: false,
    };
  }

  return {
    model: DEFAULT_AUTOMATION_MODEL,
    reasoningEffort: null,
    isLoading: true,
  };
}

export function getAutomationModelLabel({
  model,
  modelsByType,
}: {
  model: string | null;
  modelsByType: ModelsByType | undefined;
}): string {
  const selectedModel = getAutomationModelDetails(
    modelsByType?.models ?? [],
    model,
  );
  if (selectedModel?.displayName) {
    return formatModelDisplayName(selectedModel.displayName);
  }
  return model ?? "";
}
