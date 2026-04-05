import { useIntl } from "react-intl";

import { useProvideSlashCommand } from "@/composer/slash-commands/slash-command";
import ChatReplyPlusIcon from "@/icons/chat-reply-plus.svg";
import { messageBus } from "@/message-bus";

async function openHotkeyWindowHome(): Promise<void> {
  messageBus.dispatchMessage("hotkey-window-collapse-to-home", {});
}

export function HotkeyWindowNewSlashCommand(): React.ReactElement | null {
  const intl = useIntl();

  useProvideSlashCommand({
    id: "hotkey-window-new",
    title: intl.formatMessage({
      id: "composer.hotkeyWindowNewSlashCommand.title",
      defaultMessage: "New",
      description: "Title for the hotkey-window new slash command",
    }),
    description: intl.formatMessage({
      id: "composer.hotkeyWindowNewSlashCommand.description",
      defaultMessage: "Return to the Popout Window home",
      description: "Description for the hotkey-window new slash command",
    }),
    requiresEmptyComposer: true,
    Icon: ChatReplyPlusIcon,
    onSelect: openHotkeyWindowHome,
  });

  return null;
}
