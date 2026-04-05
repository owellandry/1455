import clsx from "clsx";
import type React from "react";

export function LargeEmptyState({
  className,
  contentClassName,
  title,
  description,
  actions,
  illustration,
  titleSize = "default",
}: {
  className?: string;
  contentClassName?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  illustration?: React.ReactNode;
  titleSize?: "default" | "lg";
}): React.ReactElement {
  return (
    <div
      className={clsx(
        "flex w-full flex-col items-center justify-center px-3 py-6",
        className,
      )}
    >
      <div
        className={clsx(
          "flex w-full max-w-xl flex-col items-center justify-center gap-6 text-center",
          contentClassName,
        )}
      >
        {illustration ? (
          <div className="pointer-events-none text-token-input-placeholder-foreground">
            {illustration}
          </div>
        ) : null}
        {title != null || description != null ? (
          <div className="flex flex-col items-center gap-2">
            {title != null ? (
              <div
                className={clsx(
                  "font-medium",
                  titleSize === "lg" ? "text-lg" : "text-base",
                )}
              >
                {title}
              </div>
            ) : null}
            {description ? (
              <div className="text-base text-token-description-foreground">
                {description}
              </div>
            ) : null}
          </div>
        ) : null}
        {actions ? (
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
