import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";

import { Badge } from "@/components/badge";

/** Shared vertical nav item with active/disabled affordances. */
export function NavItem({
  icon: Icon,
  label,
  hideLabel,
  fullWidth = true,
  onClick,
  isActive = false,
  disabled = false,
  className,
  weightClassName,
  iconClassName = "icon-xs",
  trailing,
  badge,
  ...rest
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: ReactNode;
  /**
   * When `true`, hides the visible label. When `false`, keeps it visible.
   * When `undefined`, this NavItem is treated as a label-always-visible row,
   * so the shared min-height guard is not applied because there is no label
   * hiding transition to stabilize.
   */
  hideLabel?: boolean;
  fullWidth?: boolean;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
  weightClassName?: string;
  iconClassName?: string;
  trailing?: ReactNode;
  badge?: number;
} & ButtonHTMLAttributes<HTMLButtonElement>): ReactElement {
  const hasBadge = typeof badge === "number";
  return (
    <button
      type="button"
      className={clsx(
        "opacity-75 hover:opacity-100 active:opacity-100 focus-visible:outline-token-border relative px-row-x py-row-y cursor-interaction shrink-0 items-center overflow-hidden rounded-lg text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:opacity-50 disabled:active:opacity-50 gap-2",
        fullWidth ? "flex w-full" : "inline-flex w-auto",
        isActive
          ? "bg-token-list-hover-background opacity-100"
          : "hover:bg-token-list-hover-background",
        hasBadge && "pr-10",
        weightClassName,
        className,
      )}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      disabled={disabled}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      <div
        className={clsx(
          "flex min-w-0 items-center text-base gap-2",
          fullWidth && "flex-1",
          hideLabel !== undefined && "min-h-6",
          isActive
            ? "text-token-list-active-selection-foreground"
            : "text-token-foreground",
        )}
      >
        <Icon
          className={clsx(
            iconClassName,
            isActive && "text-token-list-active-selection-icon-foreground",
          )}
        />
        {hideLabel ? null : <span className="truncate">{label}</span>}
      </div>
      {trailing}
      {hasBadge ? (
        <Badge className="disambiguated-digits absolute top-1/2 right-[var(--padding-row-x)] -translate-y-1/2">
          {badge}
        </Badge>
      ) : null}
    </button>
  );
}

/** Shared nav section wrapper with optional title. */
export function NavSection({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
}): ReactElement {
  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      {title ? (
        <div
          className={clsx(
            "text-token-input-placeholder-foreground text-base opacity-75 pl-2 pr-0.5",
          )}
        >
          {title}
        </div>
      ) : null}
      <div className="flex flex-col gap-px">{children}</div>
    </div>
  );
}
