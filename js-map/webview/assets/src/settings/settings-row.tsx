import clsx from "clsx";
import type React from "react";

export function SettingsRow({
  label,
  description,
  control,
  className,
  variant = "default",
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  control: React.ReactNode;
  className?: string;
  variant?: "default" | "nested";
}): React.ReactElement {
  return (
    <div
      className={clsx(
        variant === "nested"
          ? "flex min-h-10 items-center justify-between gap-3 px-4 py-0.5 max-sm:min-h-0 max-sm:flex-col max-sm:items-stretch"
          : "flex items-center justify-between p-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div
          className={clsx(
            "min-w-0",
            variant === "nested"
              ? "text-token-text-primary text-[12.5px]"
              : "text-token-text-primary text-sm",
          )}
        >
          {label}
        </div>
        {description ? (
          <div
            className={clsx(
              "text-token-text-secondary min-w-0",
              variant === "nested" ? "text-xs" : "text-sm",
            )}
          >
            {description}
          </div>
        ) : null}
      </div>
      <div
        className={clsx(
          variant === "nested"
            ? "flex min-w-0 flex-1 items-center justify-end max-sm:justify-stretch"
            : "flex shrink-0 items-center gap-2",
        )}
      >
        {control}
      </div>
    </div>
  );
}
