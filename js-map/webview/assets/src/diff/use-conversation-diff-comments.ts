import type {
  CommentInputItem,
  LocalOrRemoteConversationId,
  ReviewFindingComment,
} from "protocol";
import { useCallback, useMemo } from "react";

import { useSharedObject } from "@/shared-objects/use-shared-object";

type CommentsUpdater =
  | Array<CommentInputItem>
  | ((prev: Array<CommentInputItem>) => Array<CommentInputItem>);

/**
 * Gets and sets comments for a specific conversation from the shared object repository.
 */
export function useConversationDiffComments(id: LocalOrRemoteConversationId): {
  comments: Array<CommentInputItem>;
  modelComments: Array<ReviewFindingComment>;
  setComments: (updater: CommentsUpdater) => void;
} {
  const [rawComments, setComments] = useSharedObject("diff_comments");
  const [rawModelComments] = useSharedObject("diff_comments_from_model");

  const comments = useMemo(() => {
    return rawComments?.[id] ?? [];
  }, [rawComments, id]);
  const modelComments = useMemo(() => {
    return rawModelComments?.[id] ?? [];
  }, [rawModelComments, id]);

  const updateComments = useCallback(
    (updater: CommentsUpdater) => {
      setComments((prev) => {
        const base = { ...prev };
        const current = base[id] ?? [];
        const next = typeof updater === "function" ? updater(current) : updater;
        if (next.length === 0) {
          if (base[id] === undefined) {
            return base;
          }
          delete base[id];
          return base;
        }
        base[id] = next;
        return base;
      });
    },
    [id, setComments],
  );

  return {
    comments,
    modelComments,
    setComments: updateComments,
  };
}
