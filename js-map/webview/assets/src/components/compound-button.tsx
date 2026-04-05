import clsx from "clsx";
import React, { useState } from "react";
import { defineMessage, useIntl, type MessageDescriptor } from "react-intl";

import {
  BasicDropdown,
  type DropdownContentWidth,
  type DropdownSurface,
} from "@/components/dropdown";
import ChevronIcon from "@/icons/chevron.svg";

import { Button } from "./button";
import { BUTTON_RADIUS_BY_SIZE, type ButtonSize } from "./button-utils";
import { Tooltip } from "./tooltip";

const secondaryActionAriaLabelMessage = defineMessage({
  id: "compoundButton.secondaryAction",
  defaultMessage: "Secondary action",
  description: "Aria label for the secondary target on the compound button",
});

/**
 * Split button with primary and secondary hit targets.
 */
export const CompoundButton = React.forwardRef<
  HTMLDivElement,
  React.PropsWithChildren<{
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    color?:
      | "primary"
      | "secondary"
      | "danger"
      | "outline"
      | "ghost"
      | "ghostActive"
      | "ghostMuted";
    size?: ButtonSize;
    disabled?: boolean;
    primaryDisabled?: boolean;
    dropdownDisabled?: boolean;
    loading?: boolean;
    className?: string;
    secondaryAriaLabel?: MessageDescriptor;
    secondaryIcon?: React.ComponentType<{ className?: string }>;
    type?: "button" | "submit" | "reset";
    dropdownContent: React.ReactNode;
    dropdownAlign?: "start" | "center" | "end";
    dropdownDir?: "ltr" | "rtl";
    dropdownSide?: "top" | "right" | "bottom" | "left";
    dropdownSurface?: DropdownSurface;
    dropdownContentWidth?: DropdownContentWidth;
    dropdownContentLayout?: "custom" | "menu";
    dropdownContentClassName?: string;
    primaryAriaLabel?: MessageDescriptor | string;
    dropdownOpen?: boolean;
    onDropdownOpenChange?: (open: boolean) => void;
    tooltipContent?: React.ReactNode;
    tooltipSide?: React.ComponentProps<typeof Tooltip>["side"];
    tooltipAlign?: React.ComponentProps<typeof Tooltip>["align"];
    tooltipSideOffset?: React.ComponentProps<typeof Tooltip>["sideOffset"];
    tooltipDelayOpen?: boolean;
  }> &
    Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onClick">
>(function CompoundButton(
  {
    children,
    onClick,
    color = "primary",
    size = "default",
    disabled = false,
    primaryDisabled,
    dropdownDisabled,
    loading = false,
    className,
    secondaryAriaLabel,
    secondaryIcon: SecondaryIcon = ChevronIcon,
    type,
    dropdownContent,
    dropdownAlign = "start",
    dropdownDir,
    dropdownSide = "bottom",
    dropdownSurface = "menu",
    dropdownContentWidth,
    dropdownContentLayout = "menu",
    dropdownContentClassName,
    primaryAriaLabel,
    dropdownOpen,
    onDropdownOpenChange,
    tooltipContent,
    tooltipSide,
    tooltipAlign,
    tooltipSideOffset,
    tooltipDelayOpen,
    ...rootProps
  },
  ref,
): React.ReactElement {
  const intl = useIntl();
  const [uncontrolledDropdownOpen, setUncontrolledDropdownOpen] =
    useState(false);
  const isDisabled = disabled || loading;
  const isPrimaryDisabled = isDisabled || primaryDisabled === true;
  const isDropdownDisabled = dropdownDisabled ?? isDisabled;
  const isFullyDisabled = isPrimaryDisabled && isDropdownDisabled;
  const isDropdownControlled = dropdownOpen !== undefined;
  const effectiveDropdownOpen = isDropdownControlled
    ? dropdownOpen
    : uncontrolledDropdownOpen;
  const ariaLabel = intl.formatMessage(
    secondaryAriaLabel ?? secondaryActionAriaLabelMessage,
  );

  const setDropdownOpen = (nextOpen: boolean): void => {
    if (!isDropdownControlled) {
      setUncontrolledDropdownOpen(nextOpen);
    }
    onDropdownOpenChange?.(nextOpen);
  };

  const button = (
    <div
      ref={ref}
      className={clsx(
        "inline-flex self-start items-stretch overflow-hidden",
        BUTTON_RADIUS_BY_SIZE[size],
        color === "outline" && isFullyDisabled && "opacity-40",
        className,
      )}
      {...rootProps}
    >
      <Button
        color={color}
        size={size}
        disabled={isPrimaryDisabled}
        loading={loading}
        className={clsx(
          "rounded-r-none border-r-0 pr-1",
          color === "outline" && isFullyDisabled && "disabled:opacity-100",
        )}
        aria-label={
          primaryAriaLabel
            ? typeof primaryAriaLabel === "string"
              ? primaryAriaLabel
              : intl.formatMessage(primaryAriaLabel)
            : undefined
        }
        onClick={(event) => {
          if (isPrimaryDisabled) {
            return;
          }
          if (onClick) {
            onClick(event);
            return;
          }
          setDropdownOpen(!effectiveDropdownOpen);
        }}
        type={type}
      >
        {children}
      </Button>

      <BasicDropdown
        open={isDropdownDisabled ? false : effectiveDropdownOpen}
        onOpenChange={(nextOpen) => {
          if (isDropdownDisabled) {
            return;
          }
          setDropdownOpen(nextOpen);
        }}
        dir={dropdownDir}
        side={dropdownSide}
        align={dropdownAlign}
        surface={dropdownSurface}
        contentWidth={dropdownContentWidth}
        contentClassName={dropdownContentClassName}
        triggerButton={
          <Button
            aria-label={ariaLabel}
            color={color}
            size={size}
            disabled={isDropdownDisabled}
            className={clsx(
              "gap-0 rounded-l-none border-l-0 pl-0.5 pr-1.5",
              color === "outline" && isFullyDisabled && "disabled:opacity-100",
            )}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <SecondaryIcon className="icon-2xs opacity-50" />
          </Button>
        }
      >
        {dropdownContentLayout === "menu" ? (
          <div className="flex min-w-[160px] flex-col gap-0.5">
            {dropdownContent}
          </div>
        ) : (
          dropdownContent
        )}
      </BasicDropdown>
    </div>
  );

  if (tooltipContent == null) {
    return button;
  }

  return (
    <Tooltip
      tooltipContent={tooltipContent}
      side={tooltipSide}
      align={tooltipAlign}
      sideOffset={tooltipSideOffset}
      delayOpen={tooltipDelayOpen}
    >
      {button}
    </Tooltip>
  );
});

CompoundButton.displayName = "CompoundButton";
