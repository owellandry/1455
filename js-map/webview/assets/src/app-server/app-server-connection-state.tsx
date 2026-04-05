import clsx from "clsx";
import type { AppServerConnectionState } from "protocol";
import type { ComponentType, ReactElement } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { Badge } from "@/components/badge";
import { Tooltip } from "@/components/tooltip";
import AlertIcon from "@/icons/alert.svg";
import SpinnerIcon from "@/icons/spinner.svg";

import { useAppServerConnectionState } from "./use-app-server-connection-state";

const remoteConnectionStatusBadgeMessages = defineMessages({
  connecting: {
    id: "threadPage.remoteConnectionStatusBadge.connecting",
    defaultMessage: "Connecting",
    description: "Label shown when remote connection is in progress",
  },
  unauthed: {
    id: "threadPage.remoteConnectionStatusBadge.unauthed",
    defaultMessage: "Login required",
    description: "Label shown when remote connection needs authentication",
  },
  connected: {
    id: "threadPage.remoteConnectionStatusBadge.connected",
    defaultMessage: "Connected",
    description: "Label shown when remote connection is established",
  },
  disconnected: {
    id: "threadPage.remoteConnectionStatusBadge.disconnected",
    defaultMessage: "Disconnected",
    description: "Label shown when remote connection is unavailable",
  },
  error: {
    id: "threadPage.remoteConnectionStatusBadge.error",
    defaultMessage: "Error",
    description: "Label shown when remote connection is in error",
  },
});

const CONNECTION_MESSAGE_BY_STATE: Record<
  AppServerConnectionState | "error",
  (typeof remoteConnectionStatusBadgeMessages)[keyof typeof remoteConnectionStatusBadgeMessages]
> = {
  connecting: remoteConnectionStatusBadgeMessages.connecting,
  unauthed: remoteConnectionStatusBadgeMessages.unauthed,
  connected: remoteConnectionStatusBadgeMessages.connected,
  disconnected: remoteConnectionStatusBadgeMessages.disconnected,
  error: remoteConnectionStatusBadgeMessages.error,
};

const CONNECTION_ICON_BY_STATE: Record<
  AppServerConnectionState | "error",
  ComponentType<{ className?: string }> | null
> = {
  connecting: SpinnerIcon,
  unauthed: AlertIcon,
  connected: null,
  disconnected: null,
  error: AlertIcon,
};

const CONNECTION_STYLES_BY_STATE: Record<
  AppServerConnectionState | "error",
  {
    badgeClassName: string;
    dotClassName: string;
  }
> = {
  connecting: {
    badgeClassName: "!bg-yellow-400/15 !text-yellow-500 animate-pulse",
    dotClassName: "bg-yellow-400 animate-pulse",
  },
  unauthed: {
    badgeClassName: "!bg-yellow-400/15 !text-yellow-500",
    dotClassName: "bg-yellow-400",
  },
  connected: {
    badgeClassName: "!bg-green-500/15 !text-green-500",
    dotClassName: "bg-green-500",
  },
  disconnected: {
    badgeClassName: "!bg-gray-400/15 !text-gray-500",
    dotClassName: "bg-gray-400",
  },
  error: {
    badgeClassName: "!bg-red-500/15 !text-red-500",
    dotClassName: "bg-red-500",
  },
};

const DEFAULT_HIDDEN_STATES: ReadonlyArray<AppServerConnectionState | "error"> =
  [];

export function AppServerConnectionStateBadge({
  hostId,
  showIcon = true,
  onUnauthedClick,
  compact = false,
  hiddenStates = DEFAULT_HIDDEN_STATES,
}: {
  hostId: string;
  showIcon?: boolean;
  onUnauthedClick?: () => void;
  compact?: boolean;
  hiddenStates?: ReadonlyArray<AppServerConnectionState | "error">;
}): ReactElement | null {
  const { state, mostRecentErrorMessage } = useAppServerConnectionState(hostId);
  const inferredState = state ?? "disconnected";
  if (hiddenStates.includes(inferredState)) {
    return null;
  }
  const isUnauthedClickable =
    inferredState === "unauthed" && onUnauthedClick != null;
  const Icon = showIcon ? CONNECTION_ICON_BY_STATE[inferredState] : null;
  const badge = (
    <Badge
      className={clsx(
        compact
          ? "h-4 self-center justify-center rounded-full px-1 py-0 text-[10px] leading-none text-center"
          : "min-w-[4.5rem] self-center justify-center rounded-full px-2.5 py-0.5 text-sm text-center leading-none",
        CONNECTION_STYLES_BY_STATE[inferredState].badgeClassName,
      )}
    >
      <Tooltip
        tooltipContent={
          <code className="m-1 block max-w-120 cursor-text font-mono break-words whitespace-pre-wrap select-text">
            {mostRecentErrorMessage}
          </code>
        }
        disabled={state !== "error"}
        interactive={true}
      >
        <span
          className={clsx(
            "flex items-center",
            compact ? "h-full gap-0.5" : "h-4 gap-1",
          )}
        >
          {Icon ? <Icon className="icon-2xs shrink-0" /> : null}
          <FormattedMessage {...CONNECTION_MESSAGE_BY_STATE[inferredState]} />
        </span>
      </Tooltip>
    </Badge>
  );

  if (!isUnauthedClickable) {
    return badge;
  }

  return (
    <button
      type="button"
      className="inline-flex cursor-pointer rounded-full"
      onClick={onUnauthedClick}
    >
      {badge}
    </button>
  );
}

export function AppServerConnectionStateTooltip({
  hostId,
}: {
  hostId: string;
}): ReactElement | null {
  const intl = useIntl();
  const { state } = useAppServerConnectionState(hostId);
  if (state == null) {
    return null;
  }

  const connectionMessage = CONNECTION_MESSAGE_BY_STATE[state];
  const connectionLabel = intl.formatMessage(connectionMessage);

  return (
    <Tooltip tooltipContent={connectionLabel}>
      <span
        className="no-drag inline-flex self-center rounded-full p-1"
        aria-label={connectionLabel}
        role="img"
      >
        <span
          aria-hidden
          className={clsx(
            "block size-2 rounded-full",
            CONNECTION_STYLES_BY_STATE[state].dotClassName,
          )}
        />
      </span>
    </Tooltip>
  );
}
