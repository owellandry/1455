import clsx from "clsx";
import type React from "react";
import { useState } from "react";

import ChevronIcon from "@/icons/chevron.svg";

export function DebugSection({
  title,
  children,
  storageKey,
  variant = "selection",
  onToggle,
  className,
  actions,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  storageKey?: string;
  variant?: "selection" | "global";
  onToggle?: (isOpen: boolean) => void;
  className?: string;
  actions?: React.ReactNode;
}): React.ReactElement {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (!storageKey) {
      return false;
    }
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === "open";
    } catch {
      return false;
    }
  });

  return (
    <div>
      <button
        type="button"
        className={clsx(
          "flex h-7 w-full cursor-pointer items-center justify-between gap-2 px-3 text-left font-medium",
          variant === "selection"
            ? "bg-token-charts-blue/10 hover:bg-token-charts-blue/15 text-token-charts-blue"
            : "bg-token-foreground/5 hover:bg-token-foreground/10 text-token-foreground",
          className,
        )}
        aria-expanded={isOpen}
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (storageKey) {
            try {
              window.localStorage.setItem(storageKey, next ? "open" : "closed");
            } catch {
              // ignore storage failures
            }
          }
          onToggle?.(next);
        }}
      >
        <span className="flex items-center gap-2">
          <ChevronIcon
            className="icon-2xs transition-transform duration-150"
            style={{ transform: `rotate(${isOpen ? 0 : -90}deg)` }}
          />
          {title}
        </span>
        <span className="text-current">
          {actions ? (
            <span
              className="flex items-center gap-1"
              onClick={(event): void => {
                event.stopPropagation();
              }}
            >
              {actions}
            </span>
          ) : null}
          {variant === "selection" ? (
            <span className="icon-2xs ml-1 block h-2 w-2 rounded-full bg-current" />
          ) : null}
        </span>
      </button>
      <div
        className="px-3"
        style={{
          contentVisibility: isOpen ? "visible" : "hidden",
          display: isOpen ? "block" : "none",
        }}
        data-open={isOpen}
      >
        {children}
      </div>
    </div>
  );
}
