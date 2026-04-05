import type { UseQueryResult } from "@tanstack/react-query";
import { useScope, useSignal } from "maitai";
import {
  CODEX_HOME_URL,
  type CodeTaskDetailsResponse,
  type CodeTaskTurnsResponse,
  type ImageAssetPointer,
  type LocalOrRemoteConversationId,
  type MessageOutputItem,
  type PRItemOutput,
  type TaskAssistantTurn,
  type TextMessageContent,
} from "protocol";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useParams } from "react-router";

import { AnimatedIcon } from "@/components/animated-icon";
import { Banner } from "@/components/banner";
import { CopyButton } from "@/components/copy-button";
import { ImagePreviewDialog } from "@/components/image-preview-dialog";
import { Markdown } from "@/components/markdown";
import { Spinner } from "@/components/spinner";
import { Tooltip } from "@/components/tooltip";
import { UserMessage } from "@/components/user-message";
import { WithWindow } from "@/components/with-window";
import { Composer } from "@/composer/composer";
import { createConversationSearchUnitKey } from "@/content-search/highlight-marks";
import { waitForLayout } from "@/content-search/scroll-to-match";
import { ContentSearchControllerBridge } from "@/content-search/search-controller-bridge";
import {
  contentSearchDiffSource$,
  setContentSearchDefaultDomainForOpen,
} from "@/content-search/search-model";
import type { ConversationScrollAdapter } from "@/content-search/types";
import { useConversationSearchHighlights } from "@/content-search/use-conversation-search-highlights";
import { Header } from "@/header/header";
import { useWindowType } from "@/hooks/use-window-type";
import CloudIcon from "@/icons/cloud.svg";
import InfoIcon from "@/icons/info.svg";
import { LoadingPage } from "@/loading-page/loading-page";
import { TurnDiffContent } from "@/local-conversation/items/turn-diff-content";
import { AttemptTabs } from "@/remote-conversation/attempt-tabs";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";
import {
  THREAD_DETAIL_LEVEL_STEPS_PROSE,
  useThreadDetailLevel,
} from "@/settings/thread-detail-level";
import { ThreadLayout } from "@/thread-layout/thread-layout";
import { ThreadScrollLayout } from "@/thread-layout/thread-scroll-layout";
import { useImageAssetSrc } from "@/uploads/use-image-asset";
import { copyToClipboard } from "@/utils/copy-to-clipboard";
import { useStreamLastTurnEvent } from "@/utils/use-stream-turn";
import { useFocusVsContext } from "@/utils/use-vs-context";

import { useMarkTaskAsRead } from "../codex-api";
import { messageBus } from "../message-bus";
import { ApplyOrRevertBanner } from "./apply-or-revert-banner";
import { createRemoteConversationSearchSource } from "./remote-conversation-search-source";
import {
  buildTurnTree,
  createTurnGroupings,
  type RemoteConversationTurn,
} from "./turn-tree";
import { useHasAppliedTurnLocally } from "./use-has-applied-code-locally";

