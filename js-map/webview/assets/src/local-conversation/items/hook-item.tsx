import clsx from "clsx";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import HooksIcon from "@/icons/hooks.svg";

import type { HookLocalConversationItem } from "./local-conversation-item";
import { TimelineItem } from "./timeline-item";

export function HookItem({
  item,
}: {
  item: HookLocalConversationItem;
}): React.ReactElement {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = formatHookSummary(intl, item);
  const status = item.run.status;

  return (
    <TimelineItem padding="offset">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={clsx(
            "group flex w-full min-w-0 items-center gap-1.5 text-left hover:text-token-foreground",
            "text-size-chat text-token-description-foreground transition-colors",
          )}
          aria-label={intl.formatMessage(
            {
              id: "localConversation.hookItem.summary.ariaLabel",
              defaultMessage: "{summary} {status}",
              description:
                "Accessible name for the collapsed hook summary button.",
            },
            {
              summary,
              status,
            },
          )}
          aria-expanded={isExpanded}
          onClick={() => {
            setIsExpanded((value) => !value);
          }}
        >
          <HooksIcon className="icon-sm flex-shrink-0" />
          <span className="min-w-0 flex-1 truncate">{summary}</span>
          <span className="ml-auto flex-shrink-0 pl-4 text-right">
            {status}
          </span>
        </button>
        {isExpanded ? (
          <div className="ml-5 flex flex-col gap-1">
            {item.run.entries.map((entry, index) => (
              <HookEntryRow key={`${item.id}-${index}`} entry={entry} />
            ))}
          </div>
        ) : null}
      </div>
    </TimelineItem>
  );
}

function HookRow({
  entryKind,
  label,
  value,
}: {
  entryKind?: HookLocalConversationItem["run"]["entries"][number]["kind"];
  label: string;
  value: string;
}): React.ReactElement {
  const rowText = `${label}: ${value}`;

  return (
    <p
      className="text-size-chat whitespace-pre-wrap text-token-description-foreground"
      data-hook-entry-kind={entryKind}
    >
      {rowText}
    </p>
  );
}

function HookEntryRow({
  entry,
}: {
  entry: HookLocalConversationItem["run"]["entries"][number];
}): React.ReactElement {
  const intl = useIntl();

  switch (entry.kind) {
    case "context":
      return (
        <details
          className="text-size-chat whitespace-pre-wrap text-token-description-foreground"
          data-hook-entry-kind="context"
        >
          <summary className="cursor-pointer">
            <FormattedMessage
              id="localConversation.hookItem.addedContext"
              defaultMessage="Added context"
              description="Summary label for hook-added context details."
            />
          </summary>
          <p className="mt-1 whitespace-pre-wrap">{entry.text}</p>
        </details>
      );
    case "warning":
      return (
        <HookRow
          entryKind="warning"
          label={intl.formatMessage({
            id: "localConversation.hookItem.systemMessage",
            defaultMessage: "system message",
            description: "Label shown for warning entries emitted by hooks.",
          })}
          value={entry.text}
        />
      );
    case "stop":
      return (
        <HookRow
          entryKind="stop"
          label={intl.formatMessage({
            id: "localConversation.hookItem.stop",
            defaultMessage: "stop",
            description: "Label shown for stop entries emitted by hooks.",
          })}
          value={entry.text}
        />
      );
    case "feedback":
      return (
        <HookRow
          entryKind="feedback"
          label={intl.formatMessage({
            id: "localConversation.hookItem.feedback",
            defaultMessage: "feedback",
            description: "Label shown for feedback entries emitted by hooks.",
          })}
          value={entry.text}
        />
      );
    case "error":
      return (
        <HookRow
          entryKind="error"
          label={intl.formatMessage({
            id: "localConversation.hookItem.error",
            defaultMessage: "error",
            description: "Label shown for error entries emitted by hooks.",
          })}
          value={entry.text}
        />
      );
  }
}

function formatHookEventName(
  intl: ReturnType<typeof useIntl>,
  item: HookLocalConversationItem,
): string {
  switch (item.run.eventName) {
    case "preToolUse":
      return intl.formatMessage({
        id: "localConversation.hookItem.eventName.preToolUse",
        defaultMessage: "PreToolUse",
        description: "Collapsed label shown for PreToolUse hook items.",
      });
    case "postToolUse":
      return intl.formatMessage({
        id: "localConversation.hookItem.eventName.postToolUse",
        defaultMessage: "PostToolUse",
        description: "Collapsed label shown for PostToolUse hook items.",
      });
    case "sessionStart":
      return intl.formatMessage({
        id: "localConversation.hookItem.eventName.sessionStart",
        defaultMessage: "SessionStart",
        description: "Collapsed label shown for SessionStart hook items.",
      });
    case "userPromptSubmit":
      return intl.formatMessage({
        id: "localConversation.hookItem.eventName.userPromptSubmit",
        defaultMessage: "UserPromptSubmit",
        description: "Collapsed label shown for UserPromptSubmit hook items.",
      });
    case "stop":
      return intl.formatMessage({
        id: "localConversation.hookItem.eventName.stop",
        defaultMessage: "Stop",
        description: "Collapsed label shown for Stop hook items.",
      });
  }
}

function formatHookSummary(
  intl: ReturnType<typeof useIntl>,
  item: HookLocalConversationItem,
): string {
  const eventName = formatHookEventName(intl, item);
  const statusMessage = item.run.statusMessage?.trim();
  if (statusMessage == null || statusMessage.length === 0) {
    return eventName;
  }

  return intl.formatMessage(
    {
      id: "localConversation.hookItem.summary.withStatusMessage",
      defaultMessage: "{eventName} - {statusMessage}",
      description:
        "Collapsed hook summary that includes the exact event name and hook status message.",
    },
    {
      eventName,
      statusMessage,
    },
  );
}
