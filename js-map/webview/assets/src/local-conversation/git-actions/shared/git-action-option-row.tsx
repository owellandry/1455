import clsx from "clsx";
import type { ComponentType, ReactElement, ReactNode } from "react";

import { Tooltip } from "@/components/tooltip";
import CheckIcon from "@/icons/check-md.svg";

export function GitActionOptionRow({
  icon: Icon,
  label,
  description,
  meta,
  warning,
  metaPosition = "right",
  selected,
  disabled,
  tooltipText,
  align = "center",
  className,
  onSelect,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  warning?: ReactNode;
  metaPosition?: "right" | "below" | "inline";
  selected: boolean;
  disabled?: boolean;
  tooltipText?: ReactNode;
  align?: "center" | "start";
  className?: string;
  onSelect: () => void;
}): ReactElement {
  const handleSelect = (): void => {
    if (disabled) {
      return;
    }
    onSelect();
  };

  return (
    <Tooltip
      disabled={!disabled || tooltipText == null}
      tooltipContent={tooltipText}
    >
      <span>
        <button
          type="button"
          className={clsx(
            "flex w-full gap-3 px-4 py-2 text-left transition-colors focus:outline-none focus:ring-0",
            align === "start" ? "items-start" : "items-center",
            disabled
              ? "cursor-not-allowed"
              : "cursor-pointer hover:bg-token-editor-background",
            className,
          )}
          disabled={disabled}
          onClick={handleSelect}
          aria-pressed={selected}
        >
          {Icon && (
            <Icon
              className={clsx(
                "icon-sm",
                align === "start" ? "mt-0.5" : null,
                disabled
                  ? "text-token-description-foreground"
                  : "text-token-foreground",
              )}
            />
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className={clsx(
                "flex min-w-0 gap-2",
                metaPosition === "inline" ? "items-baseline" : "items-center",
                metaPosition === "right" ? "justify-between" : null,
              )}
            >
              <span
                className={clsx(
                  "truncate",
                  metaPosition === "right" ? "min-w-0 flex-1" : null,
                  disabled
                    ? "text-token-description-foreground"
                    : "text-token-foreground",
                )}
              >
                {label}
              </span>
              {meta && metaPosition === "right" ? (
                <span className="flex max-w-[45%] min-w-0 items-center justify-end gap-1 text-xs text-token-description-foreground">
                  {meta}
                </span>
              ) : meta && metaPosition === "inline" ? (
                <span className="max-w-[55%] truncate text-xs text-token-description-foreground">
                  {meta}
                </span>
              ) : null}
            </span>
            {meta && metaPosition === "below" ? (
              <span className="min-w-0 truncate text-xs text-token-description-foreground">
                {meta}
              </span>
            ) : null}
            {description ? (
              <span className="text-xs text-token-description-foreground">
                {description}
              </span>
            ) : null}
            {warning ? (
              <span className="text-xs text-token-editor-warning-foreground">
                {warning}
              </span>
            ) : null}
          </span>
          <CheckIcon
            className={clsx(
              "icon-sm shrink-0",
              align === "start" ? "mt-0.5" : null,
              disabled
                ? "text-token-description-foreground"
                : "text-token-foreground",
              !selected ? "invisible" : null,
            )}
          />
        </button>
      </span>
    </Tooltip>
  );
}
