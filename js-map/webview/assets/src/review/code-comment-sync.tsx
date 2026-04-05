import type { ConversationId } from "protocol";
import type React from "react";
import { useEffect, useEffectEvent } from "react";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import {
  parseCodeCommentFindings,
  updateCodeCommentStore,
} from "@/code-comment-directives";
import {
  codeReviewResponseSchema,
  type CodeReviewFinding,
} from "@/code-review-schema";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { parseAssistantMessageJson } from "@/utils/assistant-json";

type TurnCompletedEvent = {
  conversationId: ConversationId;
  turnId: string | null;
  lastAgentMessage: string | null;
};

function getCodeCommentFindingsFromMessage(
  message: string,
): Array<CodeReviewFinding> {
  const directiveFindings = parseCodeCommentFindings(message);
  const parsed = parseAssistantMessageJson(message, codeReviewResponseSchema);
  if (parsed?.success) {
    return [...directiveFindings, ...parsed.data.findings];
  }
  return directiveFindings;
}

export function CodeCommentSync(): React.ReactElement | null {
  const manager = useDefaultAppServerManager();
  const [, setDiffComments] = useSharedObject("diff_comments_from_model");
  const handleTurnCompleted = useEffectEvent(
    (event: TurnCompletedEvent): void => {
      const markdown = event.lastAgentMessage;
      if (!markdown || markdown.trim().length === 0) {
        return;
      }

      const findings = getCodeCommentFindingsFromMessage(markdown);
      if (findings.length === 0) {
        return;
      }

      const workspaceRoot =
        manager.getConversation(event.conversationId)?.cwd ?? null;

      updateCodeCommentStore({
        conversationId: event.conversationId,
        findings,
        workspaceRoot,
        setDiffComments,
      });
    },
  );

  useEffect((): (() => void) => {
    return manager.addTurnCompletedListener(handleTurnCompleted);
  }, [manager]);

  return null;
}
