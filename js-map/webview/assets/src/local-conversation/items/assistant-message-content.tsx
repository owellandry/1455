import type { ConversationId, GitCwd } from "protocol";

import { CopyButton } from "@/components/copy-button";
import { Markdown } from "@/components/markdown";
import { useGate } from "@/statsig/statsig";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

import type { LocalConversationItem } from "./local-conversation-item";

export function AssistantMessageContent({
  item,
  assistantCopyText,
  conversationId,
  cwd,
}: {
  item: Extract<LocalConversationItem, { type: "assistant-message" }>;
  assistantCopyText?: string;
  conversationId: ConversationId;
  cwd: GitCwd | null;
}): React.ReactElement {
  const enableFileCitationMarkers = useGate(
    __statsigName("codex-app-artifacts-pane"),
  );
  const copyText = assistantCopyText ?? "";
  const canCopy = item.completed && copyText.trim().length > 0;

  return (
    <div className="group flex min-w-0 flex-col">
      <Markdown
        className="[&>*:last-child]:mb-0 [&>ol:first-child]:mt-0 [&>ul:first-child]:mt-0"
        textSize="text-size-chat leading-relaxed extension:leading-normal"
        conversationId={conversationId}
        fadeType={item.completed ? "none" : "indexed"}
        cwd={cwd}
        allowWideBlocks
        enableFileCitationMarkers={enableFileCitationMarkers}
      >
        {item.content}
      </Markdown>
      {canCopy ? (
        <div className="mt-3 flex h-5 items-center justify-start">
          <CopyButton
            iconOnly
            iconClassName="icon-2xs"
            className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            onCopy={(event) => {
              void copyToClipboard(copyText, event);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
