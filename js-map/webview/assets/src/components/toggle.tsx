import clsx from "clsx";
import type React from "react";

const TRACK_CLASS_NAME_BY_SIZE = {
  default: "h-5 w-8",
  sm: "h-4 w-7",
} as const;

const THUMB_CLASS_NAME_BY_SIZE = {
  default:
    "h-4 w-4 data-[state=unchecked]:translate-x-[3px] data-[state=checked]:translate-x-[13px]",
  sm: "h-3 w-3 data-[state=unchecked]:translate-x-[2px] data-[state=checked]:translate-x-[14px]",
} as const;

export function Toggle({
  checked,
  onChange,
  disabled = false,
  className,
  id,
  ariaLabel,
  size = "default",
  trackClassName,
  thumbClassName,
  onClick,
  ...buttonProps
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
  size?: "default" | "sm";
  trackClassName?: string;
  thumbClassName?: string;
} & Omit<
  React.ComponentProps<"button">,
  "aria-label" | "aria-checked" | "checked" | "onChange" | "ref" | "role"
>): React.ReactElement {
  const trackSizeClassName = TRACK_CLASS_NAME_BY_SIZE[size];
  const thumbSizeClassName = THUMB_CLASS_NAME_BY_SIZE[size];
  const state = checked ? "checked" : "unchecked";

  const handleToggle = (): void => {
    if (disabled) {
      return;
    }
    onChange(!checked);
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }
    handleToggle();
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      id={id}
      className={clsx(
        "inline-flex items-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-token-focus-border focus-visible:rounded-full",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
      data-state={state}
      {...buttonProps}
      onClick={handleClick}
      disabled={disabled}
    >
      <span
        className={clsx(
          "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 ease-out",
          checked ? "bg-token-charts-blue" : "bg-token-foreground/10",
          trackSizeClassName,
          trackClassName,
        )}
        data-state={state}
      >
        <span
          className={clsx(
            "rounded-full border border-[color:var(--gray-0)] bg-[color:var(--gray-0)] shadow-sm transition-transform duration-200 ease-out data-[state=unchecked]:translate-x-0",
            thumbSizeClassName,
            thumbClassName,
          )}
          data-state={state}
        />
      </span>
    </button>
  );
}
