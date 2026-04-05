import type * as AppServer from "app-server-types";
import { FormattedMessage } from "react-intl";

import { Tooltip } from "@/components/tooltip";
import InfoIcon from "@/icons/info.svg";
import { formatModelDisplayName } from "@/utils/format-model-display-name";

import { InlineStatusItemContent } from "./inline-status-item-content";

export function ModelReroutedItemContent({
  toModel,
  reason,
}: {
  toModel: string;
  reason: AppServer.v2.ModelRerouteReason;
}): React.ReactElement {
  const shouldShowTooltip = reason === "highRiskCyberActivity";
  const toLabel = formatModelDisplayName(toModel);

  return (
    <InlineStatusItemContent
      message={
        <FormattedMessage
          id="localConversation.modelRerouted"
          defaultMessage="Your request was routed to {toModel}."
          description="Synthetic divider shown when a request is rerouted to another model."
          values={{ toModel: toLabel }}
        />
      }
      trailingContent={
        shouldShowTooltip ? (
          <Tooltip
            interactive
            tooltipContent={
              <div className="max-w-3xs text-center whitespace-normal">
                <div>
                  <FormattedMessage
                    id="localConversation.modelRerouted.warning.line1"
                    defaultMessage="Heads up, your request was re-routed to reduce cyber-abuse risk."
                    description="First line of warning tooltip shown after the model-rerouted inline status."
                  />
                </div>
                <div className="mt-2">
                  <FormattedMessage
                    id="localConversation.modelRerouted.warning.line2"
                    defaultMessage="Think this is a mistake? Request a review at <link>chatgpt.com/cyber</link> or report via /feedback"
                    description="Second line of warning tooltip shown after the model-rerouted inline status."
                    values={{
                      link: (chunks: React.ReactNode): React.ReactNode => (
                        <a
                          href="https://chatgpt.com/cyber"
                          target="_blank"
                          rel="noreferrer"
                          className="text-token-link underline-offset-2 hover:underline"
                        >
                          {chunks}
                        </a>
                      ),
                    }}
                  />
                </div>
              </div>
            }
          >
            <InfoIcon className="icon-2xs" />
          </Tooltip>
        ) : null
      }
    />
  );
}
