import clsx from "clsx";
import { useSignal } from "maitai";
import type { CSSProperties, ReactElement } from "react";

import { Button } from "@/components/button";
import { WithWindow } from "@/components/with-window";
import { useStartNewConversation } from "@/hooks/use-start-new-conversation";
import Compose from "@/icons/compose.svg";

import { appShellSidebarOpen$ } from "./app-shell-state";
import { AppUpdateButton } from "./app-update-button";
import { SidebarTrigger } from "./sidebar-trigger";
import { useWindowsMenuBarEnabled } from "./use-windows-menu-bar-enabled";

export const APP_HEADER_SIDEBAR_PORTAL_ID = "app-header-portal-sidebar";
export const APP_HEADER_MAIN_PORTAL_ID = "app-header-portal-main";
export const APP_HEADER_DIVIDER_PORTAL_ID = "app-header-portal-divider";

export function AppHeaderPortal({
  isResizing,
  topOffset,
}: {
  isResizing: boolean;
  topOffset: string;
}): ReactElement {
  const isSidebarOpen = useSignal(appShellSidebarOpen$);
  const isWindowsMenuBarEnabled = useWindowsMenuBarEnabled();
  const startNewChat = useStartNewConversation();
  const handleStartNewChat = (): void => startNewChat();
  const collapsedLeftWidth =
    "calc(var(--spacing-token-safe-header-left) + (var(--spacing-token-button-composer) * 4) + (var(--spacing) * 7))";
  const sidebarColumnStyle = isWindowsMenuBarEnabled
    ? undefined
    : ({
        width: isSidebarOpen
          ? "var(--spacing-token-sidebar)"
          : collapsedLeftWidth,
        minWidth: isSidebarOpen
          ? "var(--spacing-token-sidebar)"
          : collapsedLeftWidth,
        maxWidth: isSidebarOpen
          ? "var(--spacing-token-sidebar)"
          : collapsedLeftWidth,
      } as CSSProperties);
  const mainInsetStyle = {
    "--app-header-main-inset":
      isWindowsMenuBarEnabled || isSidebarOpen ? "0px" : collapsedLeftWidth,
    "--app-header-main-right-inset": isWindowsMenuBarEnabled
      ? "0px"
      : "var(--spacing-token-safe-header-right)",
    paddingRight: isWindowsMenuBarEnabled
      ? "var(--padding-panel)"
      : "calc(var(--padding-panel) + var(--app-header-main-right-inset, 0px))",
  } as CSSProperties;

  if (isWindowsMenuBarEnabled) {
    return (
      <div
        className="pointer-events-none fixed inset-x-0 z-30 h-toolbar"
        style={{ top: topOffset }}
      >
        <div
          className={clsx(
            "app-header-tint absolute top-0 right-0 z-0 h-toolbar rounded-tl-lg pointer-events-none will-change-[left]",
            isResizing
              ? "transition-none"
              : "transition-[left] duration-relaxed ease-basic",
            isSidebarOpen ? "left-token-sidebar" : "left-0",
          )}
        />
        <div
          className={clsx(
            "draggable pointer-events-auto absolute top-0 right-0 z-10 h-toolbar flex min-w-0 items-center will-change-[left]",
            isResizing
              ? "transition-none"
              : "transition-[left] duration-relaxed ease-basic",
            isSidebarOpen ? "left-token-sidebar" : "left-0",
          )}
        >
          <div
            id={APP_HEADER_MAIN_PORTAL_ID}
            className="flex min-w-0 flex-1 px-panel"
            style={mainInsetStyle}
          />
        </div>

        <div id={APP_HEADER_SIDEBAR_PORTAL_ID} className="hidden" />
        <div
          id={APP_HEADER_DIVIDER_PORTAL_ID}
          className={clsx(
            "pointer-events-none absolute bottom-0 right-0 h-px",
            isSidebarOpen ? "left-token-sidebar" : "left-0",
          )}
        />
      </div>
    );
  }

  return (
    <div
      className="draggable pointer-events-none fixed inset-x-0 z-30 h-toolbar"
      style={{ top: topOffset }}
    >
      <div className="relative">
        <div
          className={clsx(
            "app-header-tint absolute top-0 right-0 z-0 h-toolbar rounded-tl-lg pointer-events-none will-change-[left]",
            isResizing
              ? "transition-none"
              : "transition-[left] duration-relaxed ease-basic",
            isSidebarOpen ? "left-token-sidebar" : "left-0",
          )}
        />
      </div>
      <div className="pointer-events-auto relative z-10 flex h-toolbar items-center">
        <div
          className={clsx(
            "app-header-left h-toolbar pl-token-safe-header-left will-change-width duration-relaxed ease-basic relative flex min-w-0 flex-shrink-0 items-center justify-between overflow-hidden [container-type:inline-size]",
            isResizing
              ? "transition-none"
              : "transition-[width,min-width,max-width]",
          )}
          style={sidebarColumnStyle}
        >
          <div className="flex items-center gap-1.5">
            <SidebarTrigger />
            <Button
              uniform
              color="ghost"
              onClick={handleStartNewChat}
              size="toolbar"
              className={isSidebarOpen ? "pointer-events-none opacity-0" : ""}
            >
              <Compose className="icon-sm" />
            </Button>
          </div>

          <div
            className={clsx(
              "app-header-left-portal h-toolbar flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-hidden pr-8 @[180px]:pr-16",
              isSidebarOpen ? null : "pl-2",
            )}
          >
            <div
              className={clsx(
                // This wrapper controls visibility/width when the sidebar is open/closed, while
                // keeping the portal node itself "as-is".
                "flex min-w-0 flex-1 items-center justify-end overflow-hidden duration-relaxed ease-basic",
                isResizing
                  ? "transition-none"
                  : "transition-[max-width,opacity]",
                isSidebarOpen
                  ? "max-w-none opacity-100"
                  : "pointer-events-none max-w-0 opacity-0",
              )}
            >
              <div id={APP_HEADER_SIDEBAR_PORTAL_ID}></div>
            </div>
          </div>
          <WithWindow electron>
            <div className="absolute top-1/2 right-2 z-10 -translate-y-1/2">
              <AppUpdateButton />
            </div>
          </WithWindow>
        </div>
        <div className="flex h-toolbar min-w-0 flex-1 items-center">
          <div
            id={APP_HEADER_MAIN_PORTAL_ID}
            className="flex min-w-0 flex-1 px-panel"
            style={mainInsetStyle}
          />
        </div>
      </div>

      <div
        id={APP_HEADER_DIVIDER_PORTAL_ID}
        className={clsx(
          "pointer-events-none absolute bottom-0 left-0 right-0 h-px w-full",
          isSidebarOpen ? "left-token-sidebar" : "left-0",
        )}
      />
    </div>
  );
}
