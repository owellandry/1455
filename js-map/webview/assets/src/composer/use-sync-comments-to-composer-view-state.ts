import type { CommentInputItem, LocalOrRemoteConversationId } from "protocol";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useEffectEvent } from "react";

import { useDiffComments } from "@/utils/use-diff-comments";

import {
  getFollowUpConversationId,
  type FollowUpProps,
} from "./composer-follow-up";

const NEW_CONVERSATION_ID: LocalOrRemoteConversationId = "new-conversation";

/**
 * Subscribes to comments from the shared object repository and notifies of changes.
 * This is not inlined in composer to ensure that the composer strictly uses comments from ComposerViewState
 * rather than the shared object repository as its source of truth.
 */
export function useSyncCommentsToComposerViewState(
  followUp: FollowUpProps | undefined,
  onCommentsChanged: (comments: Array<CommentInputItem>) => void,
): Dispatch<SetStateAction<Array<CommentInputItem>>> {
  const id = getFollowUpConversationId(followUp) ?? NEW_CONVERSATION_ID;
  const [comments, setComments] = useDiffComments(id);

  const onCommentsChangedEvent = useEffectEvent(onCommentsChanged);
  useEffect((): void => {
    onCommentsChangedEvent(comments ?? []);
  }, [comments, id]);

  const updateComments: Dispatch<SetStateAction<Array<CommentInputItem>>> = (
    updater,
  ): void => {
    const nextComments =
      typeof updater === "function" ? updater(comments ?? []) : (updater ?? []);
    setComments(nextComments);
  };

  return updateComments;
}
