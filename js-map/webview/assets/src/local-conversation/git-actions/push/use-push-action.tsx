import type { GitPushStatus } from "protocol";
import { useIntl, type IntlShape } from "react-intl";

import { Spinner } from "@/components/spinner";
import SendToCloudIcon from "@/icons/send-to-cloud.svg";

import type { GitAction } from "../types";

function getPushBlockedTooltip({
  pushStatus,
  canInferUpstream,
  ignoreNothingToPush = false,
  intl,
}: {
  pushStatus: GitPushStatus | undefined;
  canInferUpstream: boolean;
  ignoreNothingToPush?: boolean;
  intl: IntlShape;
}): string | undefined {
  if (!pushStatus) {
    return intl.formatMessage({
      id: "localConversationPage.pushStatusMissing",
      defaultMessage: "Loading push status…",
      description: "Tooltip shown when push status is loading",
    });
  }

  if (!pushStatus.branch || !pushStatus.defaultBranch) {
    return intl.formatMessage({
      id: "localConversationPage.pushBranchMissing",
      defaultMessage: "Branch information unavailable",
      description: "Tooltip shown when branch info cannot be resolved",
    });
  }
  if (!pushStatus.upstreamRef && !canInferUpstream) {
    return intl.formatMessage({
      id: "localConversationPage.pushNoUpstream",
      defaultMessage: "Set an upstream before pushing this branch",
      description:
        "Tooltip shown when push is blocked because no upstream is configured",
    });
  }
  if (!ignoreNothingToPush && pushStatus.commitsAhead === 0) {
    return intl.formatMessage({
      id: "localConversationPage.pushNothingToPush",
      defaultMessage: "No new commits to push",
      description:
        "Tooltip shown when there are no commits ahead of the remote",
    });
  }

  return undefined;
}

export function usePushAction({
  pushStatus,
  isPending,
  ignoreNothingToPush,
}: {
  pushStatus: GitPushStatus | undefined;
  isPending: boolean;
  ignoreNothingToPush?: boolean;
}): GitAction {
  const intl = useIntl();
  const pushBlockedTooltip = getPushBlockedTooltip({
    pushStatus,
    canInferUpstream: !!(pushStatus?.branch ?? null),
    ignoreNothingToPush,
    intl,
  });

  return {
    id: "push",
    label: isPending
      ? intl.formatMessage({
          id: "localConversationPage.pushButtonLabel.loading",
          defaultMessage: "Pushing…",
          description: "Label for git push action while a push is running",
        })
      : intl.formatMessage({
          id: "localConversationPage.pushButtonLabel",
          defaultMessage: "Push",
          description: "Label for git push action",
        }),
    icon: isPending ? Spinner : SendToCloudIcon,
    disabled: !!pushBlockedTooltip,
    loading: isPending,
    tooltipText: pushBlockedTooltip,
  };
}
