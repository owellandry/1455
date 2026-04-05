import type { ConversationId } from "protocol";
import { useMemo } from "react";

import { useModelSettings } from "@/hooks/use-model-settings";
import { useListModels } from "@/queries/model-queries";

import { useCollaborationMode } from "./use-collaboration-mode";

export function useModelInputModalities(
  conversationId: ConversationId | null,
): ReadonlyArray<string> | null {
  const { modelSettings } = useModelSettings(conversationId);
  const { activeMode: activeCollaborationMode } =
    useCollaborationMode(conversationId);
  const { data: listModelsData } = useListModels();
  const selectedModelSlug =
    activeCollaborationMode?.settings.model ?? modelSettings.model;

  return useMemo(() => {
    if (!selectedModelSlug) {
      return null;
    }

    const selectedModel = listModelsData?.modelsByType.models.find(
      (model) => model.model === selectedModelSlug,
    );
    return selectedModel?.inputModalities ?? null;
  }, [listModelsData, selectedModelSlug]);
}

export function useModelInputCapability(
  conversationId: ConversationId | null,
  modality: string,
): boolean {
  const inputModalities = useModelInputModalities(conversationId);
  return inputModalities?.includes(modality) ?? true;
}
