import type { LocalOrRemoteConversationId } from "protocol";
import { useCallback } from "react";

import { useSharedObject } from "@/shared-objects/use-shared-object";

type DiffCommentDraftRecord = Record<string, true>;

export function useDiffCommentDrafts(id: LocalOrRemoteConversationId | null): {
  drafts: DiffCommentDraftRecord;
  updateDrafts: (
    updater: (prev: DiffCommentDraftRecord) => DiffCommentDraftRecord,
  ) => void;
} {
  const [draftsByConversation, setDraftsByConversation] = useSharedObject(
    "diff_comment_drafts",
  );

  const drafts = id ? (draftsByConversation?.[id] ?? {}) : {};

  const updateDrafts = useCallback(
    (updater: (prev: DiffCommentDraftRecord) => DiffCommentDraftRecord) => {
      if (!id) {
        return;
      }
      setDraftsByConversation((prev) => {
        const current = prev?.[id] ?? {};
        const updated = updater(current);
        if (updated === current) {
          return prev;
        }
        const next = { ...prev };
        if (Object.keys(updated).length === 0) {
          delete next[id];
          return next;
        }
        next[id] = updated;
        return next;
      });
    },
    [id, setDraftsByConversation],
  );

  return {
    drafts,
    updateDrafts,
  };
}
