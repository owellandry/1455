import { useSignal } from "maitai";
import type { ReactElement, ReactNode } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { runCommand } from "@/commands/run-command";
import { Button } from "@/components/button";
import ArrowLeftIcon from "@/icons/arrow-left.svg";
import SidebarFloatingOpenIcon from "@/icons/sidebar-hidden.svg";
import SidebarFloatingClosedIcon from "@/icons/sidebar.svg";
import { getMenuShortcutLabel } from "@/keyboard-shortcuts/electron-menu-shortcuts";
import { canGoBack$, canGoForward$ } from "@/navigation-history-signal";

import { Tooltip } from "../tooltip";
import { appShellSidebarOpen$ } from "./app-shell-state";

/**
 * Header controls for back/forward navigation plus the sidebar toggle.
 */
export function SidebarTrigger(): ReactElement | null {
  const intl = useIntl();
  const isSidebarOpen = useSignal(appShellSidebarOpen$);
  const canGoBack = useSignal(canGoBack$);
  const canGoForward = useSignal(canGoForward$);
  const label = isSidebarOpen
    ? intl.formatMessage({
        id: "app.sidebar.hide",
        defaultMessage: "Hide sidebar",
        description: "Accessible label to collapse the sidebar chrome",
      })
    : intl.formatMessage({
        id: "app.sidebar.show",
        defaultMessage: "Show sidebar",
        description: "Accessible label to expand the sidebar chrome",
      });
  const Icon = isSidebarOpen
    ? SidebarFloatingOpenIcon
    : SidebarFloatingClosedIcon;

  return (
    <div className="flex items-center gap-1 pl-3">
      <HeaderCommandButton
        ariaLabel={label}
        shortcut={getMenuShortcutLabel("toggleSidebar")}
        tooltipContent={
          <FormattedMessage
            id="app.sidebar.tooltip"
            defaultMessage="Toggle sidebar"
            description="Tooltip for the sidebar trigger button"
          />
        }
        viewTransitionName="sidebar-trigger"
        onClick={(): void => runCommand("toggleSidebar")}
      >
        <Icon className="icon-xs" />
      </HeaderCommandButton>
      <HeaderCommandButton
        ariaLabel={intl.formatMessage(messages.navigateBack)}
        disabled={!canGoBack}
        shortcut={getMenuShortcutLabel("navigateBack")}
        tooltipContent={<FormattedMessage {...messages.navigateBack} />}
        onClick={(): void => runCommand("navigateBack")}
      >
        <ArrowLeftIcon className="icon-xs" />
      </HeaderCommandButton>
      <HeaderCommandButton
        ariaLabel={intl.formatMessage(messages.navigateForward)}
        disabled={!canGoForward}
        shortcut={getMenuShortcutLabel("navigateForward")}
        tooltipContent={<FormattedMessage {...messages.navigateForward} />}
        onClick={(): void => runCommand("navigateForward")}
      >
        <ArrowLeftIcon className="icon-xs -scale-x-100" />
      </HeaderCommandButton>
    </div>
  );
}

function HeaderCommandButton({
  ariaLabel,
  children,
  disabled = false,
  onClick,
  shortcut,
  tooltipContent,
  viewTransitionName,
}: {
  ariaLabel: string;
  children: ReactElement;
  disabled?: boolean;
  onClick: () => void;
  shortcut: string | null;
  tooltipContent: ReactNode;
  viewTransitionName?: string;
}): ReactElement {
  return (
    <Tooltip tooltipContent={tooltipContent} shortcut={shortcut}>
      <Button
        aria-label={ariaLabel}
        color="ghost"
        disabled={disabled}
        style={viewTransitionName == null ? undefined : { viewTransitionName }}
        size="toolbar"
        uniform
        title={ariaLabel}
        onClick={onClick}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

const messages = defineMessages({
  navigateBack: {
    id: "codex.command.navigateBack",
    defaultMessage: "Back",
    description: "Command menu item to navigate back",
  },
  navigateForward: {
    id: "codex.command.navigateForward",
    defaultMessage: "Forward",
    description: "Command menu item to navigate forward",
  },
});
