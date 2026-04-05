import clsx from "clsx";
import {
  cloneElement,
  isValidElement,
  type KeyboardEvent,
  type MouseEvent,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  useState,
} from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import { Tooltip } from "@/components/tooltip";
import { TaskDiffStats } from "@/diff-stats";
import ArchiveIcon from "@/icons/archive.svg";
import InfoIcon from "@/icons/info.svg";
import {
  CloudThreadEnvIcon,
  RemoteThreadEnvIcon,
  RemoteWorktreeThreadEnvIcon,
  WorktreeThreadEnvIcon,
} from "@/thread-layout/thread-env-icon";
import { useResizeObserver } from "@/utils/use-resize-observer";

export type TaskRowStatusState =
  | { type: "idle"; unread?: boolean; loadingIndicator?: never }
  | {
      type: "loading";
      unread?: boolean;
      loadingIndicator?: "spinner";
    }
  | { type: "error"; unread?: boolean; loadingIndicator?: never };

export type TaskRowChipDescriptor = {
  id: string;
  label: ReactNode;
};

export type TaskRowIconBadgeDescriptor = {
  id: string;
  icon: ReactElement<{ className?: string }>;
  ariaLabel?: string;
  className?: string;
  onClick?: () => void;
  tooltipContent?: ReactNode;
};

export type TaskRowMetaState = "default" | "loading";

export type TaskRowDiffStats = {
  linesAdded: number;
  linesRemoved: number;
};

export type TaskRowEnvironmentType =
  | "worktree"
  | "local"
  | "localGrouped"
  | "cloud"
  | "remote"
  | "remote-worktree";

const BADGE_ICON_CLASS = "icon-2xs";

export function TaskRowTitleTooltipContent({
  children,
}: {
  children: ReactNode;
  titleText?: string | null;
  truncatedTooltipContent?: ReactNode;
  untruncatedTooltipContent?: ReactNode;
}): ReactElement {
  return <>{children}</>;
}

/**
 * Layout primitive for a recent task entry. Abstracts the structural markup so
 * feature components only provide semantic data (strings, icons, and metadata).
 */
