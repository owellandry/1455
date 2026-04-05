import type { ConversationId, GitCwd, ThreadDetailLevel } from "protocol";
import { FormattedMessage } from "react-intl";

import { Spinner } from "@/components/spinner";
import { UserMessage } from "@/components/user-message";
import { CommentAttachments } from "@/composer/attachments/comment-attachments";
import { McpServerElicitationRequestPanel } from "@/composer/mcp-server-elicitation-request-panel";
import { CodeReviewAssistantMessage } from "@/local-conversation/items/code-review-assistant-message";
import { HeartbeatAssistantMessage } from "@/local-conversation/items/heartbeat-assistant-message";
import { THREAD_DETAIL_LEVEL_STEPS_PROSE } from "@/settings/thread-detail-level";

import { AssistantMessageContent } from "./assistant-message-content";
import { AutomaticApprovalReviewContent } from "./automatic-approval-review-content";
import { ContextCompactionItemContent } from "./context-compaction-item-content";
import { ExecItemContent } from "./exec-item-content";
import { ForkedFromConversationItemContent } from "./forked-from-conversation-item-content";
import { HeartbeatDividerItemContent } from "./heartbeat-divider-item-content";
import type {
  AssistantMessageLocalConversationItem,
  AssistantMessageStructuredOutput,
  LocalConversationItem,
} from "./local-conversation-item";
import { McpToolItemContent } from "./mcp-tool-item-content";
import { ModelChangedItemContent } from "./model-changed-item-content";
import { ModelReroutedItemContent } from "./model-rerouted-item-content";
import { MultiAgentActionItemContent } from "./multi-agent-action-item-content";
import { PatchItemContent } from "./patch-item-content";
import { PersonalityChangedItemContent } from "./personality-changed-item-content";
import { ReasoningItemContent } from "./reasoning-item-content";
import { RemoteTaskCreatedItemContent } from "./remote-task-created-item-content";
import { StreamErrorContent } from "./stream-error-content";
import { SystemErrorContent } from "./system-error-content";
import { TodoPlanItemContent } from "./todo-plan-item-content";
import { TurnDiffContent } from "./turn-diff-content";
import { UserInputResponseItemContent } from "./user-input-response-item-content";
import {
  LocalUserImageThumb,
  UserMessageFileAttachment,
} from "./user-message-attachments";
import { WebSearchItemContent } from "./web-search-item-content";
import { WorkedForItemContent } from "./worked-for-item-content";

function hasStructuredOutputType<
  T extends AssistantMessageStructuredOutput["type"],
>(
  item: AssistantMessageLocalConversationItem,
  structuredOutputType: T,
): item is AssistantMessageLocalConversationItem<
  Extract<AssistantMessageStructuredOutput, { type: T }>
> {
  return item.structuredOutput?.type === structuredOutputType;
}

