import type * as AppServer from "app-server-types";

import { ALL_REASONING_EFFORTS } from "@/constants/models-and-reasoning-efforts";
import type { ModelsByType, ReasoningEffortKey } from "@/types/models";
import { normalizeReasoningEffort } from "@/utils/normalize-model-settings";

export function getAvailableReasoningEffortOptions(
  modelsByType: ModelsByType | undefined,
  model: string,
): Array<AppServer.v2.ReasoningEffortOption> {
  const selectedModelDetail = modelsByType?.models.find(
    (entry) => entry.model === model,
  );

  if (selectedModelDetail == null) {
    return ALL_REASONING_EFFORTS.map((reasoningEffort) => ({
      description: "",
      reasoningEffort,
    }));
  }

  return selectedModelDetail.supportedReasoningEfforts;
}

export function getSelectedReasoningEffort(
  reasoningEffort: AppServer.ReasoningEffort | null,
  options: Array<AppServer.v2.ReasoningEffortOption>,
): ReasoningEffortKey {
  return normalizeReasoningEffort(
    reasoningEffort,
    options.map((option) => option.reasoningEffort),
  );
}
