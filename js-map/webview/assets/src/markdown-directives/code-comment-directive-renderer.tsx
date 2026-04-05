import type { ConversationId } from "protocol";
import type React from "react";
import { useEffect, useMemo } from "react";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import {
  parseCodeComment,
  updateCodeCommentStore,
} from "@/code-comment-directives";
import { FindingCard } from "@/code-review-finding-card";
import type { CodeReviewFinding } from "@/code-review-schema";
import { useSharedObject } from "@/shared-objects/use-shared-object";

export function CodeCommentDirectiveRenderer({
  title,
  body,
  file,
  start,
  end,
  priority,
  confidence,
  conversationId,
}: {
  title?: string;
  body?: string;
  file?: string;
  start?: string | number;
  end?: string | number;
  priority?: string | number;
  confidence?: string | number;
  conversationId?: ConversationId | null;
}): React.ReactElement | null {
  const manager = useDefaultAppServerManager();
  const [, setDiffComments] = useSharedObject("diff_comments_from_model");
  const finding = useMemo(
    (): CodeReviewFinding | null =>
      parseCodeComment({
        title,
        body,
        file,
        start,
        end,
        priority,
        confidence,
      }),
    [body, end, file, priority, start, title, confidence],
  );
  useEffect((): void => {
    if (finding == null || conversationId == null) {
      return;
    }
    const workspaceRoot = manager.getConversation(conversationId)?.cwd ?? null;
    updateCodeCommentStore({
      conversationId,
      findings: [finding],
      workspaceRoot,
      setDiffComments,
    });
  }, [conversationId, finding, manager, setDiffComments]);

  if (finding != null && conversationId != null) {
    return (
      <div className="my-2 first:mt-4 last:mb-4">
        <FindingCard finding={finding} conversationId={conversationId} />
      </div>
    );
  }

  return null;
}
