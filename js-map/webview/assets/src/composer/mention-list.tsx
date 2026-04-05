import clsx from "clsx";
import type {
  MouseEventHandler,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";
import { useLocation } from "react-router";

import { isHotkeyWindowHomePathname } from "./hotkey-window-home-composer-menu";

import hotkeyWindowStyles from "@/hotkey-window/hotkey-window.module.css";

export function MentionListContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  const location = useLocation();
  const isHotkeyWindowHome = isHotkeyWindowHomePathname(location.pathname);

  return (
    <div
      className={clsx(
        isHotkeyWindowHome
          ? clsx(
              hotkeyWindowStyles.homeInlineMenuPanel,
              "relative flex w-full flex-col overflow-hidden p-1 text-sm",
            )
          : "border-token-border bg-token-dropdown-background/90 relative flex w-full flex-col overflow-hidden rounded-2xl border p-1 text-sm backdrop-blur-sm",
        className,
        isHotkeyWindowHome && "max-h-none",
      )}
    >
      {children}
    </div>
  );
}

export function MentionListScrollArea({
  children,
  className,
  listRef,
}: {
  children: ReactNode;
  className?: string;
  listRef?:
    | ((instance: HTMLDivElement | null) => void)
    | RefObject<HTMLDivElement | null>;
}): ReactElement {
  return (
    <div
      ref={listRef}
      className={clsx(
        "vertical-scroll-fade-mask flex w-full flex-1 flex-col overflow-y-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MentionListSectionHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  const location = useLocation();
  const isHotkeyWindowHome = isHotkeyWindowHomePathname(location.pathname);

  return (
    <div
      className={clsx(
        isHotkeyWindowHome
          ? "px-row-x pt-1 pb-0 text-sm text-token-description-foreground"
          : "bg-token-dropdown-background/95 text-token-description-foreground sticky top-0 z-10 px-row-x py-1 text-sm backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MentionListPlaceholderRow({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <div className="px-row-x py-row-y text-sm text-token-input-placeholder-foreground">
      {children}
    </div>
  );
}

export function MentionListRow({
  children,
  getItemProps,
  highlighted,
  itemIndex,
}: {
  children: ReactNode;
  getItemProps: (index: number) => {
    onClick: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
    onMouseEnter: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
    "aria-selected": boolean;
    "data-list-navigation-item": "true";
  };
  highlighted: boolean;
  itemIndex: number;
}): ReactElement {
  return (
    <button
      type="button"
      {...getItemProps(itemIndex)}
      className={clsx(
        "text-token-foreground outline-hidden opacity-75 focus:bg-token-list-hover-background cursor-interaction w-full shrink-0 overflow-hidden rounded-lg px-row-x py-row-y text-left text-sm",
        highlighted
          ? "bg-token-list-hover-background opacity-100"
          : "hover:bg-token-list-hover-background hover:opacity-100",
      )}
    >
      {children}
    </button>
  );
}
