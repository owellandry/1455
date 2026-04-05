import clsx from "clsx";
import type React from "react";
import { FormattedMessage } from "react-intl";

import { RemoteHostGlobeIcon } from "@/components/remote-host-globe-icon";
import { Tooltip } from "@/components/tooltip";
import CloudIcon from "@/icons/cloud.svg";
import MacbookIcon from "@/icons/macbook.svg";
import WorktreeIcon from "@/icons/worktree.svg";
import { useHostConfig } from "@/shared-objects/use-host-config";
import { useSharedObject } from "@/shared-objects/use-shared-object";

export type ThreadEnvironmentType = "local" | "worktree" | "cloud" | "remote";

/** Small environment glyph for thread headers. */
export function RemoteThreadEnvIcon({
  className,
  hostId,
}: {
  className?: string;
  hostId: string;
}): React.ReactElement {
  const hostConfig = useHostConfig(hostId);
  const [remoteConnectionsData] = useSharedObject("remote_connections");

  return (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          id="threadEnvIcon.remoteTooltip"
          defaultMessage="This conversation is running on {hostLabel}"
          description="Tooltip content for remote environment icon"
          values={{
            hostLabel: hostConfig.display_name,
          }}
        />
      }
    >
      <span className="inline-flex shrink-0">
        <RemoteHostGlobeIcon
          className={clsx("icon-2xs no-drag shrink-0", className)}
          hostId={hostId}
          hostIdsForColorAssignment={(remoteConnectionsData ?? []).map(
            (connection) => connection.hostId,
          )}
        />
      </span>
    </Tooltip>
  );
}

/** Small environment glyph for thread headers. */
export function RemoteWorktreeThreadEnvIcon({
  className,
  hostId,
}: {
  className?: string;
  hostId: string;
}): React.ReactElement {
  const hostConfig = useHostConfig(hostId);
  const [remoteConnectionsData] = useSharedObject("remote_connections");

  return (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          id="threadEnvIcon.remoteWorktreeTooltip"
          defaultMessage="This conversation is running in a git worktree on {hostLabel}."
          description="Tooltip content for remote worktree environment icon"
          values={{
            hostLabel: hostConfig.display_name,
          }}
        />
      }
    >
      <span className="inline-flex shrink-0 items-center gap-0.5">
        <WorktreeIcon
          className={clsx(
            "icon-2xs text-token-description-foreground no-drag shrink-0",
            className,
          )}
        />
        <RemoteHostGlobeIcon
          className={clsx("icon-2xs no-drag shrink-0", className)}
          hostId={hostId}
          hostIdsForColorAssignment={(remoteConnectionsData ?? []).map(
            (connection) => connection.hostId,
          )}
        />
      </span>
    </Tooltip>
  );
}

/** Small environment glyph for thread headers. */
export function WorktreeThreadEnvIcon({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          id="threadEnvIcon.worktreeTooltip"
          defaultMessage="This conversation is running in a local git worktree."
          description="Tooltip content for worktree environment icon"
        />
      }
    >
      <span className="inline-flex shrink-0">
        <WorktreeIcon
          className={clsx(
            "icon-2xs text-token-description-foreground no-drag shrink-0",
            className,
          )}
        />
      </span>
    </Tooltip>
  );
}

/** Small environment glyph for thread headers. */
export function CloudThreadEnvIcon({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          id="threadEnvIcon.cloudTooltip"
          defaultMessage="This conversation is running in Codex Cloud."
          description="Tooltip content for cloud environment icon"
        />
      }
    >
      <span className="inline-flex shrink-0">
        <CloudIcon
          className={clsx(
            "icon-2xs text-token-description-foreground no-drag shrink-0",
            className,
          )}
        />
      </span>
    </Tooltip>
  );
}

/** Small environment glyph for thread headers. */
export function LocalThreadEnvIcon({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          id="threadEnvIcon.localTooltip"
          defaultMessage="This conversation is running locally."
          description="Tooltip content for local environment icon"
        />
      }
    >
      <span className="inline-flex shrink-0">
        <MacbookIcon
          className={clsx(
            "icon-2xs text-token-description-foreground no-drag shrink-0",
            className,
          )}
        />
      </span>
    </Tooltip>
  );
}
