import type { ConversationId, GitCwd } from "protocol";
import type React from "react";
import { FormattedMessage } from "react-intl";

import { Badge } from "@/components/badge";
import { Markdown } from "@/components/markdown";
import BellIcon from "@/icons/bell.svg";
import ClockIcon from "@/icons/clock.svg";

import type {
  AssistantMessageLocalConversationItem,
  HeartbeatStructuredOutput,
} from "./local-conversation-item";

export function HeartbeatAssistantMessage({
  item,
  conversationId,
  cwd,
}: {
  item: AssistantMessageLocalConversationItem<HeartbeatStructuredOutput>;
  conversationId: ConversationId;
  cwd: GitCwd | null;
}): React.ReactElement {
  const structuredOutput = item.structuredOutput;
  const isNotify = structuredOutput?.decision === "NOTIFY";
  const body =
    item.content.trim() || structuredOutput?.notificationMessage?.trim() || "";

  return (
    <div className="py-1.5">
      <div className="rounded-2xl border border-token-border bg-token-input-background px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-token-foreground/5 text-token-text-secondary">
            <ClockIcon className="icon-2xs" />
          </span>
          <div className="min-w-0 flex-1 text-sm font-medium text-token-foreground">
            <FormattedMessage
              id="localConversation.heartbeatAutomation.title"
              defaultMessage="Heartbeat"
              description="Title shown for the assistant message emitted by a heartbeat automation"
            />
          </div>
          <Badge
            className={
              isNotify
                ? "bg-token-status-success-background text-token-status-success-foreground gap-1"
                : "bg-token-foreground/5 text-token-text-secondary"
            }
          >
            {isNotify ? <BellIcon className="icon-2xs" /> : null}
            {isNotify ? (
              <FormattedMessage
                id="localConversation.heartbeatAutomation.notify"
                defaultMessage="Notify"
                description="Decision badge shown when a heartbeat automation wants to notify the user"
              />
            ) : (
              <FormattedMessage
                id="localConversation.heartbeatAutomation.quiet"
                defaultMessage="Quiet update"
                description="Decision badge shown when a heartbeat automation chooses not to notify the user"
              />
            )}
          </Badge>
        </div>
        {body.length > 0 ? (
          <Markdown
            className="[&>*:last-child]:mb-0 [&>ol:first-child]:mt-0 [&>ul:first-child]:mt-0"
            textSize="text-size-chat leading-relaxed extension:leading-normal"
            conversationId={conversationId}
            fadeType={item.completed ? "none" : "indexed"}
            cwd={cwd}
            allowWideBlocks
          >
            {body}
          </Markdown>
        ) : (
          <p className="text-size-chat text-token-text-secondary">
            <FormattedMessage
              id="localConversation.heartbeatAutomation.quietBody"
              defaultMessage="Heartbeat completed quietly."
              description="Fallback body for a heartbeat automation message with no visible prose"
            />
          </p>
        )}
      </div>
    </div>
  );
}
