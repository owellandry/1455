import clsx from "clsx";
import type React from "react";

import X from "@/icons/x.svg";

export function ComposerAttachmentPill({
  Icon,
  children,
  onRemove,
  onRemoveAriaLabel,
  onClick,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onRemove?: () => void;
  onRemoveAriaLabel?: string;
  onClick?: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      className={clsx(
        "text-token-foreground bg-token-dropdown-background hover:bg-token-menu-background border-token-border group relative inline-flex max-w-[240px] items-center gap-1 rounded-full border px-2 py-1.5 text-sm",
        onClick && "cursor-interaction",
      )}
      onClick={onClick}
    >
      <Icon className="icon-2xs flex-shrink-0 text-token-input-placeholder-foreground" />
      <div className="relative min-w-0 flex-1 truncate pr-1 text-sm font-medium">
        {children}
        {onRemove && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="pointer-events-none absolute inset-y-0 right-0 flex cursor-interaction items-center justify-center rounded-full bg-token-dropdown-background/95 px-1 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
            aria-label={onRemoveAriaLabel}
          >
            <X className="icon-2xs text-token-foreground" />
          </button>
        )}
      </div>
    </button>
  );
}
