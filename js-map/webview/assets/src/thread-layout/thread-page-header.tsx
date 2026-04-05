import type { HostConfig } from "protocol";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { AppServerConnectionStateTooltip } from "@/app-server/app-server-connection-state";
import { AppHeader } from "@/components/app/app-header";
import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import DiffIcon from "@/icons/diff.svg";
import TerminalIcon from "@/icons/terminal.svg";
import { getMenuShortcutLabel } from "@/keyboard-shortcuts/electron-menu-shortcuts";

import {
  CloudThreadEnvIcon,
  LocalThreadEnvIcon,
  RemoteThreadEnvIcon,
  type ThreadEnvironmentType,
  WorktreeThreadEnvIcon,
} from "./thread-env-icon";

const panelToggleMessages = defineMessages({
  bottom: {
    id: "threadPage.toggleTerminal",
    defaultMessage: "Toggle terminal",
    description: "Toggles the terminal panel visibility",
  },
  right: {
    id: "threadPage.toggleDiffPanel",
    defaultMessage: "Toggle diff panel",
    description: "Toggles the diff panel visibility",
  },
});

const PANEL_TOGGLE_CONFIG = {
  bottom: {
    message: panelToggleMessages.bottom,
    Icon: TerminalIcon,
    shortcutId: "toggleTerminal",
  },
  right: {
    message: panelToggleMessages.right,
    Icon: DiffIcon,
    shortcutId: "toggleDiffPanel",
  },
} as const;

/** Thread toolbar  */
export function ThreadPageHeader({
  start,
  startActions,
  env,
  secondary,
  trailing,
  endActions,
  panelToggles,
  hideDivider,
  hostConfig,
  hostTooltipText,
  showHost,
}: {
  start?: React.ReactNode;
  startActions?: React.ReactNode;
  env?: ThreadEnvironmentType | null;
  secondary?: React.ReactNode;
  trailing?: React.ReactNode;
  endActions?: React.ReactNode;
  hideDivider?: boolean;
  hostConfig?: HostConfig;
  hostTooltipText?: string | null;
  showHost?: boolean;
  panelToggles?: {
    bottom?: {
      isOpen: boolean;
      onToggle: () => void;
      disabled?: boolean;
      buttonContent?: React.ReactNode;
    };
    right?: {
      isOpen: boolean;
      onToggle: () => void;
      disabled?: boolean;
      buttonContent?: React.ReactNode;
    };
  };
}): React.ReactElement {
  const intl = useIntl();
  const isRemoteHost = hostConfig?.kind !== "local";
  const hostLabel =
    showHost && isRemoteHost ? (hostConfig?.display_name ?? null) : null;
  const panelButtons: Array<React.ReactElement> = [];
  if (panelToggles) {
    (
      Object.keys(PANEL_TOGGLE_CONFIG) as Array<
        keyof typeof PANEL_TOGGLE_CONFIG
      >
    ).forEach((side) => {
      const panelToggle = panelToggles[side];
      if (!panelToggle) {
        return;
      }
      const { message, Icon, shortcutId } = PANEL_TOGGLE_CONFIG[side];
      panelButtons.push(
        <div className="flex items-center gap-1" key={side}>
          <Tooltip
            tooltipContent={<FormattedMessage {...message} />}
            shortcut={getMenuShortcutLabel(shortcutId)}
            delayOpen
          >
            <Button
              size="toolbar"
              color={panelToggle.isOpen ? "secondary" : "ghost"}
              disabled={panelToggle.disabled}
              onClick={panelToggle.onToggle}
              aria-pressed={panelToggle.isOpen}
              aria-label={intl.formatMessage(message)}
            >
              <Icon className="icon-sm" />
              {panelToggle.buttonContent}
            </Button>
          </Tooltip>
        </div>,
      );
    });
  }

  const defaultHideDivider = panelToggles?.right
    ? !panelToggles.right.isOpen
    : false;
  const hasEndActions = endActions != null;
  const hasPanelActions = panelButtons.length > 0 || hasEndActions;
  const showPanelActionsDivider = trailing != null && hasPanelActions;

  return (
    <AppHeader hideDivider={hideDivider ?? defaultHideDivider}>
      <div className="draggable grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 electron:h-toolbar browser:h-toolbar extension:py-row-y">
        <div className="text-md flex min-w-0 items-center gap-2 truncate text-base electron:font-medium">
          {start ? (
            <div className="max-w-[320px] min-w-0 truncate">{start}</div>
          ) : null}
          {hostLabel ? (
            <div className="text-md flex max-w-[220px] min-w-0 items-center gap-1 truncate rounded-full bg-token-badge-background px-2 py-0.5 leading-none text-token-badge-foreground">
              <Tooltip
                tooltipContent={hostTooltipText}
                disabled={hostTooltipText == null}
              >
                <span className="no-drag truncate">{hostLabel}</span>
              </Tooltip>
              {hostConfig && (
                <AppServerConnectionStateTooltip hostId={hostConfig.id} />
              )}
            </div>
          ) : null}
          {env === "remote" ? (
            <RemoteThreadEnvIcon hostId={hostConfig!.id} />
          ) : env === "worktree" ? (
            <WorktreeThreadEnvIcon />
          ) : env === "cloud" ? (
            <CloudThreadEnvIcon />
          ) : env ? (
            <LocalThreadEnvIcon />
          ) : null}
          {secondary ? (
            <div className="flex min-w-0 truncate leading-[18px] font-normal text-token-description-foreground">
              {secondary}
            </div>
          ) : null}
          {startActions}
        </div>
        <div className="flex items-center justify-end gap-1.5">
          {trailing}
          {hasPanelActions ? (
            <div className="-mr-2 flex items-center gap-0.5">
              {showPanelActionsDivider ? (
                <div className="mx-2 h-[16px] w-px bg-token-border" />
              ) : null}
              {panelButtons}
              {endActions}
            </div>
          ) : null}
        </div>
      </div>
    </AppHeader>
  );
}
