import clsx from "clsx";
import type React from "react";

export function SearchBarFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        "pointer-events-auto grid w-[340px] max-w-[70vw] grid-cols-[minmax(0,1fr)_auto_auto] overflow-hidden rounded-[20px] border-[0.5px] border-token-border bg-token-side-bar-background shadow-[0px_8px_16px_-4px_rgba(0,0,0,0.12)] transition-all",
        className,
      )}
    >
      {children}
    </div>
  );
}
