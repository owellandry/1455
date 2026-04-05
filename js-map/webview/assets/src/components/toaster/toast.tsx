import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import AlertIcon from "@/icons/alert.svg";
import CheckCircleIcon from "@/icons/check-circle.svg";
import XCircleFilledIcon from "@/icons/x-circle.svg";

import { Alert } from "./alert";
// https://github.com/openai/openai/blob/master/chatgpt/web/src/components/toaster/toast.tsx
import type { SvgIcon, ToastLevel } from "./types";

import "./toast.css";

const ALERT_TO_ICON = {
  success: CheckCircleIcon,
  warning: AlertIcon,
  danger: XCircleFilledIcon,
} as { [key in ToastLevel]?: SvgIcon };

export function Toast({
  zIndex,
  duration,
  onRemove,
  level,
  title,
  description,
  content,
  hasCloseButton,
  isShown: propIsShown = true,
  testId,
}: {
  zIndex?: number;
  duration?: number;
  onRemove?: () => void;
  level: ToastLevel;
  title: React.ReactNode;
  description?: React.ReactNode;
  content?: React.ReactNode;
  hasCloseButton: boolean;
  isShown?: boolean;
  testId?: string;
}): React.ReactElement | null {
  const [isLocallyClosed, setIsLocallyClosed] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isShown = propIsShown && !isLocallyClosed;

  const clearCloseTimer = (): void => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffect(() => {
    if (isShown && duration) {
      closeTimer.current = setTimeout(() => {
        setIsLocallyClosed(true);
      }, duration * 1000);
    }

    return clearCloseTimer;
  }, [duration, isShown]);

  useEffect(() => {
    if (!isShown) {
      onRemove?.();
    }
  }, [isShown, onRemove]);

  if (!isShown) {
    return null;
  }

  const Icon = ALERT_TO_ICON[level];

  return (
    <div className="toast-root no-drag" style={{ zIndex }}>
      <div className="no-drag w-full p-1 text-center md:w-auto md:text-justify">
        {content ? (
          <div data-testid={testId}>{content}</div>
        ) : (
          <Alert
            icon={Icon}
            level={level}
            onRemove={
              hasCloseButton
                ? (): void => {
                    setIsLocallyClosed(true);
                  }
                : undefined
            }
            testId={testId}
          >
            <div
              className={clsx("whitespace-pre-wrap text-start", {
                "font-medium": description,
              })}
            >
              {title}
            </div>
            {description ? (
              <div className="text-start">{description}</div>
            ) : null}
          </Alert>
        )}
      </div>
    </div>
  );
}