export function RemoteConversationThread({
  taskDetailsQuery,
  taskTurnsQuery,
  turns,
  selectedTurnId,
  setSelectedTurnId,
  selectedTurn,
  showComposer = true,
}: {
  taskDetailsQuery: UseQueryResult<CodeTaskDetailsResponse, Error>;
  taskTurnsQuery: UseQueryResult<CodeTaskTurnsResponse, Error>;
  turns: Array<RemoteConversationTurn>;
  selectedTurnId: string | null;
  setSelectedTurnId: (id: string | null) => void;
  selectedTurn: TaskAssistantTurn | null;
  showComposer?: boolean;
}): React.ReactElement {
  const scope = useScope(ThreadRouteScope);
  const windowType = useWindowType();
  const vsContextRef = useFocusVsContext<HTMLDivElement>(
    "chatgpt.supportsNewChatKeyShortcut",
  );
  const { taskId } = useParams<{ taskId: string }>();
  const { data: taskDetails, isLoading, error } = taskDetailsQuery;
  const { mutate: markTaskAsRead } = useMarkTaskAsRead(taskId ?? "");

  // Hoisted turn selection state so the footer can live outside the scroll area
  const baseTurn = taskDetails?.current_assistant_turn;
  const [hasAppliedCodeLocally] = useHasAppliedTurnLocally(selectedTurnId);

  useEffect(() => {
    setSelectedTurnId(baseTurn?.id ?? null);
  }, [baseTurn?.id, setSelectedTurnId]);

  const taskEnvironment = taskDetails?.current_assistant_turn?.environment;
  const latestTurnStatus = baseTurn?.turn_status ?? null;
  const latestAssistantTurnId = baseTurn?.id ?? null;
  const isStreaming =
    latestTurnStatus === "in_progress" || latestTurnStatus === "pending";
  const isComplete = latestTurnStatus === "completed";
  const isError = latestTurnStatus === "failed";
  const threadDetailLevel = useThreadDetailLevel();
  const hideCodeBlocks = threadDetailLevel === THREAD_DETAIL_LEVEL_STEPS_PROSE;
  const latestEvent = useStreamLastTurnEvent(
    taskDetails?.task.id ?? "",
    latestTurnStatus,
    latestAssistantTurnId,
  );

  const diffTaskTurn = taskDetails?.current_diff_task_turn;
  const pr =
    selectedTurn?.output_items?.find(
      (item): item is PRItemOutput => item.type === "pr",
    ) ??
    diffTaskTurn?.output_items?.find(
      (item): item is PRItemOutput => item.type === "pr",
    );

  const unifiedDiff = pr?.output_diff?.diff ?? null;

  const hasUnreadTurn = taskDetails?.task.has_unread_turn ?? false;
  useEffect(() => {
    if (hasUnreadTurn) {
      markTaskAsRead();
    }
  }, [hasUnreadTurn, markTaskAsRead]);

  const openInWeb = (): void => {
    if (!taskId) {
      return;
    }
    messageBus.dispatchMessage("open-in-browser", {
      url: `${CODEX_HOME_URL}/tasks/${taskId}`,
    });
  };

  const showDiff = useEffectEvent(
    (id: LocalOrRemoteConversationId, unifiedDiff: string) => {
      // Only show it in the extension when it can open in an editor panel.
      // Showing a popup on other platforms is intrusive.
      if (unifiedDiff && windowType === "extension") {
        messageBus.dispatchMessage("show-diff", {
          conversationId: id,
          unifiedDiff,
          cwd: null,
        });
      }
    },
  );

  // Auto-show the editor diff on page load.
  // We'll have to see whether people like this or not but for now, open it.
  useEffect(() => {
    if (hideCodeBlocks) {
      return;
    }
    if (taskDetails?.task.id && unifiedDiff) {
      showDiff(taskDetails?.task.id ?? null, unifiedDiff);
    }
  }, [hideCodeBlocks, taskDetails?.task.id, unifiedDiff]);

  return (
    <ThreadLayout
      containerRef={vsContextRef}
      bodyClassName="[&_[data-thread-find-target=conversation]]:scroll-mt-24"
      data-vscode-context='{"chatgpt.supportsNewChatMenu": true}'
      header={
        <WithWindow extension>
          <Header title={taskDetails?.task.title ?? undefined} />
        </WithWindow>
      }
      banner={
        <WithWindow extension>
          <CloudTaskBanner taskDetails={taskDetails} />
        </WithWindow>
      }
      footer={
        <>
          {unifiedDiff && taskId && selectedTurn?.id && !hideCodeBlocks && (
            <ApplyOrRevertBanner
              turnId={selectedTurn.id}
              diff={unifiedDiff}
              taskEnvironment={taskEnvironment}
            />
          )}
          {isError && (
            <div className="p-2">
              <Banner
                type="error"
                content={
                  <FormattedMessage
                    id="codex.remoteConversation.turnFailed"
                    defaultMessage="An error occurred during this task"
                    description="Error banner shown when a sibling turn failed"
                  />
                }
                primaryCtaText={
                  <div className="flex items-center gap-1">
                    <FormattedMessage
                      id="codex.remoteConversation.openInWeb"
                      defaultMessage="Open in web"
                      description="Open task in Codex web button"
                    />
                  </div>
                }
                onPrimaryCtaClick={openInWeb}
              />
            </div>
          )}
          {showComposer && selectedTurnId && isComplete && taskDetails && (
            <div
              className="contents"
              data-thread-find-composer="true"
              onMouseDownCapture={() => {
                setContentSearchDefaultDomainForOpen(scope, "conversation");
              }}
              onFocusCapture={() => {
                setContentSearchDefaultDomainForOpen(scope, "conversation");
              }}
            >
              <Composer
                followUp={{
                  type: "cloud",
                  taskDetails,
                  selectedTurnId,
                  selectedTurn: selectedTurn ?? undefined,
                  hasAppliedCodeLocally,
                }}
                footerBranchName={
                  taskDetails?.task.task_status_display?.branch_name ?? null
                }
                showFooterBranchWhen="always"
              />
            </div>
          )}
        </>
      }
    >
      <ThreadScrollLayout contentWrapperClassName="flex flex-col gap-1.5 pt-2">
        {error && (
          <div className="py-2">
            <FormattedMessage
              id="codex.remoteConversation.errorWithMessage"
              defaultMessage="Error: {message}"
              description="Error display on the remote conversation page including the message"
              values={{ message: error.message }}
            />
          </div>
        )}
        {taskDetails ? (
          <RemoteConversationContent
            turns={turns}
            unifiedDiff={unifiedDiff}
            taskId={taskId ?? null}
            onSelect={setSelectedTurnId}
            turnsLoading={taskTurnsQuery.isLoading || taskTurnsQuery.isFetching}
            isStreaming={isStreaming}
            streamingEventText={latestEvent}
            streamingTurnId={latestAssistantTurnId}
            focusedAssistantId={selectedTurn?.id ?? baseTurn?.id ?? null}
            hideCodeBlocks={hideCodeBlocks}
          />
        ) : isLoading ? (
          <div className="flex min-h-full w-full items-center justify-center">
            <Spinner />
          </div>
        ) : null}
      </ThreadScrollLayout>
    </ThreadLayout>
  );
}

