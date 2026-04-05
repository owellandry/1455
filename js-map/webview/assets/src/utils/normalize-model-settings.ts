import type * as AppServer from "app-server-types";

import {
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
} from "@/constants/models-and-reasoning-efforts";
import type {
  ListModelsQueryResult,
  ModelsByType,
  ModelSettings,
  ReasoningEffortKey,
} from "@/types/models";

/**
 * Clamp a provided reasoning effort to a valid key for the model, falling back to the default effort.
 */
export function normalizeReasoningEffort(
  reasoningEffort: ModelSettings["reasoningEffort"],
  modelReasoingEfforts: ReadonlyArray<ReasoningEffortKey>,
): ReasoningEffortKey {
  const isReasoningEffortKey =
    reasoningEffort === "minimal" ||
    reasoningEffort === "low" ||
    reasoningEffort === "medium" ||
    reasoningEffort === "high" ||
    reasoningEffort === "xhigh";
  return isReasoningEffortKey
    ? modelReasoingEfforts.includes(reasoningEffort)
      ? reasoningEffort
      : DEFAULT_EFFORT
    : DEFAULT_EFFORT;
}

export function getModelFromModelsByType(
  model: string,
  modelsByType: ModelsByType | undefined,
): AppServer.v2.Model | undefined {
  return modelsByType?.models.find((m) => m.model === model);
}

/**
 * Validates a user’s saved model/reasoning effort pair against the models list,
 * falling back to the default model and reasoning effort when the saved choice is missing or invalid.
 */
export function getValidModelSettings({
  userSavedModelString,
  userSavedReasoningEffort,
  listModelsData,
}: {
  userSavedModelString: string | null;
  userSavedReasoningEffort: ReasoningEffortKey | null;
  listModelsData: ListModelsQueryResult | undefined;
}): ModelSettings {
  const validModel = userSavedModelString
    ? getModelFromModelsByType(
        userSavedModelString,
        listModelsData?.modelsByType,
      )
    : (listModelsData?.defaultModel ??
      getModelFromModelsByType(DEFAULT_MODEL, listModelsData?.modelsByType));
  const availableReasoningEffort = validModel?.supportedReasoningEfforts?.map(
    (effort): AppServer.ReasoningEffort => effort.reasoningEffort,
  );
  const validReasoningLevel =
    userSavedReasoningEffort &&
    availableReasoningEffort &&
    availableReasoningEffort.includes(userSavedReasoningEffort)
      ? userSavedReasoningEffort
      : validModel?.defaultReasoningEffort;
  const modelString = validModel
    ? validModel.model
    : (userSavedModelString ?? DEFAULT_MODEL);
  const reasoningEffort =
    validReasoningLevel ??
    userSavedReasoningEffort ??
    listModelsData?.defaultModel?.defaultReasoningEffort ??
    DEFAULT_EFFORT;

  return {
    model: modelString,
    reasoningEffort,
    isLoading: false,
  };
}
