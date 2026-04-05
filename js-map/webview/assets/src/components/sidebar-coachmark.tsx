import clsx from "clsx";
import type React from "react";

import XIcon from "@/icons/x.svg";

import { Badge } from "./badge";
import { Button } from "./button";
import { Tooltip } from "./tooltip";

const DEFAULT_TOOLTIP_CLASS_NAME =
  "relative max-w-64 !rounded-2xl !border-0 !bg-token-charts-blue px-4 py-3 !text-token-button-foreground shadow-lg dark:!text-token-foreground before:absolute before:-left-1.5 before:top-1/2 before:h-3 before:w-3 before:-translate-y-1/2 before:rotate-45 before:rounded-[1px] before:!bg-token-charts-blue before:content-['']";
const DEFAULT_BADGE_CLASS_NAME =
  "!bg-token-dropdown-background px-1.5 py-0.5 text-[11px] font-bold leading-[13px] tracking-[0.06px] !text-token-charts-blue dark:!text-token-foreground";
const DEFAULT_DISMISS_BUTTON_CLASS_NAME =
  "-mr-1 -mt-1 h-6 w-6 !rounded-md !p-0 !text-token-button-foreground hover:!bg-token-button-foreground/10 hover:!text-token-button-foreground dark:!text-token-foreground dark:hover:!bg-token-foreground/10 dark:hover:!text-token-foreground";

export function SidebarCoachmark({
  align,
  badge,
  children,
  description,
  disabled = false,
  dismissLabel,
  onDismiss,
  open,
  side,
  sideOffset,
  title,
  tooltipClassName,
}: {
  align?: React.ComponentProps<typeof Tooltip>["align"];
  badge?: React.ReactNode;
  children: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  dismissLabel: string;
  onDismiss: () => void;
  open?: React.ComponentProps<typeof Tooltip>["open"];
  side?: React.ComponentProps<typeof Tooltip>["side"];
  sideOffset?: React.ComponentProps<typeof Tooltip>["sideOffset"];
  title: React.ReactNode;
  tooltipClassName?: string;
}): React.ReactElement {
  return (
    <Tooltip
      align={align}
      disabled={disabled}
      interactive
      open={open}
      side={side}
      sideOffset={sideOffset}
      tooltipBodyClassName="w-full"
      tooltipClassName={clsx(DEFAULT_TOOLTIP_CLASS_NAME, tooltipClassName)}
      tooltipContent={
        <SidebarCoachmarkContent
          badge={badge}
          description={description}
          dismissLabel={dismissLabel}
          onDismiss={onDismiss}
          title={title}
        />
      }
    >
      {children}
    </Tooltip>
  );
}

function SidebarCoachmarkContent({
  badge,
  description,
  dismissLabel,
  onDismiss,
  title,
}: {
  badge?: React.ReactNode;
  description?: React.ReactNode;
  dismissLabel: string;
  onDismiss: () => void;
  title: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {badge ? (
            <Badge className={DEFAULT_BADGE_CLASS_NAME}>{badge}</Badge>
          ) : null}
          <div className="truncate text-[13px] leading-[18px] font-medium tracking-[-0.08px]">
            {title}
          </div>
        </div>
        <Button
          className={DEFAULT_DISMISS_BUTTON_CLASS_NAME}
          color="ghost"
          size="icon"
          aria-label={dismissLabel}
          onClick={(event): void => {
            event.stopPropagation();
            onDismiss();
          }}
        >
          <XIcon className="icon-xs" />
        </Button>
      </div>
      {description ? (
        <div className="pr-4 text-[13px] leading-[18px] tracking-[-0.08px]">
          {description}
        </div>
      ) : null}
    </div>
  );
}
