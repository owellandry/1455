import clsx from "clsx";
import type { ReactNode } from "react";

export function InProgressFixedContentItem({
  children,
  action,
  onClick,
  expandedContent,
  backgroundColorClassName,
}: {
  children: ReactNode;
  action: ReactNode;
  expandedContent?: ReactNode;
  onClick?: () => void;
  backgroundColorClassName?: string;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        "bg-token-input-background/70 text-token-foreground border-token-border/80 relative overflow-clip border-x border-t backdrop-blur-sm transition-colors first:rounded-t-2xl",
        onClick && "cursor-interaction",
        backgroundColorClassName,
      )}
      onClick={onClick}
    >
      <div className="flex flex-col">
        <div className="flex w-full items-center justify-between gap-1.5 py-1.5 pr-2 pl-3 text-sm font-normal">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {children}
          </div>
          <div className="flex min-w-fit shrink-0 items-center gap-1.5 select-none sm:ml-auto">
            {action}
          </div>
        </div>
        {expandedContent}
      </div>
    </div>
  );
}
