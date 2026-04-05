import type { ConversationId, SharedObjectValue } from "protocol";

type DiffCommentsByConversation =
  | SharedObjectValue<"diff_comments">
  | undefined;

export function getTransferredDiffCommentsState({
  sourceConversationId,
  targetConversationId,
  diffComments,
}: {
  sourceConversationId: ConversationId;
  targetConversationId: ConversationId;
  diffComments: DiffCommentsByConversation;
}): DiffCommentsByConversation {
  if (sourceConversationId === targetConversationId) {
    return diffComments;
  }
  if (diffComments == null) {
    return diffComments;
  }

  const sourceComments = diffComments[sourceConversationId];
  if (sourceComments == null) {
    return diffComments;
  }

  const nextDiffComments = { ...diffComments };
  nextDiffComments[targetConversationId] = sourceComments;
  delete nextDiffComments[sourceConversationId];
  return nextDiffComments;
}
