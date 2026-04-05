import type {
  CommentInputItem,
  LocalOrRemoteConversationId,
  ReviewFindingComment,
} from "protocol";

import { useGate } from "@/statsig/statsig";

import { useConversationDiffComments } from "./use-conversation-diff-comments";

export type DiffCommentProps = {
  enableComments: boolean;
  comments: Array<CommentInputItem>;
  modelComments: Array<ReviewFindingComment>;
  onCommentsChange: (comments: Array<CommentInputItem>) => void;
};

export function useDiffCommentSources({
  conversationId,
  enableComments,
}: {
  conversationId: LocalOrRemoteConversationId;
  enableComments?: boolean;
}): {
  commentProps: DiffCommentProps;
} {
  const gateEnabled = useGate(__statsigName("codex-diff-comments"));
  const resolvedEnableComments = enableComments ?? gateEnabled;
  const { comments, modelComments, setComments } =
    useConversationDiffComments(conversationId);

  return {
    commentProps: {
      enableComments: resolvedEnableComments,
      comments,
      modelComments,
      onCommentsChange: setComments,
    },
  };
}
