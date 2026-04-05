import clsx from "clsx";
import type React from "react";

import { BUTTON_RADIUS_BY_SIZE, type ButtonSize } from "./button-utils";
import { Spinner } from "./spinner";

const BUTTON_COLOR_CLASS_NAMES = {
  danger: "bg-token-charts-red/10 text-token-charts-red border-transparent",
  ghost:
    "text-token-description-foreground enabled:hover:bg-token-list-hover-background data-[state=open]:bg-token-list-hover-background border-transparent",
  ghostActive:
    "text-token-foreground enabled:hover:bg-token-list-hover-background data-[state=open]:bg-token-list-hover-background border-transparent",
  ghostMuted:
    "text-token-muted-foreground enabled:hover:bg-transparent data-[state=open]:bg-transparent hover:text-token-foreground border-transparent",
  outline:
    "border-token-border text-token-button-tertiary-foreground bg-token-bg-fog enabled:hover:bg-token-list-hover-background data-[state=open]:bg-token-list-hover-background border",
  primary:
    "bg-token-foreground enabled:hover:bg-token-foreground/80 data-[state=open]:bg-token-foreground/80 text-token-dropdown-background",
  secondary:
    "text-token-foreground bg-token-foreground/5 enabled:hover:bg-token-list-hover-background data-[state=open]:bg-token-list-hover-background border-transparent",
} as const;

const BUTTON_SIZE_CLASS_NAMES = {
  composer: "h-token-button-composer px-2 py-0 text-sm leading-[18px]",
  composerSm: "h-token-button-composer-sm px-1.5 py-0 text-sm leading-[18px]",
  default: "px-2 py-0.5 text-sm leading-[18px]",
  icon: "electron:p-1 electron:[&>svg]:icon-sm flex items-center justify-center p-0.5",
  iconSm: "flex h-4 w-4 items-center justify-center p-0.5 [&>svg]:icon-2xs",
  large: "px-5 py-2 text-base leading-[18px]",
  medium: "px-4 py-1.5 text-base leading-[18px]",
  toolbar: "h-token-button-composer px-2 py-0 text-base leading-[18px]",
} satisfies Record<ButtonSize, string>;

export function Button({
  uniform = false,
  color = "primary",
  size = "default",
  disabled = false,
  className,
  children,
  type,
  loading = false,
  ...rest
}: React.PropsWithChildren<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    color?:
      | "primary"
      | "secondary"
      | "danger"
      | "outline"
      | "ghost"
      | "ghostActive"
      | "ghostMuted";
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    className?: string;
    type?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
    /**
     * If true, the button will be a square with no padding.
     */
    uniform?: boolean;
  }
>): React.ReactElement {
  return (
    <button
      type={type ?? "button"}
      className={clsx(
        "border-token-border user-select-none no-drag cursor-interaction flex items-center gap-1 border whitespace-nowrap focus:outline-none disabled:cursor-not-allowed disabled:opacity-40",
        BUTTON_RADIUS_BY_SIZE[size],
        BUTTON_COLOR_CLASS_NAMES[color],
        BUTTON_SIZE_CLASS_NAMES[size],
        {
          true: "aspect-square items-center justify-center !px-0",
          false: "",
        }[uniform ? "true" : "false"],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner className="icon-xxs" />}
      {children}
    </button>
  );
}
