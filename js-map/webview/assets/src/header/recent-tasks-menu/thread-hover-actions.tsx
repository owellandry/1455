import clsx from "clsx";
import type { ComponentProps, ReactElement, ReactNode } from "react";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";

type ThreadHoverAction = {
  id: string;
  ariaLabel: string;
  icon: ReactElement;
  label?: ReactNode;
  onClick: () => void;
  buttonClassName?: string;
  color?: ComponentProps<typeof Button>["color"];
  size?: ComponentProps<typeof Button>["size"];
};

type ThreadHoverConfirmAction = {
  active: boolean;
  ariaLabel: string;
  label: ReactNode;
  onConfirm: () => void;
};

const DEFAULT_CONTAINER_CLASS_NAME =
  "flex items-center gap-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100";

export function ThreadHoverActions({
  actions,
  confirmAction,
  className,
  tooltipSide = "right",
}: {
  actions: Array<ThreadHoverAction>;
  confirmAction?: ThreadHoverConfirmAction;
  className?: string;
  tooltipSide?: "top" | "right" | "bottom" | "left";
}): ReactElement | null {
  if (actions.length === 0 && confirmAction?.active !== true) {
    return null;
  }

  return (
    <div
      className={clsx(
        DEFAULT_CONTAINER_CLASS_NAME,
        confirmAction?.active && "opacity-100",
        className,
      )}
    >
      {confirmAction?.active ? (
        <Button
          className="!h-auto !py-0"
          color="danger"
          size="composerSm"
          aria-label={confirmAction.ariaLabel}
          onClick={(event) => {
            event.stopPropagation();
            confirmAction.onConfirm();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          {confirmAction.label}
        </Button>
      ) : (
        actions.map((action) => {
          const actionButton = (
            <Button
              color={action.color ?? "ghostMuted"}
              size={
                action.size ?? (action.label == null ? "icon" : "composerSm")
              }
              className={action.buttonClassName}
              aria-label={action.ariaLabel}
              onClick={(event) => {
                event.stopPropagation();
                action.onClick();
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
              {action.label}
              {action.icon}
            </Button>
          );

          if (action.label != null) {
            return <div key={action.id}>{actionButton}</div>;
          }

          return (
            <Tooltip
              key={action.id}
              side={tooltipSide}
              delayDuration={1500}
              tooltipContent={action.ariaLabel}
            >
              {actionButton}
            </Tooltip>
          );
        })
      )}
    </div>
  );
}
