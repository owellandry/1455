import clsx from "clsx";
import { electronTopLevelMenuIds, type ElectronTopLevelMenuId } from "protocol";
import { type MouseEvent, type ReactElement, useRef, useState } from "react";
import {
  type MessageDescriptor,
  defineMessages,
  FormattedMessage,
  useIntl,
} from "react-intl";

import { useWindowsMenuBarEnabled } from "./use-windows-menu-bar-enabled";

type MenuBarItem = {
  id: ElectronTopLevelMenuId;
  message: MessageDescriptor;
};

const menuMessages = defineMessages({
  file: {
    id: "windowsMenuBar.file",
    defaultMessage: "File",
    description: "Label for the File menu in the Windows custom title bar",
  },
  edit: {
    id: "windowsMenuBar.edit",
    defaultMessage: "Edit",
    description: "Label for the Edit menu in the Windows custom title bar",
  },
  view: {
    id: "windowsMenuBar.view",
    defaultMessage: "View",
    description: "Label for the View menu in the Windows custom title bar",
  },
  window: {
    id: "windowsMenuBar.window",
    defaultMessage: "Window",
    description: "Label for the Window menu in the Windows custom title bar",
  },
  help: {
    id: "windowsMenuBar.help",
    defaultMessage: "Help",
    description: "Label for the Help menu in the Windows custom title bar",
  },
});

const MENU_BAR_ITEMS: Array<MenuBarItem> = [
  { id: electronTopLevelMenuIds.file, message: menuMessages.file },
  { id: electronTopLevelMenuIds.edit, message: menuMessages.edit },
  { id: electronTopLevelMenuIds.view, message: menuMessages.view },
  { id: electronTopLevelMenuIds.window, message: menuMessages.window },
  { id: electronTopLevelMenuIds.help, message: menuMessages.help },
];

export function WindowsMenuBar(): ReactElement | null {
  const intl = useIntl();
  const isWindowsMenuBarEnabled = useWindowsMenuBarEnabled();
  const [openMenuId, setOpenMenuId] = useState<ElectronTopLevelMenuId | null>(
    null,
  );
  const openMenuRequestId = useRef(0);

  if (!isWindowsMenuBarEnabled) {
    return null;
  }

  const handleOpenMenu = async (
    menuId: ElectronTopLevelMenuId,
    event: MouseEvent<HTMLButtonElement>,
  ): Promise<void> => {
    const showApplicationMenu = window.electronBridge?.showApplicationMenu;
    if (!showApplicationMenu) {
      return;
    }

    const requestId = openMenuRequestId.current + 1;
    openMenuRequestId.current = requestId;
    setOpenMenuId(menuId);
    const targetRect = event.currentTarget.getBoundingClientRect();

    try {
      await showApplicationMenu(
        menuId,
        Math.round(targetRect.left),
        Math.round(targetRect.bottom),
      );
    } finally {
      if (openMenuRequestId.current === requestId) {
        setOpenMenuId(null);
      }
    }
  };

  return (
    <div className="flex items-center gap-0.5 pr-2 pl-1">
      {MENU_BAR_ITEMS.map(({ id, message }) => (
        <button
          type="button"
          key={id}
          aria-expanded={openMenuId === id}
          aria-haspopup="menu"
          aria-label={intl.formatMessage(message)}
          className={clsx(
            "no-drag rounded-md border border-transparent px-2.5 py-1 text-[13px] font-normal leading-none outline-none transition-colors",
            openMenuId === id
              ? "bg-[var(--color-token-menubar-selection-background)] text-[var(--color-token-menubar-selection-foreground)]"
              : "text-token-text-tertiary hover:bg-token-foreground/5 hover:text-token-description-foreground focus-visible:bg-token-foreground/5 focus-visible:text-token-description-foreground",
          )}
          onClick={(event): void => {
            void handleOpenMenu(id, event);
          }}
        >
          <FormattedMessage {...message} />
        </button>
      ))}
    </div>
  );
}
