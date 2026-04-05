import clsx from "clsx";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";

export function SettingsContentLayout({
  title,
  backSlot,
  subtitle,
  children,
  fullWidth = false,
  contentClassName,
  action,
  className,
  ...rest
}: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title?: ReactNode;
  backSlot?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  fullWidth?: boolean;
  contentClassName?: string;
  action?: ReactNode;
}): ReactElement {
  const titleSection =
    !title && !subtitle && !action ? null : (
      <div className="flex items-center justify-between gap-3 pb-panel">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-panel">
          {title ? (
            <div className="electron:heading-lg heading-base truncate">
              {title}
            </div>
          ) : null}
          {subtitle ? (
            <div className="truncate text-base text-token-text-secondary">
              {subtitle}
            </div>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    );

  return (
    <div
      className={clsx("main-surface flex h-full min-h-0 flex-col", className)}
      {...rest}
    >
      <div className="draggable flex items-center px-panel electron:h-toolbar extension:h-toolbar-sm">
        {backSlot}
      </div>
      <div className="flex-1 overflow-y-auto p-panel">
        <div
          className={clsx(
            "mx-auto flex w-full flex-col",
            fullWidth ? null : "max-w-2xl",
            contentClassName,
          )}
        >
          {titleSection}
          <div className="flex flex-col gap-[var(--padding-panel)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
