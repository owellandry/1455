import { FormattedMessage } from "react-intl";

import type { ReasoningEffortKey } from "@/types/models";

export function ReasoningEffortLabelMessage({
  effort,
}: {
  effort: ReasoningEffortKey;
}): React.ReactElement {
  switch (effort) {
    case "none":
      return (
        <FormattedMessage
          id="composer.mode.local.reasoning.none.label"
          defaultMessage="None"
          description="Reasoning effort label for a given model: none"
        />
      );
    case "minimal":
      return (
        <FormattedMessage
          id="composer.mode.local.reasoning.minimal.label"
          defaultMessage="Minimal"
          description="Reasoning effort label for a given model: minimal"
        />
      );
    case "low":
      return (
        <FormattedMessage
          id="composer.mode.local.reasoning.low.label"
          defaultMessage="Low"
          description="Reasoning effort label for a given model: low"
        />
      );
    case "medium":
      return (
        <FormattedMessage
          id="composer.mode.local.reasoning.medium.label"
          defaultMessage="Medium"
          description="Reasoning effort label for a given model: medium"
        />
      );
    case "high":
      return (
        <FormattedMessage
          id="composer.mode.local.reasoning.high.label"
          defaultMessage="High"
          description="Reasoning effort label for a given model: high"
        />
      );
    case "xhigh":
      return (
        <FormattedMessage
          id="composer.mode.local.reasoning.xhigh.label"
          defaultMessage="Extra High"
          description="Reasoning effort label for a given model: extra high"
        />
      );
  }
}
