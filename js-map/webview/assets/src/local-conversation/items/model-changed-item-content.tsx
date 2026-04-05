import { FormattedMessage } from "react-intl";

import { Tooltip } from "@/components/tooltip";
import CubeIcon from "@/icons/cube.svg";
import InfoIcon from "@/icons/info.svg";
import { useListModels } from "@/queries/model-queries";
import type { ModelsByType } from "@/types/models";
import { formatModelDisplayName } from "@/utils/format-model-display-name";
import { getModelFromModelsByType } from "@/utils/normalize-model-settings";

import { InlineStatusItemContent } from "./inline-status-item-content";

export function ModelChangedItemContent({
  fromModel,
  toModel,
}: {
  fromModel: string;
  toModel: string;
}): React.ReactElement {
  const { data } = useListModels();
  const modelsByType = data?.modelsByType;
  const fromLabel = renderModelLabel(fromModel, modelsByType);
  const toLabel = renderModelLabel(toModel, modelsByType);

  return (
    <InlineStatusItemContent
      icon={<CubeIcon className="icon-xs" />}
      message={
        <FormattedMessage
          id="localConversation.modelChanged"
          defaultMessage="Model changed from {fromModel} to {toModel}."
          description="Synthetic divider shown when model changes for the next turn."
          values={{
            fromModel: fromLabel,
            toModel: toLabel,
          }}
        />
      }
      trailingContent={
        <Tooltip
          tooltipContent={
            <div className="max-w-3xs text-center">
              <div>
                <FormattedMessage
                  id="localConversation.modelChanged.warning.line1"
                  defaultMessage="Changing models mid-conversation will degrade performance."
                  description="First line of warning tooltip shown after the model-changed inline status."
                />
              </div>
              <div>
                <FormattedMessage
                  id="localConversation.modelChanged.warning.line2"
                  defaultMessage="Context may automatically compact."
                  description="Second line of warning tooltip shown after the model-changed inline status."
                />
              </div>
            </div>
          }
        >
          <InfoIcon className="icon-2xs" />
        </Tooltip>
      }
    />
  );
}

function renderModelLabel(
  model: string,
  modelsByType: ModelsByType | undefined,
): React.ReactNode {
  const displayName = getModelFromModelsByType(
    model,
    modelsByType,
  )?.displayName;
  if (displayName != null && displayName.trim().length > 0) {
    return formatModelDisplayName(displayName);
  }

  return (
    <FormattedMessage
      id="composer.mode.local.model.custom"
      defaultMessage="Custom"
      description="Custom model from config"
    />
  );
}
