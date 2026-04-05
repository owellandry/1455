import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";
import { useIntl } from "react-intl";

import "./home-layout.css";

/**
 * Shared flex layout that keeps body + footer pinned within the shell.
 */
export function HomeLayout({
  className,
  body,
  bodyClassName,
  alignMainToTop = false,
  disableMainScroll = false,
  disableBodyPadding = false,
  overlayRef,
  footer,
}: {
  className?: string;
  body: ReactNode;
  bodyClassName?: string;
  alignMainToTop?: boolean;
  disableMainScroll?: boolean;
  disableBodyPadding?: boolean;
  overlayRef?: (node: HTMLDivElement | null) => void;
  footer?: ReactNode;
}): ReactElement {
  const intl = useIntl();

  return (
    <div
      className={clsx(
        "home-layout-shell relative flex h-full flex-col",
        className,
      )}
    >
      <div className="flex h-full flex-col">
        <div
          className={clsx(
            "[container-name:home-main-content] [container-type:size] relative flex w-full flex-1 flex-col items-center",
            alignMainToTop ? "justify-start" : "justify-center",
            disableMainScroll || !alignMainToTop
              ? "overflow-hidden"
              : "overflow-y-auto",
          )}
          role="main"
          aria-label={intl.formatMessage({
            id: "homePage.mainContent",
            defaultMessage: "Main content",
            description: "Main landmark label for the home page",
          })}
        >
          <div
            className={clsx(
              "mx-auto flex w-full flex-col gap-3",
              disableBodyPadding ? "max-w-none px-0" : "max-w-3xl px-panel",
              bodyClassName,
            )}
          >
            {body}
          </div>
          {overlayRef ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0">
              <div
                ref={overlayRef}
                className="home-conversation-starters-overlay pointer-events-auto mx-auto flex w-full max-w-[var(--thread-composer-max-width)] flex-col gap-2 px-panel"
              />
            </div>
          ) : null}
        </div>
        {footer ? (
          <div className="z-10 mx-auto -mt-[var(--thread-footer-overlap)] flex w-full max-w-[var(--thread-composer-max-width)] flex-col gap-2 px-panel pb-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
