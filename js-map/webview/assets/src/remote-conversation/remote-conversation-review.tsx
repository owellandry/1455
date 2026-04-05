import { Review } from "@/review/review";

export function RemoteConversationReview({
  expandedActionsPortalTarget,
  isAgentWorking,
  lastTurnDiff,
}: {
  expandedActionsPortalTarget: HTMLElement | null;
  isAgentWorking: boolean;
  lastTurnDiff: string | null;
}): React.ReactElement {
  return (
    <Review
      expandedActionsPortalTarget={expandedActionsPortalTarget}
      isAgentWorking={isAgentWorking}
      lastTurnDiff={lastTurnDiff}
    />
  );
}