function CloudTaskBanner({
  taskDetails,
}: {
  taskDetails: CodeTaskDetailsResponse | undefined;
}): React.ReactElement {
  return (
    <>
      {taskDetails && (
        <a
          className="group flex items-center justify-center gap-1 bg-token-text-link-foreground/20 py-1.5 text-sm text-token-foreground focus:!outline-none"
          href={`${CODEX_HOME_URL}/tasks/${taskDetails.task.id}`}
        >
          <CloudIcon className="icon-2xs" />
          <FormattedMessage
            id="codex.remoteConversation.codexCloudTask"
            defaultMessage="You are viewing a <u>Codex cloud</u> task"
            description="Label indicating that you are viewing a Codex cloud task, not a local task"
            values={{
              u: (chunks: React.ReactNode) => (
                <span className="underline underline-offset-2">{chunks}</span>
              ),
            }}
          />
          <Tooltip
            tooltipContent={
              <div className="max-w-[120px]">
                <FormattedMessage
                  id="codex.remoteConversation.viewPreviousTurns"
                  defaultMessage="Open in web"
                  description="Tooltip for opening the task in Codex web"
                />
              </div>
            }
          >
            <InfoIcon className="icon-2xs" />
          </Tooltip>
        </a>
      )}
    </>
  );
}

