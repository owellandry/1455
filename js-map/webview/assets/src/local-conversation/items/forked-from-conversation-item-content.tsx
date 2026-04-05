import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { FileAttachment } from "@/composer/attachments/file-attachment";
import { isHotkeyWindowContextFromWindow } from "@/hotkey-window/is-hotkey-window-context";
import ChatIcon from "@/icons/chat.svg";

export function ForkedFromConversationItemContent({
  sourceConversationId,
  kind = "thread-fork",
}: {
  sourceConversationId: string;
  kind?: "thread-fork" | "parent-context";
}): React.ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const sourceConversationPath = isHotkeyWindowContextFromWindow()
    ? `/hotkey-window/thread/${sourceConversationId}`
    : `/local/${sourceConversationId}`;

  if (kind === "parent-context") {
    return (
      <FileAttachment
        filename={intl.formatMessage({
          id: "localConversation.parentThread",
          defaultMessage: "Parent thread",
          description:
            "Attachment label shown above the first message in a forked subagent thread. Clicking it navigates to the parent thread.",
        })}
        Icon={ChatIcon}
        onClick={() => {
          void navigate(sourceConversationPath);
        }}
      />
    );
  }

  return (
    <div className="text-size-chat my-2 flex items-center gap-2 text-token-text-secondary">
      <div className="flex-1 border-t border-current/20" />
      <div className="flex max-w-[70%] min-w-0 items-center gap-1 whitespace-nowrap">
        <ChatIcon className="icon-2xs shrink-0" />
        <button
          type="button"
          className="max-w-64 min-w-0 truncate text-left align-bottom text-token-link hover:underline"
          onClick={() => {
            void navigate(sourceConversationPath);
          }}
        >
          <FormattedMessage
            id="localConversation.forkedFromConversation"
            defaultMessage="Forked from conversation"
            description="Divider shown when the conversation was forked from another thread."
          />
        </button>
      </div>
      <div className="flex-1 border-t border-current/20" />
    </div>
  );
}
