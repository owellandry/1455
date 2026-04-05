import type { ConversationId } from "protocol";
import type React from "react";
import { FormattedMessage } from "react-intl";

import { FindingCard } from "@/code-review-finding-card";

import type {
  AssistantMessageLocalConversationItem,
  CodeReviewStructuredOutput,
} from "./local-conversation-item";

export function CodeReviewAssistantMessage({
  item,
  conversationId,
}: {
  item: AssistantMessageLocalConversationItem<CodeReviewStructuredOutput>;
  conversationId: ConversationId;
}): React.ReactElement | null {
  const structuredOutput = item.structuredOutput;
  const findings = structuredOutput?.findings ?? [];

  const content =
    findings.length > 0 ? (
      <div className="flex flex-col gap-2">
        {findings.map((finding, index): React.ReactElement => {
          const key = `${finding.title}-${index}`;
          return (
            <FindingCard
              key={key}
              finding={finding}
              conversationId={conversationId}
            />
          );
        })}
      </div>
    ) : item.completed ? (
      <div className="text-size-chat rounded-2xl border border-token-border bg-token-input-background px-3 py-3 text-token-foreground">
        <FormattedMessage
          id="codeReviewAssistant.noFindings"
          defaultMessage="No findings were reported."
          description="Displayed when the code review output has no findings"
        />
      </div>
    ) : null;

  return <div className="py-1.5">{content}</div>;
}
