import type { DndContextProps, DragEndEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToFirstScrollableAncestor,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { Tooltip } from "@/components/tooltip";
import { UserFormattedText } from "@/components/user-formatted-text";
import DragIcon from "@/icons/drag.svg";
import FollowUpIcon from "@/icons/follow-up.svg";
import InfoIcon from "@/icons/info.svg";
import PencilIcon from "@/icons/pencil.svg";
import ReplyIcon from "@/icons/reply.svg";
import ThreeDotsIcon from "@/icons/three-dots.svg";
import TrashIcon from "@/icons/trash.svg";

import { useHasAboveComposerPortalContent } from "./use-has-above-composer-portal-content";

export function QueuedMessageList({
  pendingSteers = [],
  messages,
  editingMessageId,
  isQueueingEnabled,
  onEditMessage,
  onDeleteMessage,
  onSendNowMessage,
  onReorderMessages,
  onQueueingChange,
}: {
  pendingSteers?: Array<{
    id: string;
    text: string;
    commentCount: number;
    imageCount: number;
  }>;
  messages: Array<{ id: string; text: string; commentCount: number }>;
  editingMessageId: string | null;
  isQueueingEnabled: boolean;
  onEditMessage: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onSendNowMessage: (messageId: string) => void;
  onReorderMessages: (orderedMessageIds: Array<string>) => void;
  onQueueingChange: (value: boolean) => void;
}): React.ReactElement | null {
  const intl = useIntl();
  const hasAboveComposerPortalContent = useHasAboveComposerPortalContent();
  const messageIds = messages.map((message) => message.id);
  const { dndContextProps } = useQueuedMessageReorderDnd({
    messageIds,
    onReorderMessages,
  });

  if (pendingSteers.length === 0 && messages.length === 0) {
    return null;
  }

  return (
    <div
      className={clsx(
        "bg-token-input-background/70 text-token-foreground border-token-border/80 relative overflow-clip border-x border-t backdrop-blur-sm",
        !hasAboveComposerPortalContent && "first:rounded-t-2xl",
      )}
    >
      <div className="vertical-scroll-fade-mask flex max-h-[30dvh] flex-col gap-px overflow-y-auto px-5 py-row-y">
        {pendingSteers.map((pendingSteer) => (
          <PendingSteerRow
            key={pendingSteer.id}
            messageText={formatPreviewText(intl, {
              text: pendingSteer.text,
              commentCount: pendingSteer.commentCount,
              imageCount: pendingSteer.imageCount,
            })}
          />
        ))}
        <DndContext {...dndContextProps}>
          <SortableContext
            items={messageIds}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence initial={false}>
              {messages.map((message) => {
                return (
                  <QueuedMessageRow
                    key={message.id}
                    messageId={message.id}
                    messageText={formatPreviewText(intl, {
                      text: message.text,
                      commentCount: message.commentCount,
                      imageCount: 0,
                    })}
                    isEditing={message.id === editingMessageId}
                    isQueueingEnabled={isQueueingEnabled}
                    onEditMessage={onEditMessage}
                    onDeleteMessage={onDeleteMessage}
                    onSendNowMessage={onSendNowMessage}
                    onQueueingChange={onQueueingChange}
                  />
                );
              })}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function QueuedMessageRow({
  messageId,
  messageText,
  isEditing,
  isQueueingEnabled,
  onEditMessage,
  onDeleteMessage,
  onSendNowMessage,
  onQueueingChange,
}: {
  messageId: string;
  messageText: string;
  isEditing: boolean;
  isQueueingEnabled: boolean;
  onEditMessage: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onSendNowMessage: (messageId: string) => void;
  onQueueingChange: (value: boolean) => void;
}): React.ReactElement {
  const intl = useIntl();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: messageId,
  });

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="overflow-visible"
    >
      <div
        className={clsx(
          "group flex min-w-0 items-center justify-between gap-2 py-0.5 text-sm",
          (isEditing || isDragging) && "opacity-60",
        )}
      >
        <span
          ref={setActivatorNodeRef}
          className="relative flex h-4 cursor-grab items-center justify-center active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <DragIcon
            className={clsx(
              "icon-2xs text-token-input-placeholder-foreground/70 pointer-events-none absolute right-full top-1/2 -mr-0.5 -translate-y-1/2 transition-opacity",
              isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
            aria-hidden
          />
          <FollowUpIcon className="icon-2xs text-token-input-placeholder-foreground/70" />
        </span>
        <UserFormattedText
          className="line-clamp-2 min-w-0 flex-1 leading-4 text-token-description-foreground"
          text={messageText}
          cwd={null}
        />

        <div className="flex shrink-0 items-center gap-1">
          <Tooltip
            side="top"
            tooltipClassName="max-w-80"
            tooltipBodyClassName="text-center whitespace-normal leading-snug"
            tooltipContent={
              <div className="space-y-1 text-center">
                <p>
                  <FormattedMessage
                    id="composer.queuedMessage.sendNowTooltip"
                    defaultMessage="Submit without interrupting the model"
                    description="Primary tooltip text for steering with a queued follow-up without interrupting the current model run"
                  />
                </p>
                <p className="text-token-description-foreground">
                  <FormattedMessage
                    id="composer.queuedMessage.sendNowTooltipTiming"
                    defaultMessage="After next model tool call"
                    description="Secondary tooltip text explaining when a queued steer will be submitted"
                  />
                </p>
              </div>
            }
          >
            <Button
              className="cursor-pointer gap-1 px-2"
              style={{ cursor: "pointer" }}
              aria-label={intl.formatMessage({
                id: "composer.queuedMessage.sendNow",
                defaultMessage: "Steer",
                description:
                  "Button label for sending a queued follow-up as a steer",
              })}
              color="secondary"
              size="default"
              onClick={(event): void => {
                event.stopPropagation();
                onSendNowMessage(messageId);
              }}
            >
              <ReplyIcon className="icon-2xs shrink-0" />
              <FormattedMessage
                id="composer.queuedMessage.sendNow"
                defaultMessage="Steer"
                description="Button label for sending a queued follow-up as a steer"
              />
            </Button>
          </Tooltip>
          <Button
            className="[&>svg]:icon-2xs"
            aria-label={intl.formatMessage({
              id: "composer.queuedMessage.delete",
              defaultMessage: "Delete queued message",
              description: "Aria label for deleting a queued message",
            })}
            color="ghost"
            size="icon"
            onClick={(event): void => {
              event.stopPropagation();
              onDeleteMessage(messageId);
            }}
          >
            <TrashIcon className="icon-2xs" />
          </Button>
          <BasicDropdown
            align="end"
            triggerButton={
              <Button
                className="[&>svg]:icon-2xs"
                aria-label={intl.formatMessage({
                  id: "composer.queuedMessage.more",
                  defaultMessage: "Queued message actions",
                  description:
                    "Aria label for the queued message row actions menu",
                })}
                color="ghost"
                size="icon"
              >
                <ThreeDotsIcon className="icon-2xs" />
              </Button>
            }
          >
            <Dropdown.Item
              LeftIcon={PencilIcon}
              className="text-token-description-foreground"
              onClick={(event): void => {
                event.stopPropagation();
                onEditMessage(messageId);
              }}
            >
              <FormattedMessage
                id="composer.queuedMessage.edit"
                defaultMessage="Edit message"
                description="Menu item to edit a queued message"
              />
            </Dropdown.Item>
            <Dropdown.Item
              LeftIcon={FollowUpIcon}
              className="text-token-description-foreground"
              disabled={!isQueueingEnabled}
              onClick={(event): void => {
                event.stopPropagation();
                onQueueingChange(false);
              }}
            >
              <FormattedMessage
                id="composer.queuedMessage.turnOff"
                defaultMessage="Turn off queueing"
                description="Menu item to switch the default follow up behavior to steer"
              />
            </Dropdown.Item>
          </BasicDropdown>
        </div>
      </div>
    </motion.div>
  );
}

function PendingSteerRow({
  messageText,
}: {
  messageText: string;
}): React.ReactElement {
  const intl = useIntl();
  const infoTooltip = (
    <div className="max-w-sm space-y-1 text-pretty whitespace-normal">
      <p>
        <FormattedMessage
          id="composer.pendingSteer.tooltip"
          defaultMessage="This steer will be submitted to the model as soon as possible without interrupting it, usually at the next tool call."
          description="Primary tooltip text explaining when a pending steer will be submitted"
        />
      </p>
      <p className="text-token-description-foreground">
        <FormattedMessage
          id="composer.pendingSteer.tooltipInterrupt"
          defaultMessage="Interrupt the model if you want to give it more immediate input."
          description="Secondary tooltip text explaining how to provide more immediate input than a pending steer"
        />
      </p>
    </div>
  );

  return (
    <div className="flex min-w-0 items-center justify-between gap-2 py-0.5 text-sm">
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <ReplyIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground/70" />
        <UserFormattedText
          className="line-clamp-2 min-w-0 flex-1 leading-4 text-token-description-foreground"
          text={messageText}
          cwd={null}
        />
      </span>
      <Tooltip tooltipContent={infoTooltip}>
        <Button
          className="[&>svg]:icon-2xs"
          aria-label={intl.formatMessage({
            id: "composer.pendingSteer.info",
            defaultMessage: "Why this steer is pending",
            description:
              "Aria label for the button that explains why a steer is pending",
          })}
          color="ghost"
          size="icon"
        >
          <InfoIcon className="icon-2xs text-token-input-placeholder-foreground/80" />
        </Button>
      </Tooltip>
    </div>
  );
}

function useQueuedMessageReorderDnd({
  messageIds,
  onReorderMessages,
}: {
  messageIds: Array<string>;
  onReorderMessages: (orderedMessageIds: Array<string>) => void;
}): {
  dndContextProps: DndContextProps;
} {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) {
      return;
    }

    const oldIndex = messageIds.indexOf(activeId);
    const newIndex = messageIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    onReorderMessages(arrayMove(messageIds, oldIndex, newIndex));
  };

  return {
    dndContextProps: {
      sensors,
      collisionDetection: closestCenter,
      modifiers: [restrictToVerticalAxis, restrictToFirstScrollableAncestor],
      onDragEnd: handleDragEnd,
    },
  };
}

function formatPreviewText(
  intl: ReturnType<typeof useIntl>,
  {
    text,
    commentCount,
    imageCount,
  }: {
    text: string;
    commentCount: number;
    imageCount: number;
  },
): string {
  if (text.trim().length > 0) {
    return text;
  }
  if (commentCount > 0) {
    return intl.formatMessage(
      {
        id: "commentAttachments.numComments",
        defaultMessage: "{count, plural, one {# comment} other {# comments}}",
        description: "Number of comments in the comment attachment",
      },
      { count: commentCount },
    );
  }
  if (imageCount > 0) {
    return intl.formatMessage(
      {
        id: "composer.pendingSteer.imagesOnly",
        defaultMessage: "{count, plural, one {# image} other {# images}}",
        description:
          "Fallback label for a pending steer that only contains image attachments",
      },
      { count: imageCount },
    );
  }
  return "";
}
