import clsx from "clsx";
import type React from "react";

export function DebugRow({
  title,
  subtitle,
  icon,
  rightActions,
  status,
  onClick,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  rightActions?: React.ReactNode;
  status?: React.ReactNode;
  onClick?: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      className={clsx(
        "border-token-border/50 flex w-full items-center gap-2 border-t py-1.5 text-left first:border-none",
        onClick
          ? "hover:bg-token-foreground/5 cursor-pointer"
          : "cursor-default",
      )}
      onClick={onClick}
    >
      {icon ? <div className="mt-0.5">{icon}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate">{title}</div>
        {subtitle ? (
          <div className="truncate text-xs text-token-description-foreground">
            {subtitle}
          </div>
        ) : null}
      </div>
      {status ? (
        <div className="ml-2 shrink-0 text-token-description-foreground">
          {status}
        </div>
      ) : null}
      {rightActions ? (
        <div className="flex items-center gap-1">{rightActions}</div>
      ) : null}
    </button>
  );
}
