import { useScope } from "maitai";
import type { ConversationId } from "protocol";
import type React from "react";
import type { IntlShape } from "react-intl";
import { useIntl } from "react-intl";

import { useAuth } from "@/auth/use-auth";
import { useModelSettings } from "@/hooks/use-model-settings";
import CheckMdIcon from "@/icons/check-md.svg";
import { productEventLogger$ } from "@/product-event-signal";
import { hasListModelsLoaded, useListModels } from "@/queries/model-queries";
import { AppScope } from "@/scopes/app-scope";
import type { ReasoningEffortKey } from "@/types/models";

import { getReasoningEffortIcon } from "../reasoning-effort-icons";
import {
  getAvailableReasoningEffortOptions,
  getSelectedReasoningEffort,
} from "../reasoning-effort-options";
import { useProvideSlashCommand } from "./slash-command";
import { SlashCommandItem } from "./slash-command-item";

export function ReasoningSlashCommand({
  conversationId,
}: {
  conversationId: ConversationId | null;
}): null {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const { authMethod, requiresAuth } = useAuth();
  const { data: listModelsData, status: listModelsStatus } = useListModels();
  const hasLoadedModels = hasListModelsLoaded(listModelsStatus);
  const isUsingCopilotApi = authMethod === "copilot";
  const { modelSettings, setModelAndReasoningEffort } =
    useModelSettings(conversationId);
  const availableReasoningEfforts = getAvailableReasoningEffortOptions(
    listModelsData?.modelsByType,
    modelSettings.model,
  );
  const selectedEffort = getSelectedReasoningEffort(
    modelSettings.reasoningEffort,
    availableReasoningEfforts,
  );
  const SelectedIcon = getReasoningEffortIcon(selectedEffort);

  function Content({ onClose }: { onClose: () => void }): React.ReactElement {
    return (
      <>
        {availableReasoningEfforts.map(({ reasoningEffort }) => {
          const Icon = getReasoningEffortIcon(reasoningEffort);
          const title = getReasoningEffortTitle(intl, reasoningEffort);
          return (
            <SlashCommandItem
              key={reasoningEffort}
              value={title}
              title={title}
              LeftIcon={Icon}
              RightIcon={
                reasoningEffort === selectedEffort ? CheckMdIcon : undefined
              }
              onSelect={() => {
                scope.get(productEventLogger$).log({
                  eventName: "codex_composer_reasoning_effort_changed",
                  metadata: { reasoning_effort: reasoningEffort },
                });
                void setModelAndReasoningEffort(
                  modelSettings.model,
                  reasoningEffort,
                ).finally(onClose);
              }}
            />
          );
        })}
      </>
    );
  }

  useProvideSlashCommand({
    id: "reasoning",
    title: intl.formatMessage({
      id: "composer.reasoningSlashCommand.title",
      defaultMessage: "Reasoning",
      description: "Title for the reasoning slash command",
    }),
    description: getReasoningEffortTitle(intl, selectedEffort),
    requiresEmptyComposer: false,
    Icon: SelectedIcon,
    Content,
    enabled: requiresAuth && hasLoadedModels && !isUsingCopilotApi,
    dependencies: [
      availableReasoningEfforts,
      conversationId,
      hasLoadedModels,
      isUsingCopilotApi,
      modelSettings,
      requiresAuth,
      scope,
      selectedEffort,
      setModelAndReasoningEffort,
    ],
  });

  return null;
}

function getReasoningEffortTitle(
  intl: Pick<IntlShape, "formatMessage">,
  effort: ReasoningEffortKey,
): string {
  switch (effort) {
    case "none":
      return intl.formatMessage({
        id: "composer.mode.local.reasoning.none.label",
        defaultMessage: "None",
        description: "Reasoning effort label for a given model: none",
      });
    case "minimal":
      return intl.formatMessage({
        id: "composer.mode.local.reasoning.minimal.label",
        defaultMessage: "Minimal",
        description: "Reasoning effort label for a given model: minimal",
      });
    case "low":
      return intl.formatMessage({
        id: "composer.mode.local.reasoning.low.label",
        defaultMessage: "Low",
        description: "Reasoning effort label for a given model: low",
      });
    case "medium":
      return intl.formatMessage({
        id: "composer.mode.local.reasoning.medium.label",
        defaultMessage: "Medium",
        description: "Reasoning effort label for a given model: medium",
      });
    case "high":
      return intl.formatMessage({
        id: "composer.mode.local.reasoning.high.label",
        defaultMessage: "High",
        description: "Reasoning effort label for a given model: high",
      });
    case "xhigh":
      return intl.formatMessage({
        id: "composer.mode.local.reasoning.xhigh.label",
        defaultMessage: "Extra High",
        description: "Reasoning effort label for a given model: extra high",
      });
  }
}
