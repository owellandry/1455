import clsx from "clsx";
import type React from "react";
import { useIntl } from "react-intl";

import XIcon from "@/icons/x.svg";

import type { SvgIcon, ToastLevel } from "./types";

export function Alert(props: {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
  icon?: SvgIcon;
  level?: ToastLevel;
  onRemove?: () => void;
  testId?: string;
}): React.ReactElement {
  const intl = useIntl();
  const {
    className,
    level = "info",
    fullWidth,
    children,
    icon: IconComponent,
    onRemove,
    testId,
  } = props;

  const rootClassName = clsx(
    "alert-root inline-flex flex-row items-start gap-1.5 rounded-2xl px-2 py-2 text-base leading-[1.4] pointer-events-auto box-shadow-lg border text-token-foreground",
    {
      flex: fullWidth,
      "border-token-border bg-token-dropdown-background": level === "info",
      "border-token-border bg-token-input-validation-info-background":
        level === "success",
      "border-token-input-validation-warning-border bg-token-input-validation-warning-background":
        level === "warning",
      "border-token-input-validation-error-border bg-token-input-validation-error-background":
        level === "danger",
    },
    className,
  );

  return (
    <div className={rootClassName} role="alert" data-testid={testId}>
      {IconComponent ? (
        <div className="shrink-0 grow-0">
          <IconComponent className="icon-sm" />
        </div>
      ) : null}
      <div className="flex-1 justify-center gap-2">
        {typeof children === "string" ? (
          <div className="font-medium">{children}</div>
        ) : (
          children
        )}
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={intl.formatMessage({
            id: "codex.alert.closeAriaLabel",
            defaultMessage: "Close",
            description:
              "Aria label for the close button on an alert/toast component",
          })}
          className="mt-0.5 flex shrink-0 grow-0 cursor-interaction rounded-full opacity-50 hover:bg-token-button-secondary-hover-background/5 hover:opacity-80"
        >
          <XIcon className="icon-xs" />
        </button>
      ) : null}
    </div>
  );
}
