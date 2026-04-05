import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";

export function ReviewStageActionsPill({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}): React.ReactElement {
  return (
    <div
      className={clsx("pointer-events-none -translate-x-1/2", className)}
      style={style}
    >
      <div className="pointer-events-auto flex items-center justify-center gap-2 rounded-full bg-token-dropdown-background/90 px-2 py-1 shadow-lg ring-[0.5px] ring-token-border backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}