export function renderLocalConversationItemContent({
  item,
  isMostRecentTurn,
  conversationId,
  forceNormalTone,
  conversationDetailLevel,
  isTurnInProgress,
  cwd,
  assistantCopyText,
  emptyUserMessageOverride,
  parentThreadAttachment,
  onEditMessage,
  onForkMessage,
}: {
  item: LocalConversationItem;
  isMostRecentTurn?: boolean;
  conversationId: ConversationId;
  forceNormalTone?: boolean;
  conversationDetailLevel: ThreadDetailLevel;
  isTurnInProgress: boolean;
  cwd: GitCwd | null;
  assistantCopyText?: string;
  emptyUserMessageOverride?: string | null;
  parentThreadAttachment?: { sourceConversationId: string };
  onEditMessage?: (message: string) => Promise<void>;
  onForkMessage?: (message: string) => void;
}): React.ReactElement | null {
  const hideCodeBlocks =
    conversationDetailLevel === THREAD_DETAIL_LEVEL_STEPS_PROSE;

  switch (item.type) {
    case "user-message": {
      if (item.systemHeartbeat === true) {
        return <HeartbeatDividerItemContent />;
      }
      const userMessageText =
        item.message.trim().length === 0 &&
        (emptyUserMessageOverride?.trim().length ?? 0) > 0
          ? (emptyUserMessageOverride ?? "")
          : item.message;
      const canEditMessage =
        item.message.trim().length > 0 || emptyUserMessageOverride == null;
      const hasFiles = item.attachments.length > 0;
      const hasImages = item.images && item.images.length > 0;
      const hasAttachments =
        hasFiles || hasImages || parentThreadAttachment != null;
      const hasComments = (item.comments?.length ?? 0) > 0;

      const renderAttachments = (): React.ReactElement | null => {
        if (!hasAttachments) {
          return null;
        }
        return (
          <div className="flex flex-wrap items-end justify-end gap-2 self-end">
            {parentThreadAttachment ? (
              <ForkedFromConversationItemContent
                sourceConversationId={
                  parentThreadAttachment.sourceConversationId
                }
                kind="parent-context"
              />
            ) : null}
            {hasFiles
              ? item.attachments.map((attachment, idx) => (
                  <UserMessageFileAttachment
                    key={`${attachment.fsPath}-${attachment.startLine ?? 0}-${idx}`}
                    attachment={attachment}
                    cwd={cwd}
                  />
                ))
              : null}
            {hasImages
              ? item.images.map((src, idx) => (
                  <LocalUserImageThumb key={`${idx}`} src={src} />
                ))
              : null}
          </div>
        );
      };

      return (
        <div className="flex flex-col items-end gap-2">
          {renderAttachments()}
          {hasComments && item.comments ? (
            <CommentAttachments
              numComments={item.comments.length}
              tooltipContent={
                <div className="flex flex-col divide-y divide-token-border">
                  {item.comments.map((comment, index) => (
                    <div
                      key={`${comment.path}-${comment.lineRange ?? "unknown"}-${index}`}
                      className="flex flex-col gap-1.5 px-2.5 py-2"
                    >
                      {comment.path != null ||
                      comment.side != null ||
                      comment.lineRange != null ? (
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs leading-4 text-token-description-foreground">
                          {comment.path ? (
                            <span className="break-all">{comment.path}</span>
                          ) : null}
                          {comment.side != null ? (
                            <span className="font-medium text-token-foreground">
                              {comment.side === "left" ? (
                                <FormattedMessage
                                  id="codex.localConversation.diffCommentLeftSide"
                                  defaultMessage="L"
                                  description="Short label for the left side of a diff on a sent local user comment"
                                />
                              ) : (
                                <FormattedMessage
                                  id="codex.localConversation.diffCommentRightSide"
                                  defaultMessage="R"
                                  description="Short label for the right side of a diff on a sent local user comment"
                                />
                              )}
                            </span>
                          ) : null}
                          {comment.lineRange != null ? (
                            <span>{comment.lineRange}</span>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="text-sm leading-5 break-words whitespace-pre-wrap text-token-foreground">
                        {comment.body}
                      </div>
                    </div>
                  ))}
                </div>
              }
            />
          ) : null}
          <UserMessage
            message={userMessageText}
            alwaysShowActions={Boolean(isMostRecentTurn)}
            referencesPriorConversation={item.referencesPriorConversation}
            reviewMode={item.reviewMode === true}
            pullRequestFixMode={item.pullRequestFixMode === true}
            autoResolveSync={item.autoResolveSync === true}
            commentCount={hasComments ? 0 : item.commentCount}
            pullRequestCheckCount={item.pullRequestCheckCount}
            onEditMessage={canEditMessage ? onEditMessage : undefined}
            onForkMessage={onForkMessage}
          />
        </div>
      );
    }
    case "assistant-message": {
      if (hasStructuredOutputType(item, "code-review")) {
        return (
          <CodeReviewAssistantMessage
            item={item}
            conversationId={conversationId}
          />
        );
      }
      if (hasStructuredOutputType(item, "heartbeat")) {
        return (
          <HeartbeatAssistantMessage
            item={item}
            conversationId={conversationId}
            cwd={cwd}
          />
        );
      }
      if (item.renderPlaceholderWhileStreaming && !item.completed) {
        return (
          <div className="flex w-full items-center justify-center pt-8">
            <Spinner className="icon-sm" />
          </div>
        );
      }
      return (
        <AssistantMessageContent
          item={item}
          assistantCopyText={assistantCopyText}
          conversationId={conversationId}
          cwd={cwd}
        />
      );
    }
    case "web-search":
      return <WebSearchItemContent item={item} />;
    case "worked-for":
      return <WorkedForItemContent timeLabel={item.timeLabel} />;
    case "reasoning":
      return (
        <ReasoningItemContent
          item={item}
          cwd={cwd}
          hideCodeBlocks={hideCodeBlocks}
        />
      );
    case "exec":
      if (
        hideCodeBlocks ||
        ((item.parsedCmd.type === "read" ||
          item.parsedCmd.type === "search" ||
          item.parsedCmd.type === "list_files") &&
          !item.parsedCmd.isFinished)
      ) {
        return null;
      }
      return (
        <ExecItemContent
          item={item}
          isTurnInProgress={isTurnInProgress}
          threadDetailLevel={conversationDetailLevel}
          forceNormalTone={forceNormalTone}
        />
      );
    case "patch":
      return hideCodeBlocks ? null : <PatchItemContent item={item} cwd={cwd} />;
    case "userInput":
      return null;
    case "user-input-response":
      return <UserInputResponseItemContent item={item} />;
    case "mcp-server-elicitation":
      return (
        <McpServerElicitationRequestPanel
          conversationId={conversationId}
          requestId={item.requestId}
          elicitation={item.elicitation}
        />
      );
    case "todo-list":
      return <TodoPlanItemContent item={item} />;
    case "plan-implementation":
      return null;
    case "proposed-plan":
      return null;
    case "stream-error":
      return <StreamErrorContent item={item} />;
    case "system-error":
      return <SystemErrorContent item={item} />;
    case "turn-diff":
      return hideCodeBlocks ? null : (
        <TurnDiffContent
          isInProgress={false}
          item={item}
          conversationId={conversationId}
          cwd={cwd}
        />
      );
    case "remote-task-created":
      return <RemoteTaskCreatedItemContent taskId={item.taskId} />;
    case "personality-changed":
      return <PersonalityChangedItemContent personality={item.personality} />;
    case "forked-from-conversation":
      return (
        <ForkedFromConversationItemContent
          sourceConversationId={item.sourceConversationId}
        />
      );
    case "model-changed":
      return (
        <ModelChangedItemContent
          fromModel={item.fromModel}
          toModel={item.toModel}
        />
      );
    case "model-rerouted":
      return (
        <ModelReroutedItemContent toModel={item.toModel} reason={item.reason} />
      );
    case "context-compaction":
      return <ContextCompactionItemContent completed={item.completed} />;
    case "mcp-tool-call":
      return hideCodeBlocks ? null : <McpToolItemContent item={item} />;
    case "automatic-approval-review":
      return <AutomaticApprovalReviewContent item={item} />;
    case "multi-agent-action":
      return (
        <MultiAgentActionItemContent
          conversationId={conversationId}
          items={[item]}
        />
      );
  }
}
