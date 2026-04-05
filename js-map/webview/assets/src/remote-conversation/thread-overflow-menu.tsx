import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import ArchiveIcon from "@/icons/archive.svg";
import CopyIcon from "@/icons/copy.svg";
import EditIcon from "@/icons/edit.svg";
import PinFilledIcon from "@/icons/pin-filled.svg";
import PinIcon from "@/icons/pin.svg";
import ThreeDotsIcon from "@/icons/three-dots.svg";
import { getMenuShortcutLabel } from "@/keyboard-shortcuts/electron-menu-shortcuts";
import {
  copyAppLink,
  copySessionId,
  threadActionMessages,
  usePinnedThread,
} from "@/local-conversation/thread-actions";
import { useMessage } from "@/message-bus";
import {
  pinMessageDescriptor,
  unpinMessageDescriptor,
} from "@/sidebar/pin-indicator";

export function RemoteThreadOverflowMenu({
  conversationId,
}: {
  conversationId: string | null;
}): React.ReactElement | null {
  const intl = useIntl();
  const { isPinned, togglePin } = usePinnedThread(conversationId);
  const toggleThreadPinShortcut = getMenuShortcutLabel("toggleThreadPin");
  const copySessionIdShortcut = getMenuShortcutLabel("copySessionId");
  const pinLabel = isPinned ? unpinMessageDescriptor : pinMessageDescriptor;
  const pinIcon = isPinned ? PinFilledIcon : PinIcon;
  const moreLabel = intl.formatMessage(threadActionMessages.moreActions);

  useMessage("toggle-thread-pin", togglePin, [togglePin]);
  useMessage(
    "copy-session-id",
    () => {
      if (!conversationId) {
        return;
      }
      copySessionId(conversationId);
    },
    [conversationId],
  );
  useMessage(
    "copy-deeplink",
    () => {
      if (!conversationId) {
        return;
      }
      copyAppLink(conversationId);
    },
    [conversationId],
  );

  if (!conversationId) {
    return null;
  }

  return (
    <BasicDropdown
      triggerButton={
        <Button
          size="icon"
          color="ghost"
          className="no-drag"
          aria-label={moreLabel}
        >
          <ThreeDotsIcon className="icon-sm" />
        </Button>
      }
      align="start"
      contentWidth="menu"
    >
      <Dropdown.Item
        onSelect={togglePin}
        LeftIcon={pinIcon}
        keyboardShortcut={toggleThreadPinShortcut}
      >
        <FormattedMessage {...pinLabel} />
      </Dropdown.Item>
      <Dropdown.Item disabled LeftIcon={EditIcon}>
        <FormattedMessage {...threadActionMessages.renameThread} />
      </Dropdown.Item>
      <Dropdown.Item disabled LeftIcon={ArchiveIcon}>
        <FormattedMessage {...threadActionMessages.archiveThread} />
      </Dropdown.Item>
      <Dropdown.Separator />
      <Dropdown.Item
        onSelect={() => copySessionId(conversationId)}
        LeftIcon={CopyIcon}
        keyboardShortcut={copySessionIdShortcut}
      >
        <FormattedMessage {...threadActionMessages.copySessionId} />
      </Dropdown.Item>
    </BasicDropdown>
  );
}
