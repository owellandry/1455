import clsx from "clsx";
import type { FormEvent } from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import tw from "tailwind-styled-components";

import { IMPLEMENT_PLAN_PREFIX } from "@/app-server/conversation-request";
import BranchIcon from "@/icons/branch.svg";
import { extractPromptRequest } from "@/prompts/render-prompt";

import CheckIcon from "../icons/check-md.svg";
import CopyIcon from "../icons/copy.svg";
import PencilIcon from "../icons/pencil.svg";
import { Button } from "./button";
import { Tooltip } from "./tooltip";
import { UserFormattedText } from "./user-formatted-text";

const MessageContext = tw.span`text-token-description-foreground text-xs`;
const EDIT_TEXTAREA_MAX_LINES = 6;
const EDIT_TEXTAREA_MIN_LINES = 2;

export function UserMessage({
  message,
  alwaysShowActions = false,
  referencesPriorConversation = false,
  reviewMode = false,
  pullRequestFixMode = false,
  autoResolveSync = false,
  commentCount = 0,
  pullRequestCheckCount = 0,
  onEditMessage,
  onForkMessage,
}: {
  message: string;
  alwaysShowActions?: boolean;
  referencesPriorConversation?: boolean;
  reviewMode?: boolean;
  pullRequestFixMode?: boolean;
  autoResolveSync?: boolean;
  commentCount?: number;
  pullRequestCheckCount?: number;
  onEditMessage?: (message: string) => Promise<void>;
  onForkMessage?: (message: string) => void;
}): React.ReactElement {
  const promptRequest = extractPromptRequest(message);
  const trimmedPromptRequest = promptRequest.trim();
  const [recentlyCopied, setRecentlyCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftMessage, setDraftMessage] = useState(promptRequest);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const intl = useIntl();
  const displayPromptRequest = promptRequest.startsWith(IMPLEMENT_PLAN_PREFIX)
    ? intl.formatMessage({
        id: "codex.userMessage.implementPlan",
        defaultMessage: "Implement plan",
        description:
          "Display text for the synthetic implement-plan follow-up prompt",
      })
    : promptRequest;
  const hasPrompt = displayPromptRequest.trim().length > 0;
  const canEdit =
    onEditMessage != null && !promptRequest.startsWith(IMPLEMENT_PLAN_PREFIX);
  const canFork =
    onForkMessage != null && !promptRequest.startsWith(IMPLEMENT_PLAN_PREFIX);
  const trimmedDraftMessage = draftMessage.trim();
  const hasAttachments =
    referencesPriorConversation ||
    reviewMode ||
    pullRequestFixMode ||
    autoResolveSync ||
    commentCount > 0 ||
    pullRequestCheckCount > 0;
  const shouldShowBubble = hasPrompt || !hasAttachments;

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(trimmedPromptRequest).then(() => {
      setRecentlyCopied(true);
      setTimeout((): void => setRecentlyCopied(false), 1500);
    });
  };

  const handleFork = (): void => {
    onForkMessage?.(trimmedPromptRequest);
  };

  const handleStartEdit = (): void => {
    setDraftMessage(promptRequest);
    setIsEditing(true);
  };

  const handleCancelEdit = (): void => {
    setDraftMessage(promptRequest);
    setIsEditing(false);
  };

  const handleSubmitEdit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (onEditMessage == null || isSubmittingEdit) {
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await onEditMessage(trimmedDraftMessage);
      setIsEditing(false);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return (
    <div className="group flex w-full flex-col items-end justify-end gap-1">
      {isEditing ? (
        <form
          className="flex w-full flex-col gap-4 rounded-2xl bg-token-foreground/5 px-3 py-2.5"
          onSubmit={(event) => {
            void handleSubmitEdit(event);
          }}
        >
          <textarea
            aria-label={intl.formatMessage({
              id: "codex.userMessage.editTextareaAriaLabel",
              defaultMessage: "Edit message",
              description:
                "Aria label for the textarea used to edit the previous user message",
            })}
            autoFocus
            className="w-full resize-none bg-transparent p-0 text-sm leading-relaxed text-token-foreground outline-none placeholder:text-token-description-foreground"
            ref={(node) => {
              if (node != null) {
                resizeEditTextarea(node);
              }
            }}
            rows={EDIT_TEXTAREA_MIN_LINES}
            value={draftMessage}
            onChange={(event) => {
              resizeEditTextarea(event.currentTarget);
              setDraftMessage(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.metaKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="flex justify-end gap-1.5">
            <Button
              color="outline"
              size="toolbar"
              disabled={isSubmittingEdit}
              onClick={handleCancelEdit}
            >
              <FormattedMessage
                id="codex.userMessage.cancelEditMessage"
                defaultMessage="Cancel"
                description="Button label for canceling an edited user message"
              />
            </Button>
            <Button
              color="primary"
              size="toolbar"
              loading={isSubmittingEdit}
              type="submit"
            >
              <FormattedMessage
                id="codex.userMessage.sendEditedMessage"
                defaultMessage="Send"
                description="Button label for submitting an edited user message"
              />
            </Button>
          </div>
        </form>
      ) : shouldShowBubble ? (
        <div
          className={clsx(
            "bg-token-foreground/5 max-w-[77%] break-words rounded-2xl px-3 py-2 [&_.contain-inline-size]:[contain:initial]",
            !hasPrompt && "leading-none",
          )}
        >
          {hasPrompt ? (
            <UserFormattedText text={displayPromptRequest} cwd={null} />
          ) : (
            <div className="text-size-chat mb-px text-token-description-foreground">
              <FormattedMessage
                id="codex.userMessage.noContent"
                defaultMessage="(No content)"
                description="Text for when a user message has no content"
              />
            </div>
          )}
        </div>
      ) : null}
      <div className="flex flex-row-reverse items-center gap-1">
        {referencesPriorConversation && (
          <MessageContext>
            <FormattedMessage
              id="codex.userMessage.priorConversation"
              defaultMessage="References prior conversation"
              description="Text for the prior conversation button"
            />
          </MessageContext>
        )}
        {reviewMode && (
          <MessageContext>
            <FormattedMessage
              id="codex.userMessage.reviewMode"
              defaultMessage="Review mode"
              description="Chip shown when a user asked for a code review"
            />
          </MessageContext>
        )}
        {pullRequestFixMode && (
          <MessageContext>
            <FormattedMessage
              id="codex.userMessage.pullRequestFixMode"
              defaultMessage="PR fix"
              description="Chip shown when a user started a pull request CI fix task"
            />
          </MessageContext>
        )}
        {autoResolveSync && (
          <MessageContext>
            <FormattedMessage
              id="codex.userMessage.autoResolveSync"
              defaultMessage="Auto resolve conflicts"
              description="Chip shown when the user requested auto resolve for handoff conflicts"
            />
          </MessageContext>
        )}
        {commentCount > 0 && (
          <MessageContext>
            <FormattedMessage
              id="codex.userMessage.commentCount"
              defaultMessage="{count, plural, one {# comment} other {# comments}}"
              description="Chip shown when the user included inline diff comments in the prompt"
              values={{ count: commentCount }}
            />
          </MessageContext>
        )}
        {pullRequestCheckCount > 0 && (
          <MessageContext>
            <FormattedMessage
              id="codex.userMessage.pullRequestCheckCount"
              defaultMessage="{count, plural, one {# CI test} other {# CI tests}}"
              description="Chip shown when the user included failing PR checks in the prompt"
              values={{ count: pullRequestCheckCount }}
            />
          </MessageContext>
        )}
        {hasPrompt && !isEditing && (
          <div
            className={clsx(
              "mr-1 ms-1 flex items-start gap-0.5 transition-opacity",
              alwaysShowActions
                ? undefined
                : "opacity-0 group-hover:opacity-100",
            )}
          >
            {recentlyCopied ? (
              <Tooltip
                tooltipContent={
                  <FormattedMessage
                    id="codex.userMessage.copiedTooltip"
                    defaultMessage="Copied"
                    description="Tooltip on copy message icon button when copied"
                  />
                }
                disabled
              >
                <Button
                  color="ghost"
                  size="icon"
                  aria-label={intl.formatMessage({
                    id: "codex.userMessage.copiedAriaLabel",
                    defaultMessage: "Copied",
                    description:
                      "Aria label for the copy button after the content has been copied",
                  })}
                >
                  <CheckIcon className="icon-2xs" />
                </Button>
              </Tooltip>
            ) : (
              <Tooltip
                tooltipContent={
                  <FormattedMessage
                    id="codex.userMessage.copyTooltip"
                    defaultMessage="Copy"
                    description="Tooltip on copy message icon button"
                  />
                }
              >
                <Button
                  color="ghost"
                  size="icon"
                  aria-label={intl.formatMessage({
                    id: "codex.userMessage.copyAriaLabel",
                    defaultMessage: "Copy message",
                    description:
                      "Aria label for the button that copies the user's message",
                  })}
                  onClick={handleCopy}
                >
                  <CopyIcon className="icon-2xs" />
                </Button>
              </Tooltip>
            )}
            {canFork ? (
              <Tooltip
                tooltipContent={
                  <FormattedMessage
                    id="codex.userMessage.forkTooltip"
                    defaultMessage="Fork"
                    description="Tooltip on fork message icon button"
                  />
                }
              >
                <Button
                  color="ghost"
                  size="icon"
                  aria-label={intl.formatMessage({
                    id: "codex.userMessage.forkAriaLabel",
                    defaultMessage: "Fork from this message",
                    description:
                      "Aria label for the button that forks a conversation from this user message",
                  })}
                  onClick={handleFork}
                >
                  <BranchIcon className="icon-2xs" />
                </Button>
              </Tooltip>
            ) : null}
            {canEdit ? (
              <Tooltip
                tooltipContent={
                  <FormattedMessage
                    id="codex.userMessage.editTooltip"
                    defaultMessage="Edit"
                    description="Tooltip on edit message icon button"
                  />
                }
              >
                <Button
                  color="ghost"
                  size="icon"
                  aria-label={intl.formatMessage({
                    id: "codex.userMessage.editAriaLabel",
                    defaultMessage: "Edit message",
                    description:
                      "Aria label for the button that edits the previous user message",
                  })}
                  onClick={handleStartEdit}
                >
                  <PencilIcon className="icon-2xs" />
                </Button>
              </Tooltip>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function resizeEditTextarea(textarea: HTMLTextAreaElement): void {
  const lineHeight = Number.parseFloat(
    window.getComputedStyle(textarea).lineHeight,
  );
  if (!Number.isFinite(lineHeight)) {
    return;
  }

  const minHeight = lineHeight * EDIT_TEXTAREA_MIN_LINES;
  const maxHeight = lineHeight * EDIT_TEXTAREA_MAX_LINES;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(
    Math.max(textarea.scrollHeight, minHeight),
    maxHeight,
  )}px`;
  textarea.style.overflowY =
    textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}
