import type { MouseEvent, ReactElement } from "react";
import { useCallback } from "react";
import { FormattedMessage, defineMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import { useStartNewConversation } from "@/hooks/use-start-new-conversation";
import Compose from "@/icons/compose.svg";
import { getMenuShortcutLabel } from "@/keyboard-shortcuts/electron-menu-shortcuts";

const newChatMessage = defineMessage({
  id: "localConversationPage.newChat",
  defaultMessage: "New chat",
  description: "Label for starting a new chat",
});

export function NewChatButton(): ReactElement {
  const startNewChat = useStartNewConversation();
  const intl = useIntl();

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (!event.defaultPrevented) {
        startNewChat();
      }
    },
    [startNewChat],
  );

  return (
    <Tooltip
      tooltipContent={<FormattedMessage {...newChatMessage} />}
      shortcut={getMenuShortcutLabel("newThread")}
    >
      <Button
        color="ghost"
        size="icon"
        onClick={handleClick}
        aria-label={intl.formatMessage(newChatMessage)}
      >
        <Compose className="icon-xs" />
      </Button>
    </Tooltip>
  );
}
