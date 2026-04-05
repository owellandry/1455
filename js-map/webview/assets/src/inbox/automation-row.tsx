import clsx from "clsx";
import type { Automation } from "protocol";
import { useRef, useState, type ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { MoreMenuTrigger } from "@/components/more-menu-trigger";
import { Spinner } from "@/components/spinner";
import { Tooltip } from "@/components/tooltip";
import { useListItemButton } from "@/hooks/use-list-item-button";
import PauseCircleIcon from "@/icons/pause-circle.svg";
import PencilIcon from "@/icons/pencil.svg";
import PlayCircleIcon from "@/icons/play-circle.svg";
import TrashIcon from "@/icons/trash.svg";
import UnselectedCircleIcon from "@/icons/unselected-circle.svg";
import { ThinkingShimmer } from "@/local-conversation/items/thinking-shimmer";

export function AutomationRow({
  automation,
  displayName,
  workspaceLabel,
  scheduleLabel,
  isInProgress,
  isPaused,
  isSelected,
  onSelect,
  onPauseAutomation,
  onResumeAutomation,
  onDeleteAutomation,
}: {
  automation: Automation;
  displayName: string;
  workspaceLabel: string | null;
  scheduleLabel: string;
  isInProgress: boolean;
  isPaused: boolean;
  isSelected: boolean;
  onSelect: (automation: Automation) => void;
  onPauseAutomation?: (automation: Automation) => void;
  onResumeAutomation?: (automation: Automation) => void;
  onDeleteAutomation?: (automation: Automation) => void;
}): ReactElement {
  const intl = useIntl();
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const shouldIgnoreNextRowSelectRef = useRef(false);
  const buttonProps = useListItemButton({
    onSelect: (): void => {
      if (shouldIgnoreNextRowSelectRef.current) {
        shouldIgnoreNextRowSelectRef.current = false;
        return;
      }
      onSelect(automation);
    },
  });
  const areHoverActionsVisible = isActionsMenuOpen;

  return (
    <div
      className={clsx(
        "automation-row group flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-3 text-base cursor-interaction",
        isSelected
          ? "bg-token-list-active-selection-background"
          : "hover:bg-token-list-active-selection-background",
      )}
      {...buttonProps}
    >
      <div className="flex min-w-0 items-center gap-2">
        {isInProgress ? (
          <Spinner className="icon-sm shrink-0 text-token-description-foreground" />
        ) : isPaused ? (
          <PauseCircleIcon className="icon-sm shrink-0 text-token-description-foreground" />
        ) : (
          <UnselectedCircleIcon className="icon-sm shrink-0 text-token-description-foreground" />
        )}
        <span className="truncate text-token-foreground">{displayName}</span>
        <span className="truncate text-base text-token-description-foreground">
          {workspaceLabel != null ? (
            workspaceLabel
          ) : (
            <FormattedMessage
              id="inbox.automations.workspaceFallback"
              defaultMessage="-"
              description="Placeholder when an automation row has no workspace label"
            />
          )}
        </span>
      </div>
      <div
        className={clsx(
          "flex shrink-0 items-center text-base text-token-description-foreground",
          isInProgress || isPaused ? "gap-2" : "gap-0",
        )}
      >
        {scheduleLabel && !isPaused ? (
          <span
            className={clsx(
              "whitespace-nowrap transition-opacity",
              areHoverActionsVisible ? "opacity-0" : "group-hover:opacity-0",
            )}
          >
            {scheduleLabel}
          </span>
        ) : null}
        <span className="relative">
          {isInProgress ? (
            <ThinkingShimmer
              className={clsx(
                "text-token-description-foreground transition-opacity",
                areHoverActionsVisible ? "opacity-0" : "group-hover:opacity-0",
              )}
              message={
                <FormattedMessage
                  id="inbox.automations.inProgress"
                  defaultMessage="In progress"
                  description="Label for an automation that is currently running"
                />
              }
            />
          ) : isPaused ? (
            <span
              className={clsx(
                "transition-opacity",
                areHoverActionsVisible ? "opacity-0" : "group-hover:opacity-0",
              )}
            >
              <FormattedMessage
                id="inbox.automations.status.paused"
                defaultMessage="Paused"
                description="Label for paused automation status"
              />
            </span>
          ) : (
            <span />
          )}
          <span
            className={clsx(
              "absolute inset-y-0 right-0 flex items-center gap-2.5 transition-opacity",
              areHoverActionsVisible
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100",
            )}
          >
            <Tooltip
              tooltipContent={
                <FormattedMessage
                  id="inbox.automations.editTooltip"
                  defaultMessage="Edit automation"
                  description="Tooltip label for editing an automation"
                />
              }
            >
              <button
                type="button"
                className="flex items-center justify-center text-token-description-foreground hover:text-token-foreground"
                onClick={(event): void => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelect(automation);
                }}
              >
                <PencilIcon className="icon-sm" />
              </button>
            </Tooltip>
            <BasicDropdown
              align="end"
              contentWidth="icon"
              open={isActionsMenuOpen}
              onOpenChange={setIsActionsMenuOpen}
              triggerButton={
                <Tooltip
                  tooltipContent={
                    <FormattedMessage
                      id="inbox.automations.moreOptionsTooltip"
                      defaultMessage="More options"
                      description="Tooltip label for the automation row actions dropdown trigger"
                    />
                  }
                >
                  <span className="flex">
                    <MoreMenuTrigger
                      label={intl.formatMessage({
                        id: "inbox.automations.rowActions",
                        defaultMessage: "Automation actions",
                        description:
                          "Aria label for the automation row actions dropdown trigger",
                      })}
                      className="text-token-description-foreground hover:!bg-transparent hover:text-token-foreground active:!bg-transparent data-[state=open]:!bg-transparent"
                      iconClassName="icon-sm"
                      size="icon"
                    />
                  </span>
                </Tooltip>
              }
            >
              {!isPaused && onPauseAutomation ? (
                <Dropdown.Item
                  LeftIcon={PauseCircleIcon}
                  leftIconClassName="icon-sm"
                  onSelect={() => {
                    shouldIgnoreNextRowSelectRef.current = true;
                    onPauseAutomation(automation);
                  }}
                >
                  <FormattedMessage
                    id="inbox.automations.pauseMenuItem"
                    defaultMessage="Pause"
                    description="Dropdown menu item label for pausing an automation"
                  />
                </Dropdown.Item>
              ) : null}
              {isPaused && onResumeAutomation ? (
                <Dropdown.Item
                  LeftIcon={PlayCircleIcon}
                  leftIconClassName="icon-sm"
                  onSelect={() => {
                    shouldIgnoreNextRowSelectRef.current = true;
                    onResumeAutomation(automation);
                  }}
                >
                  <FormattedMessage
                    id="inbox.automations.resumeMenuItem"
                    defaultMessage="Resume"
                    description="Dropdown menu item label for resuming an automation"
                  />
                </Dropdown.Item>
              ) : null}
              <Dropdown.Item
                LeftIcon={TrashIcon}
                leftIconClassName="icon-sm"
                className="text-token-charts-red"
                onSelect={() => {
                  shouldIgnoreNextRowSelectRef.current = true;
                  onDeleteAutomation?.(automation);
                }}
              >
                <FormattedMessage
                  id="inbox.automations.deleteMenuItem"
                  defaultMessage="Delete"
                  description="Dropdown menu item label for deleting an automation"
                />
              </Dropdown.Item>
            </BasicDropdown>
          </span>
        </span>
      </div>
    </div>
  );
}