export function TaskRowLayout({
  title,
  chips = [],
  iconBadges = [],
  diffStats,
  diffStyle = "color",
  metaContent,
  metaState = "default",
  isActive = false,
  onClick,
  onDoubleClick,
  onArchive,
  archiveAriaLabel,
  archiveConfirmLabel,
  statusState = { type: "idle" },
  envType,
  envTooltip,
  pulseEnvIcon,
  envIconLocation = "end",
  disabled = false,
  blurOnClick = false,
  indicatorLocation = "end",
  indicatorRestNode,
  indicatorHoverNode,
  onContextMenu,
  renderActions,
  metaHidden = false,
  indicatorSlotClassName,
  className,
  hostId,
}: {
  title: ReactNode;
  chips?: Array<TaskRowChipDescriptor>;
  iconBadges?: Array<TaskRowIconBadgeDescriptor>;
  diffStats?: TaskRowDiffStats | null;
  diffStyle?: "color" | "monochrome";
  metaContent?: ReactNode;
  metaState?: TaskRowMetaState;
  isActive?: boolean;
  onClick: () => void;
  onDoubleClick?: MouseEventHandler<HTMLDivElement>;
  onArchive?: (() => void) | null;
  archiveAriaLabel?: string;
  archiveConfirmLabel?: ReactNode;
  statusState: TaskRowStatusState;
  envType?: TaskRowEnvironmentType;
  envTooltip?: ReactNode;
  pulseEnvIcon?: boolean;
  envIconLocation?: "end" | "start" | "middle" | "none";
  disabled?: boolean;
  blurOnClick?: boolean;
  indicatorLocation?: "end" | "start" | "none";
  indicatorRestNode?: ReactNode;
  indicatorHoverNode?: ReactNode;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
  renderActions?: (options: {
    requestArchive: () => void;
    confirmArchive: () => void;
    confirmingArchive: boolean;
    canArchive: boolean;
  }) => ReactNode;
  metaHidden?: boolean;
  indicatorSlotClassName?: string;
  className?: string;
  hostId?: string;
}): ReactElement {
  const resolvedTitle = resolveTaskRowTitle(title);
  const { type: statusType, unread = false } = statusState;
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [titleTooltipContent, setTitleTooltipContent] =
    useState<ReactNode>(null);
  const observeTitleRef = useResizeObserver<HTMLSpanElement>(
    (_entry, element) => {
      setTitleTooltipContent(
        getTitleTooltipContent({
          element,
          title: resolvedTitle,
        }),
      );
    },
  );
  const setTitleRef = (node: HTMLSpanElement | null): void => {
    observeTitleRef(node);
    if (node != null) {
      setTitleTooltipContent(
        getTitleTooltipContent({
          element: node,
          title: resolvedTitle,
        }),
      );
    }
  };
  const canArchive = typeof onArchive === "function";
  const isConfirmingArchive = confirmingArchive && canArchive;
  const showArchiveButton = canArchive && !confirmingArchive;
  const hideRightSide = isConfirmingArchive;
  const showRightMeta = !hideRightSide;
  const shouldOffsetForArchiveAction =
    isConfirmingArchive && renderActions != null;
  const hideInlineBadges = confirmingArchive;

  // Metadata
  const statusIconNode =
    confirmingArchive || statusType !== "error" ? null : (
      <StatusIcon statusType={statusType} />
    );

  const metaNode = showRightMeta
    ? confirmingArchive && !renderActions
      ? null
      : (statusIconNode ??
        (metaContent != null ? (
          <MetaText content={metaContent} metaState={metaState} />
        ) : null))
    : null;

  // Hover actions
  const resolvedHoverNode =
    indicatorHoverNode ?? (statusType === "loading" ? indicatorRestNode : null);

  // Actions
  const requestArchive = (): void => {
    if (!canArchive) {
      return;
    }
    setConfirmingArchive(true);
  };
  const confirmArchive = (): void => {
    setConfirmingArchive(false);
    onArchive?.();
  };

  const archiveButton = (
    <ArchiveButton
      archiveAriaLabel={archiveAriaLabel}
      onArchive={requestArchive}
      showArchiveButton={showArchiveButton}
    />
  );
  // Status indicator
  const indicatorContent = confirmingArchive ? null : statusType ===
    "loading" ? (
    <IndicatorSpinner loadingIndicator={statusState.loadingIndicator} />
  ) : unread ? (
    <Indicator />
  ) : (
    indicatorRestNode
  );
  const indicatorNode = indicatorContent ? (
    <span
      className={clsx(
        indicatorLocation === "end" &&
          archiveButton &&
          "group-focus-within:opacity-0 group-hover:opacity-0",
      )}
    >
      {indicatorContent}
    </span>
  ) : null;

  // This is always positioned absolute to the right
  const actionsNode = renderActions
    ? renderActions({
        requestArchive,
        confirmArchive,
        confirmingArchive,
        canArchive,
      })
    : archiveButton;

  // Environment
  const envIconNode = (
    <EnvIcon
      className={pulseEnvIcon ? "animate-pulse" : undefined}
      envTooltip={envTooltip}
      envType={envType}
      hostId={hostId}
    />
  );

  // Indicator
  const indicatorSlot =
    indicatorLocation === "start" ? (
      <div className={clsx("w-4", indicatorSlotClassName)}>
        <div className="relative flex items-center justify-center">
          {indicatorNode ? (
            <span
              className={clsx(
                resolvedHoverNode &&
                  "group-focus-within:opacity-0 group-hover:opacity-0",
              )}
            >
              {indicatorNode}
            </span>
          ) : null}
          {resolvedHoverNode ? (
            <span
              className={clsx(
                "flex items-center justify-center opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-events-none group-focus-within:pointer-events-auto group-hover:pointer-events-auto",
                indicatorNode ? "absolute inset-0" : "relative",
              )}
            >
              {resolvedHoverNode}
            </span>
          ) : null}
        </div>
      </div>
    ) : null;

  // Task row action handlers
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (disabled) {
      return;
    }
    if (confirmingArchive) {
      return;
    }
    if (event.defaultPrevented) {
      return;
    }
    if (event.currentTarget !== event.target) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };
  const handleRowClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (disabled) {
      return;
    }
    if (confirmingArchive) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.defaultPrevented) {
      return;
    }
    onClick();
    if (blurOnClick) {
      event.currentTarget.blur();
    }
  };
  const handleRowDoubleClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (disabled) {
      return;
    }
    if (confirmingArchive) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.defaultPrevented) {
      return;
    }
    onDoubleClick?.(event);
  };

  const containerClassName = clsx(
    "group relative cursor-interaction rounded-lg px-row-x py-row-y hover:bg-token-list-hover-background focus-visible:outline-offset-[-2px] electron:h-[30px]",
    disabled && "pointer-events-none opacity-60",
    isActive && "bg-token-list-hover-background",
    className,
  );

  const renderArchiveConfirmation =
    confirmingArchive && canArchive && !renderActions;
  const useMinWidth =
    showRightMeta &&
    (metaNode ||
      (indicatorNode && indicatorLocation === "end") ||
      renderArchiveConfirmation);

  const rowNode = (
    <div
      className={containerClassName}
      onClick={handleRowClick}
      onDoubleClick={handleRowDoubleClick}
      onContextMenu={onContextMenu}
      onPointerLeave={() => setConfirmingArchive(false)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-current={isActive ? "page" : undefined}
    >
      {actionsNode}
      <div
        className={clsx(
          "flex w-full items-center gap-1.5 text-sm leading-4",
          shouldOffsetForArchiveAction && "pr-12",
        )}
      >
        {indicatorSlot}
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-0.5">
          {envIconLocation === "start" && envIconNode}
          <div className="flex flex-1 items-center gap-2 truncate text-base leading-5 text-token-foreground">
            <span
              key={resolvedTitle.titleText ?? undefined}
              ref={setTitleRef}
              className="truncate select-none"
              data-thread-title
              draggable={false}
            >
              {resolvedTitle.node}
            </span>
            {envIconLocation === "middle" && envIconNode}
          </div>
          <InlineBadgeNodes
            chips={chips}
            envIconNode={
              envIconLocation === "end" && !hideRightSide ? envIconNode : null
            }
            iconBadges={iconBadges}
            diffStats={hideInlineBadges ? null : diffStats}
            diffStyle={diffStyle}
            isActive={isActive}
          />
        </div>
        <div
          className={clsx(
            "flex items-stretch justify-end gap-1",
            // Adding a min width to account for difference in meta data length
            useMinWidth && "min-w-[24px]",
          )}
        >
          {renderArchiveConfirmation ? (
            <ConfirmArchiveButton
              label={archiveConfirmLabel}
              onConfirm={(event) => {
                event.stopPropagation();
                setConfirmingArchive(false);
                onArchive?.();
              }}
            />
          ) : hideRightSide ? null : (
            <>
              {metaNode && (
                <div
                  className={clsx(
                    (metaHidden || (renderActions && confirmingArchive)) &&
                      "invisible",
                  )}
                >
                  {metaNode}
                </div>
              )}
              {indicatorLocation === "end" && indicatorNode}
              {/*  Spacer if there is not meta data or indicator and we have to push content to the left for rendering hover state */}
              {!metaNode && !indicatorNode && (
                <span className="group-focus-within:w-5 group-hover:w-5"></span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Tooltip
      tooltipContent={titleTooltipContent}
      delayDuration={700}
      disabled={titleTooltipContent == null}
    >
      {rowNode}
    </Tooltip>
  );
}

function resolveTaskRowTitle(title: ReactNode): {
  node: ReactNode;
  titleText: string | null;
  truncatedTooltipContent?: ReactNode;
  untruncatedTooltipContent?: ReactNode;
} {
  if (
    isValidElement<React.ComponentProps<typeof TaskRowTitleTooltipContent>>(
      title,
    ) &&
    title.type === TaskRowTitleTooltipContent
  ) {
    return {
      node: title.props.children,
      titleText: title.props.titleText ?? null,
      truncatedTooltipContent: title.props.truncatedTooltipContent,
      untruncatedTooltipContent: title.props.untruncatedTooltipContent,
    };
  }

  return {
    node: title,
    titleText: typeof title === "string" ? title : null,
    truncatedTooltipContent: title,
  };
}

function getTitleTooltipContent({
  element,
  title,
}: {
  element: HTMLSpanElement;
  title: ReturnType<typeof resolveTaskRowTitle>;
}): ReactNode {
  if (element.scrollWidth > element.clientWidth) {
    return title.truncatedTooltipContent ?? title.node;
  }

  return title.untruncatedTooltipContent ?? null;
}

function InlineBadgeNodes({
  chips = [],
  envIconNode,
  iconBadges = [],
  diffStats,
  diffStyle = "color",
  isActive = false,
}: {
  chips?: Array<TaskRowChipDescriptor>;
  envIconNode?: ReactNode;
  iconBadges?: Array<TaskRowIconBadgeDescriptor>;
  diffStats?: TaskRowDiffStats | null;
  diffStyle?: "color" | "monochrome";
  isActive?: boolean;
}): ReactElement | null {
  const diffVariant =
    diffStyle === "monochrome"
      ? isActive
        ? "color"
        : "monochrome"
      : diffStyle;
  const diffStatsNode =
    diffStats &&
    (diffStats.linesAdded !== 0 || diffStats.linesRemoved !== 0) ? (
      <TaskDiffStats
        key="diff-stats"
        variant={diffVariant}
        linesAdded={diffStats.linesAdded}
        linesRemoved={diffStats.linesRemoved}
      />
    ) : null;
  const chipNodes = chips.flatMap(({ id, label }) =>
    label == null
      ? []
      : [
          <span
            key={id}
            className="inline-flex max-w-[150px] items-center truncate rounded-full bg-token-charts-green/20 py-0.5 pr-2.5 pl-2 text-sm text-token-charts-green"
          >
            {label}
          </span>,
        ],
  );
  const iconBadgeNodes = iconBadges.flatMap(
    ({ id, icon, ariaLabel, className, onClick, tooltipContent }) => {
      if (!isValidElement(icon)) {
        return [];
      }
      const iconNode = cloneElement(icon, {
        className: clsx(BADGE_ICON_CLASS, icon.props.className),
      });
      const badgeNode =
        onClick == null ? (
          cloneElement(iconNode, {
            key: id,
          })
        ) : (
          <button
            key={id}
            type="button"
            className={clsx(
              "focus-visible:outline-token-focus-ring flex shrink-0 items-center justify-center rounded-md text-token-description-foreground hover:text-token-foreground focus-visible:outline-2 focus-visible:outline-offset-2",
              className,
            )}
            aria-label={ariaLabel}
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
          >
            {iconNode}
          </button>
        );

      if (tooltipContent != null && tooltipContent !== "") {
        return [
          <Tooltip key={id} tooltipContent={tooltipContent}>
            <span className={clsx("flex shrink-0 items-center", className)}>
              {badgeNode}
            </span>
          </Tooltip>,
        ];
      }

      return [badgeNode];
    },
  );

  const textBadgeNodes: Array<ReactElement> = diffStatsNode
    ? [...chipNodes, diffStatsNode]
    : [...chipNodes];

  if (
    textBadgeNodes.length === 0 &&
    envIconNode == null &&
    iconBadgeNodes.length === 0
  ) {
    return null;
  }

  return (
    <div className="flex min-w-[24px] items-center justify-end gap-2">
      {textBadgeNodes.length > 0 ? (
        <div className="flex items-center gap-1">{textBadgeNodes}</div>
      ) : null}
      {envIconNode != null || iconBadgeNodes.length > 0 ? (
        <div className="flex items-center gap-1.5">
          {envIconNode}
          {iconBadgeNodes}
        </div>
      ) : null}
    </div>
  );
}

function Indicator(): ReactElement {
  return (
    <div className="relative flex w-5 shrink-0 items-center justify-center text-token-description-foreground">
      <span className="icon-xs relative scale-50">
        <span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: "var(--vscode-textLink-foreground)" }}
        />
      </span>
    </div>
  );
}

function IndicatorSpinner({
  loadingIndicator: _loadingIndicator = "spinner",
}: {
  loadingIndicator?: "spinner";
}): ReactElement {
  return (
    <div className="relative flex w-5 shrink-0 items-center justify-center text-token-foreground/70">
      <Spinner className="icon-xs shrink-0" animationDurationMs={2000} />
    </div>
  );
}

function StatusIcon({
  statusType,
}: {
  statusType: TaskRowStatusState["type"];
}): ReactElement | null {
  if (statusType !== "error") {
    return null;
  }

  return (
    <div className="relative flex w-5 shrink-0 items-center justify-center text-token-description-foreground group-focus-within:opacity-0 group-hover:opacity-0">
      <InfoIcon className="icon-xs shrink-0 text-token-error-foreground" />
    </div>
  );
}

function MetaText({
  content,
  metaState,
}: {
  content: ReactNode;
  metaState: TaskRowMetaState;
}): ReactElement | null {
  if (content == null) {
    return null;
  }

  return (
    <div
      className={clsx(
        "text-token-description-foreground text-sm leading-4 empty:hidden tabular-nums",
        metaState === "loading"
          ? "loading-shimmer-pure-text min-w-[72px]"
          : "truncate",
        "text-right",
        "group-focus-within:opacity-0 group-hover:opacity-0",
      )}
    >
      {content}
    </div>
  );
}

function ConfirmArchiveButton({
  label,
  onConfirm,
}: {
  label?: ReactNode;
  onConfirm: MouseEventHandler<HTMLButtonElement>;
}): ReactElement {
  return (
    <Button
      size="composerSm"
      color="danger"
      className="!h-auto !border-none !py-0"
      onClick={onConfirm}
    >
      {label ?? (
        <FormattedMessage
          id="codex.taskRowLayout.confirm"
          defaultMessage="Confirm"
          description="Confirmation button for archiving a task"
        />
      )}
    </Button>
  );
}

function ArchiveButton({
  showArchiveButton,
  onArchive,
  archiveAriaLabel,
}: {
  showArchiveButton: boolean;
  onArchive: (() => void) | null | undefined;
  archiveAriaLabel?: string;
}): ReactElement | null {
  if (!showArchiveButton) {
    return null;
  }

  return (
    <div className="absolute top-0 right-[var(--padding-row-x)] z-10 flex h-full items-center justify-center">
      <button
        type="button"
        className="focus-visible:outline-token-focus-ring icon-sm pointer-events-none flex items-center justify-center rounded-md opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-50 hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={(event) => {
          event.stopPropagation();
          onArchive?.();
        }}
        aria-label={archiveAriaLabel}
      >
        <ArchiveIcon className="icon-2xs" />
      </button>
    </div>
  );
}

