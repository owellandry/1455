import { useScope } from "maitai";
import type { ConversationId } from "protocol";
import type React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useLocalConversationSelector } from "@/app-server/app-server-manager-hooks";
import { useAuth } from "@/auth/use-auth";
import { toast$ } from "@/components/toaster/toast-signal";
import { useModelSettings } from "@/hooks/use-model-settings";
import { useServiceTierSettings } from "@/hooks/use-service-tier-settings";
import CheckMdIcon from "@/icons/check-md.svg";
import CubeIcon from "@/icons/cube.svg";
import LightningBoltIcon from "@/icons/lightning-bolt.svg";
import { productEventLogger$ } from "@/product-event-signal";
import { hasListModelsLoaded, useListModels } from "@/queries/model-queries";
import { AppScope } from "@/scopes/app-scope";
import type { ModelsByType } from "@/types/models";
import { formatModelDisplayName } from "@/utils/format-model-display-name";
import { getModelFromModelsByType } from "@/utils/normalize-model-settings";
import { coerceServiceTier } from "@/utils/service-tier";

import { useProvideSlashCommand } from "./slash-command";
import { SlashCommandItem } from "./slash-command-item";

export function ModelSlashCommand({
  conversationId,
}: {
  conversationId: ConversationId | null;
}): null {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const { requiresAuth } = useAuth();
  const { data: listModelsData, status: listModelsStatus } = useListModels();
  const hasLoadedModels = hasListModelsLoaded(listModelsStatus);
  const models = listModelsData?.modelsByType.models ?? [];
  const { modelSettings, setModelAndReasoningEffort } =
    useModelSettings(conversationId);
  const { serviceTierSettings } = useServiceTierSettings(conversationId);
  const shouldWarnAboutModelChanges = useLocalConversationSelector(
    conversationId,
    (conversation) => (conversation?.turns.length ?? 0) > 0,
  );
  const isFastModeOn =
    coerceServiceTier(serviceTierSettings.serviceTier) === "fast";
  const currentModelTitle = getModelTitle(
    modelSettings.model,
    listModelsData?.modelsByType,
  );

  function Content({ onClose }: { onClose: () => void }): React.ReactElement {
    return (
      <>
        {models.map(
          ({
            model,
            description,
            supportedReasoningEfforts,
            defaultReasoningEffort,
          }) => {
            const modelTitle = getModelTitle(
              model,
              listModelsData?.modelsByType,
            );
            return (
              <SlashCommandItem
                key={model}
                value={modelTitle}
                title={modelTitle}
                description={description}
                RightIcon={
                  model === modelSettings.model ? CheckMdIcon : undefined
                }
                rightAccessory={
                  shouldShowFastModeIndicator(model, isFastModeOn) ? (
                    <LightningBoltIcon className="icon-xs text-token-link-foreground" />
                  ) : undefined
                }
                onSelect={() => {
                  scope.get(productEventLogger$).log({
                    eventName: "codex_composer_model_changed",
                    metadata: { model },
                  });

                  if (
                    shouldWarnAboutModelChanges &&
                    model !== modelSettings.model
                  ) {
                    scope
                      .get(toast$)
                      .info(
                        <FormattedMessage
                          id="composer.modelChangeDuringConversationWarning.toast"
                          defaultMessage="Changing models mid-conversation will degrade performance."
                          description="Warning toast shown when user changes model during an ongoing conversation"
                        />,
                        {
                          id: `composer.modelChangeDuringConversationWarning.${conversationId}`,
                        },
                      );
                  }

                  const reasoningEffort =
                    supportedReasoningEfforts.find(
                      ({ reasoningEffort }) =>
                        reasoningEffort === modelSettings.reasoningEffort,
                    )?.reasoningEffort ?? defaultReasoningEffort;

                  void setModelAndReasoningEffort(
                    model,
                    reasoningEffort,
                  ).finally(onClose);
                }}
              />
            );
          },
        )}
      </>
    );
  }

  useProvideSlashCommand({
    id: "model",
    title: intl.formatMessage({
      id: "composer.modelSlashCommand.title",
      defaultMessage: "Model",
      description: "Title for the model slash command",
    }),
    description: currentModelTitle,
    requiresEmptyComposer: false,
    Icon: CubeIcon,
    Content,
    enabled:
      requiresAuth &&
      hasLoadedModels &&
      listModelsStatus !== "error" &&
      models.length > 0,
    dependencies: [
      conversationId,
      currentModelTitle,
      hasLoadedModels,
      isFastModeOn,
      listModelsData,
      listModelsStatus,
      modelSettings,
      models,
      requiresAuth,
      scope,
      setModelAndReasoningEffort,
      shouldWarnAboutModelChanges,
    ],
  });

  return null;
}

function getModelTitle(
  model: string,
  modelsByType: ModelsByType | undefined,
): string {
  const displayName = getModelFromModelsByType(
    model,
    modelsByType,
  )?.displayName;
  return displayName != null ? formatModelDisplayName(displayName) : model;
}

function shouldShowFastModeIndicator(
  model: string,
  isFastModeOn: boolean,
): boolean {
  return isFastModeOn && model === "gpt-5.4";
}
