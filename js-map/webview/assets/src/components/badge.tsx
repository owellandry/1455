import clsx from "clsx";
import type React from "react";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <span
      className={clsx(
        "bg-token-badge-background text-token-badge-foreground inline-flex items-center rounded-sm px-2 py-1 text-sm leading-none",
        className,
      )}
    >
      {children}
    </span>
  );
}
