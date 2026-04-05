import clsx from "clsx";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";

export const THREAD_BODY_INNER_CLASS_NAME =
  "mx-auto w-full max-w-[var(--thread-content-max-width)] px-2.5 md:px-panel";
const THREAD_FOOTER_INNER_CLASS_NAME =
  "mx-auto w-full max-w-[var(--thread-composer-max-width)] px-panel";

export function ThreadLayout({
  header,
  banner,
  aboveFooter,
  children,
  footer,
  className,
  bodyClassName,
  footerClassName,
  containerRef,
  tabIndex = 0,
  ...rest
}: Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  header?: ReactNode;
  banner?: ReactNode;
  aboveFooter?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  footerClassName?: string;
  containerRef?:
    | ((node: HTMLDivElement | null) => void)
    | { current: HTMLDivElement | null }
    | null;
}): ReactElement {
  return (
    <div
      ref={(node) => {
        assignThreadLayoutContainerRef(containerRef, node);
      }}
      className={clsx(
        "relative flex h-full flex-col [--thread-footer-overlap:0px] electron:[--thread-footer-overlap:var(--radius-4xl)]",
        className,
      )}
      tabIndex={tabIndex}
      {...rest}
    >
      <div className="sticky top-0 z-10">{header}</div>
      <div className={clsx("flex min-h-0 flex-1 flex-col", bodyClassName)}>
        <div className="relative mx-auto flex min-h-0 w-full flex-1 flex-col">
          {banner}
          <div className="min-h-0 flex-1">{children}</div>
        </div>
        {aboveFooter && (
          <div className="z-10 w-full">
            <div
              className={clsx(
                "flex flex-col gap-2",
                THREAD_BODY_INNER_CLASS_NAME,
              )}
            >
              {aboveFooter}
            </div>
          </div>
        )}
        <div className={clsx("z-10 w-full pb-2", footerClassName)}>
          <div
            className={clsx("flex flex-col", THREAD_FOOTER_INNER_CLASS_NAME)}
          >
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

function assignThreadLayoutContainerRef(
  containerRef:
    | ((node: HTMLDivElement | null) => void)
    | { current: HTMLDivElement | null }
    | null
    | undefined,
  node: HTMLDivElement | null,
): void {
  if (typeof containerRef === "function") {
    containerRef(node);
    return;
  }
  if (containerRef != null) {
    containerRef.current = node;
  }
}
