import type {
  CommentInputItem,
  LocalOrRemoteConversationId,
  SharedObjectValue,
} from "protocol";
import {
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";

import { useSharedObject } from "@/shared-objects/use-shared-object";

export function useDiffComments(
  id: LocalOrRemoteConversationId | null,
): [
  Array<CommentInputItem> | undefined,
  Dispatch<SetStateAction<Array<CommentInputItem>>>,
] {
  const [diffComments, setDiffComments] = useSharedObject("diff_comments");
  const conversationComments = useMemo(() => {
    return extractComments(diffComments, id);
  }, [id, diffComments]);

  const setConversationComments: Dispatch<
    SetStateAction<Array<CommentInputItem>>
  > = useCallback(
    (updater: SetStateAction<Array<CommentInputItem>>) => {
      if (!id) {
        return;
      }
      setDiffComments((prev) => {
        const next = { ...prev };
        const current = next[id] ?? [];
        const nextComments =
          typeof updater === "function" ? updater(current) : updater;
        if (nextComments.length === 0) {
          delete next[id];
          return next;
        }
        next[id] = nextComments;
        return next;
      });
    },
    [id, setDiffComments],
  );
  return [conversationComments, setConversationComments];
}

function extractComments(
  comments: SharedObjectValue<"diff_comments"> | undefined,
  id: LocalOrRemoteConversationId | null,
): Array<CommentInputItem> {
  return id ? (comments?.[id] ?? []) : [];
}