function EnvIcon({
  envTooltip,
  envType,
  className,
  hostId,
}: {
  envTooltip?: ReactNode;
  envType?: TaskRowEnvironmentType;
  className?: string;
  hostId?: string;
}): ReactElement | null {
  const mappedEnv =
    envType === "worktree" ||
    envType === "cloud" ||
    envType === "remote" ||
    envType === "remote-worktree"
      ? envType
      : null;
  if (!mappedEnv) {
    return null;
  }
  let icon: ReactElement;
  switch (mappedEnv) {
    case "remote":
      icon = <RemoteThreadEnvIcon className={className} hostId={hostId!} />;
      break;
    case "remote-worktree":
      icon = (
        <RemoteWorktreeThreadEnvIcon className={className} hostId={hostId!} />
      );
      break;
    case "worktree":
      icon = <WorktreeThreadEnvIcon className={className} />;
      break;
    case "cloud":
      icon = <CloudThreadEnvIcon className={className} />;
      break;
  }
  const renderedIcon =
    envTooltip && envTooltip !== "" ? (
      <Tooltip tooltipContent={envTooltip}>{icon}</Tooltip>
    ) : (
      icon
    );
  return (
    <span className="flex shrink-0 items-center align-middle text-sm">
      {renderedIcon}
    </span>
  );
}
