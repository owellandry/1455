import type { ConversationId } from "protocol";
import { useLocation } from "react-router";

import { PlanSummaryItemContent } from "@/local-conversation/items/plan-summary-item-content";

type PlanSummaryRouteState = {
  planContent: string;
  conversationId: ConversationId;
};

export function PlanSummaryPage(): React.ReactElement {
  const location = useLocation();
  const state = location.state as PlanSummaryRouteState | null;

  if (!state?.planContent || !state?.conversationId) {
    return <PlanSummaryLoading />;
  }

  return (
    <PlanSummaryPageContent
      planContent={state.planContent}
      conversationId={state.conversationId}
    />
  );
}

export function PlanSummaryPageContent({
  planContent,
  conversationId,
}: {
  planContent: string;
  conversationId: ConversationId;
}): React.ReactElement {
  return (
    <div className="overflow-y-auto p-[var(--padding-panel)]">
      <PlanSummaryItemContent
        item={{
          type: "assistant-message",
          content: planContent,
          completed: true,
          phase: null,
          structuredOutput: undefined,
        }}
        conversationId={conversationId}
        cwd={null}
        showOpenButton={false}
      />
    </div>
  );
}

function PlanSummaryLoading(): React.ReactElement {
  return (
    <div className="p-[var(--padding-panel)]">
      <div className="animate-pulse overflow-hidden rounded-2xl border border-token-border bg-token-editor-background/50">
        <div className="flex items-center gap-3 border-b border-token-border/60 px-4 py-3">
          <div className="size-8 rounded-lg bg-token-foreground/10" />
          <div className="h-4 w-24 rounded bg-token-foreground/20" />
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="h-3 w-5/6 rounded bg-token-foreground/10" />
          <div className="h-3 w-4/6 rounded bg-token-foreground/10" />
          <div className="h-3 w-3/6 rounded bg-token-foreground/10" />
        </div>
      </div>
    </div>
  );
}