function RemoteConversationContent({
  turns,
  unifiedDiff,
  taskId,
  onSelect,
  turnsLoading,
  isStreaming,
  streamingEventText,
  streamingTurnId,
  focusedAssistantId,
  hideCodeBlocks,
}: {
  turns: Array<RemoteConversationTurn>;
  unifiedDiff: string | null;
  taskId: string | null;
  onSelect: (id: string) => void;
  turnsLoading: boolean;
  isStreaming: boolean;
  streamingEventText: string;
  streamingTurnId: string | null;
  focusedAssistantId: string | null;
  hideCodeBlocks: boolean;
}): React.ReactElement {
  const scope = useScope(ThreadRouteScope);
  const treeRoot = buildTurnTree(turns);
  const groupings = createTurnGroupings(treeRoot, focusedAssistantId);
  const conversationSearchContainerRef = useRef<HTMLDivElement | null>(null);

  const conversationScrollAdapter = useMemo((): ConversationScrollAdapter => {
    return {
      scrollToTurn: async (turnKey: string): Promise<void> => {
        await waitForLayout();

        getRemoteConversationTurnElement(
          conversationSearchContainerRef,
          turnKey,
        )?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });

        await waitForLayout();
      },
      getTurnContainer: (turnKey: string): HTMLElement | null => {
        return getRemoteConversationTurnElement(
          conversationSearchContainerRef,
          turnKey,
        );
      },
    };
  }, []);

  const groupingsRef = useRef(groupings);
  groupingsRef.current = groupings;
  const diffSearchSource = useSignal(contentSearchDiffSource$);
  const remoteConversationSource = useMemo(() => {
    return createRemoteConversationSearchSource({
      getGroupings: () => groupingsRef.current,
      routeContextId: taskId == null ? "unavailable" : `remote:${taskId}`,
      scrollAdapter: conversationScrollAdapter,
    });
  }, [conversationScrollAdapter, taskId]);
  useConversationSearchHighlights({
    containerRef: conversationSearchContainerRef,
  });

  if (groupings.length === 0) {
    return (
      <LoadingPage fillParent debugName="RemoteConversationThread.groupings" />
    );
  }

  return (
    <>
      <ContentSearchControllerBridge
        conversationSource={remoteConversationSource}
        diffSource={diffSearchSource}
      />
      <div
        ref={conversationSearchContainerRef}
        data-thread-find-target="conversation"
        className="relative flex flex-col gap-2"
        onMouseDownCapture={() => {
          setContentSearchDefaultDomainForOpen(scope, "conversation");
        }}
        onFocusCapture={() => {
          setContentSearchDefaultDomainForOpen(scope, "conversation");
        }}
      >
        {groupings.map(({ node, activeId }) => {
          const imageAttachments = node.userTurn.input_items.filter(
            (item): item is ImageAssetPointer =>
              item.type === "image_asset_pointer",
          );
          const commentCount = node.userTurn.input_items.filter(
            (item) => item.type === "comment",
          ).length;
          const activeAssistant =
            node.assistantTurns.find((turn) => turn.id === activeId) ??
            node.assistantTurns[0] ??
            null;
          const siblingCount =
            activeAssistant?.sibling_turn_ids?.length ??
            node.assistantTurns[0]?.sibling_turn_ids?.length ??
            0;
          const expectedCount = Math.max(
            node.assistantTurns.length,
            siblingCount + 1,
          );
          const showAttempts = expectedCount > 1 && !!activeAssistant;
          const isFocusedAssistant =
            !!focusedAssistantId && activeAssistant?.id === focusedAssistantId;
          const userTurnKey = `user:${node.userTurn.id}`;
          const userMessageUnitKey = createConversationSearchUnitKey(
            userTurnKey,
            "message",
          );
          const assistantTurnKey =
            activeAssistant == null ? null : `assistant:${activeAssistant.id}`;
          const assistantMessageUnitKey =
            assistantTurnKey == null
              ? null
              : createConversationSearchUnitKey(assistantTurnKey, "message");
          const assistantMessage =
            activeAssistant &&
            !(isStreaming && activeAssistant.id === streamingTurnId)
              ? messageContentToString(
                  activeAssistant.output_items.filter(
                    (item): item is MessageOutputItem =>
                      item.type === "message",
                  ),
                )
              : "";
          const assistantCopyText = assistantMessage.trim();
          const canCopyAssistantMessage = assistantCopyText.length > 0;

          return (
            <div
              key={node.userTurn.id}
              className="flex flex-col gap-2"
              data-content-search-turn-key={userTurnKey}
              data-content-search-assistant-turn-key={
                assistantTurnKey ?? undefined
              }
            >
              {imageAttachments.length > 0 ? (
                <UserMessageImageAttachments attachments={imageAttachments} />
              ) : null}
              <div data-content-search-unit-key={userMessageUnitKey}>
                <UserMessage
                  message={messageContentToString(
                    node.userTurn.input_items.filter(
                      (item): item is MessageOutputItem =>
                        item.type === "message",
                    ),
                  )}
                  commentCount={commentCount}
                  referencesPriorConversation={node.userTurn.input_items.some(
                    (item) => item.type === "prior_conversation",
                  )}
                />
              </div>
              {showAttempts ? (
                <AttemptTabs
                  turns={node.assistantTurns}
                  selectedTurnId={activeAssistant.id}
                  onSelect={onSelect}
                  loading={turnsLoading}
                  expectedCount={expectedCount}
                />
              ) : null}
              {activeAssistant ? (
                <div
                  data-content-search-unit-key={
                    assistantMessageUnitKey ?? undefined
                  }
                >
                  {isStreaming && activeAssistant.id === streamingTurnId ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-6">
                      <AnimatedIcon
                        animation="codex-looking-around"
                        size="lg"
                      />
                      <span className="loading-shimmer-pure-text text-size-chat">
                        {streamingEventText.length ? (
                          streamingEventText
                        ) : (
                          <FormattedMessage
                            id="codex.remoteConversation.streaming"
                            defaultMessage="Getting started"
                            description="Text shown when a Codex task is streaming"
                          />
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="group flex min-w-0 flex-col">
                      <Markdown
                        className="wrap-anywhere"
                        textSize="text-size-chat"
                        cwd={null}
                        allowWideBlocks
                      >
                        {assistantMessage}
                      </Markdown>
                      {canCopyAssistantMessage ? (
                        <div className="mt-1 flex h-5 items-center justify-start">
                          <CopyButton
                            iconOnly
                            iconClassName="icon-2xs"
                            className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                            onCopy={(event) => {
                              void copyToClipboard(assistantCopyText, event);
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
              {isFocusedAssistant &&
              unifiedDiff &&
              taskId &&
              !hideCodeBlocks ? (
                <WithWindow extension>
                  <TurnDiffContent
                    isInProgress={false}
                    item={{
                      type: "turn-diff",
                      unifiedDiff,
                      cwd: null,
                    }}
                    showRevertButton={false}
                    conversationId={taskId}
                    cwd={null}
                  />
                </WithWindow>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

function getRemoteConversationTurnElement(
  containerRef: React.RefObject<HTMLDivElement | null>,
  turnKey: string,
): HTMLElement | null {
  const container = containerRef.current;
  if (container == null) {
    return null;
  }

  const el =
    container.querySelector<HTMLElement>(
      `[data-content-search-turn-key="${turnKey}"]`,
    ) ??
    container.querySelector<HTMLElement>(
      `[data-content-search-assistant-turn-key="${turnKey}"]`,
    );
  return el ?? null;
}

function messageContentToString(items: Array<MessageOutputItem>): string {
  return items
    .flatMap((c) =>
      // TODO (gpeal): This is missing repo citations.
      c.content.filter(
        (c): c is TextMessageContent => c.content_type === "text",
      ),
    )
    .map((c) => c.text)
    .join("");
}

function UserMessageImageAttachments({
  attachments,
}: {
  attachments: Array<ImageAssetPointer>;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2 self-end">
      {attachments.map((a, idx) => (
        <UserImageThumb key={`${a.asset_pointer}-${idx}`} asset={a} />
      ))}
    </div>
  );
}

function UserImageThumb({
  asset,
}: {
  asset: ImageAssetPointer;
}): React.ReactElement | null {
  const intl = useIntl();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const altLabel = intl.formatMessage({
    id: "codex.remoteConversation.userImageAttachment",
    defaultMessage: "User attachment",
    description: "Alt text for user image attachment",
  });
  const closePreviewLabel = intl.formatMessage({
    id: "codex.remoteConversation.closeImagePreview",
    defaultMessage: "Close image preview",
    description:
      "Aria label for closing the image preview dialog in remote conversation",
  });
  const {
    src: url,
    isLoading,
    isError,
    refetch,
  } = useImageAssetSrc(asset.asset_pointer);

  if (isError) {
    return null;
  }
  if (isLoading || !url) {
    return (
      <div
        className="flex size-16 items-center justify-center rounded-md border border-token-border bg-token-bg-tertiary text-sm"
        aria-label={intl.formatMessage({
          id: "codex.remoteConversation.loadingImage",
          defaultMessage: "Loading image",
          description: "Aria label for loading image",
        })}
      >
        {/* oxlint-disable-next-line formatjs/no-literal-string-in-jsx */}…
      </div>
    );
  }

  return (
    <ImagePreviewDialog
      src={url}
      alt={altLabel}
      open={isPreviewOpen}
      onOpenChange={setIsPreviewOpen}
      closeAriaLabel={closePreviewLabel}
      contentMaxWidthClassName="max-w-[min(90vw,calc(var(--thread-content-max-width)+16rem))]"
      imageReferrerPolicy="no-referrer"
      onImageError={refetch}
      triggerContent={
        <div
          className="size-16 cursor-pointer rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-token-focus-border"
          role="button"
          tabIndex={0}
          aria-label={altLabel}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsPreviewOpen(true);
            }
          }}
        >
          <img
            src={url}
            width={asset.width}
            height={asset.height}
            className="h-full w-full rounded-md object-contain"
            referrerPolicy="no-referrer"
            onError={refetch}
            alt={altLabel}
          />
        </div>
      }
    />
  );
}
