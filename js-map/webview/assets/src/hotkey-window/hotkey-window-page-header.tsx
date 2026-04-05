import type React from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { useWindowControlsSafeArea } from "@/components/app/use-window-controls-safe-area";
import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import ComposeIcon from "@/icons/compose.svg";
import PopInMacIcon from "@/icons/pop-in-mac.svg";
import XIcon from "@/icons/x.svg";
import { messageBus } from "@/message-bus";

const messages = defineMessages({
  dismiss: {
    id: "miniWindow.dismiss",
    defaultMessage: "Dismiss Popout Window",
    description: "Tooltip label for dismissing a mini window",
  },
  newThread: {
    id: "hotkeyWindow.threadPage.newButton",
    defaultMessage: "Start New Thread",
    description:
      "Tooltip label for the hotkey window header button that returns to hotkey window home",
  },
  openInMainWindow: {
    id: "hotkeyWindow.threadPage.openInMainWindow",
    defaultMessage: "Open in Main Window",
    description:
      "Tooltip label for the hotkey window header button that opens the current page in the main app window",
  },
});

export function MiniWindowPageHeader({
  title,
  onDismiss,
  showDismissButton = true,
  reserveWindowControlsSafeArea = false,
  rightActions,
}: {
  title: React.ReactNode;
  onDismiss?: () => void;
  showDismissButton?: boolean;
  reserveWindowControlsSafeArea?: boolean;
  rightActions?: React.ReactNode;
}): React.ReactElement {
  const intl = useIntl();
  const safeArea = useWindowControlsSafeArea();
  const leftSafeInset = reserveWindowControlsSafeArea ? safeArea.left : 0;
  const rightSafeInset = reserveWindowControlsSafeArea ? safeArea.right : 0;
  const leftActionInset = leftSafeInset + 12;
  const rightActionInset = rightSafeInset + 12;
  const titleLeftInset = leftActionInset + (showDismissButton ? 52 : 0);
  const titleRightInset = rightActionInset + 84;

  return (
    <div className="draggable relative flex h-toolbar-sm items-center justify-center px-3">
      <div
        className="absolute inset-y-0 flex items-center justify-center text-base font-medium text-token-foreground/60 select-none"
        style={{
          left: titleLeftInset,
          right: titleRightInset,
        }}
      >
        {title}
      </div>
      {showDismissButton ? (
        <div
          className="absolute flex items-center gap-0"
          style={{ left: leftActionInset }}
        >
          <Tooltip
            tooltipContent={<FormattedMessage {...messages.dismiss} />}
            delayOpen
          >
            <Button
              size="toolbar"
              color="ghost"
              aria-label={intl.formatMessage(messages.dismiss)}
              onClick={onDismiss}
            >
              <XIcon className="icon-sm" />
            </Button>
          </Tooltip>
        </div>
      ) : null}
      <div
        className="absolute flex items-center gap-0"
        style={{ right: rightActionInset }}
      >
        {rightActions}
      </div>
    </div>
  );
}

export function HotkeyWindowPageHeader({
  title,
  mainWindowPath,
  canCollapseToHome = true,
}: {
  title: React.ReactNode;
  mainWindowPath: string;
  canCollapseToHome?: boolean;
}): React.ReactElement {
  const intl = useIntl();

  return (
    <MiniWindowPageHeader
      title={title}
      onDismiss={() => {
        messageBus.dispatchMessage("hotkey-window-dismiss", {});
      }}
      rightActions={
        <>
          {canCollapseToHome ? (
            <Tooltip
              tooltipContent={<FormattedMessage {...messages.newThread} />}
              delayOpen
            >
              <Button
                size="toolbar"
                color="ghost"
                aria-label={intl.formatMessage(messages.newThread)}
                onClick={() => {
                  messageBus.dispatchMessage(
                    "hotkey-window-collapse-to-home",
                    {},
                  );
                }}
              >
                <ComposeIcon className="icon-sm" />
              </Button>
            </Tooltip>
          ) : null}
          <Tooltip
            tooltipContent={<FormattedMessage {...messages.openInMainWindow} />}
            delayOpen
          >
            <Button
              size="toolbar"
              color="ghost"
              aria-label={intl.formatMessage(messages.openInMainWindow)}
              onClick={() => {
                messageBus.dispatchMessage("open-in-main-window", {
                  path: mainWindowPath,
                });
              }}
            >
              <PopInMacIcon className="icon-sm" />
            </Button>
          </Tooltip>
        </>
      }
    />
  );
}
