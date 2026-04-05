import type { ConversationId, GitCwd, ThreadDetailLevel } from "protocol";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { THREAD_DETAIL_LEVEL_STEPS_PROSE } from "@/settings/thread-detail-level";

import { ABOVE_COMPOSER_PORTAL_ID } from "../composer/above-composer-portal-id";
import type {
  TodoListConversationItem,
  TurnDiffLocalConversationItem,
} from "./items/local-conversation-item";
import { TodoPlanItemContent } from "./items/todo-plan-item-content";
import { TurnDiffContent } from "./items/turn-diff-content";

/**
 * A portal to a fixed container above the composer for rendering content
 * during an in-progress turn.
 */
export function InProgressFixedContentPortal({
  conversationId,
  hasBlockingRequest,
  todoListItem,
  unifiedDiffItem,
  conversationDetailLevel,
  cwd,
}: {
  conversationId: ConversationId;
  hasBlockingRequest: boolean;
  todoListItem: TodoListConversationItem | null;
  unifiedDiffItem: TurnDiffLocalConversationItem | null;
  conversationDetailLevel: ThreadDetailLevel;
  cwd: GitCwd | null;
}): React.ReactElement | null {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setTarget(document.getElementById(ABOVE_COMPOSER_PORTAL_ID));
  }, []);

  const showPlan = todoListItem != null;
  const showDiff =
    unifiedDiffItem != null &&
    conversationDetailLevel !== THREAD_DETAIL_LEVEL_STEPS_PROSE;
  const shouldRender =
    !!target && !hasBlockingRequest && (showPlan || showDiff);

  if (!shouldRender) {
    return null;
  }

  return createPortal(
    <div className="flex flex-col">
      {showPlan && todoListItem != null && (
        <TodoPlanItemContent item={todoListItem} />
      )}
      {showDiff && unifiedDiffItem != null && (
        <TurnDiffContent
          isInProgress
          item={unifiedDiffItem}
          conversationId={conversationId}
          cwd={cwd}
        />
      )}
    </div>,
    target!,
  );
}
