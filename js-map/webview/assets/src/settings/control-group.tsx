import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";

export function ControlGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <div className={clsx("flex items-center gap-2", className)}>{children}</div>
  );
}
