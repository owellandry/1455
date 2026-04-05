import clsx from "clsx";
import { useScope, useSignal } from "maitai";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useCallback, useRef, useState } from "react";

import HomeLogoIcon from "@/icons/homepage-logo.svg";
import { useMessage } from "@/message-bus";
import { AppScope } from "@/scopes/app-scope";

import { AppHeaderPortal } from "./app-header-portal";
import { appShellSidebarOpen$ } from "./app-shell-state";
import { AppUpdateButton } from "./app-update-button";
import { useFullWindowCelebration } from "./full-window-celebration";
import { SidebarResizer } from "./sidebar-resizer";
import { SidebarTrigger } from "./sidebar-trigger";
import {
  getInitialSidebarWidth,
  persistSidebarWidth,
  sidebarWidthCss,
} from "./sidebar-width";
import { useWindowControlsSafeArea } from "./use-window-controls-safe-area";
import { useWindowsMenuBarEnabled } from "./use-windows-menu-bar-enabled";
import { WindowsMenuBar } from "./windows-menu-bar";

/**
 * Provides the shared chrome that positions sidebar + main content together.
 */
export function AppSidebarShell({
  sidebar,
  children,
  sidebarClassName,
  contentClassName,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarClassName?: string;
  contentClassName?: string;
}): ReactElement {
  return (
    <>
      <AppShellMessageBridge />
      <AppSidebarShellLayout
        sidebar={sidebar}
        sidebarClassName={sidebarClassName}
        contentClassName={contentClassName}
      >
        {children}
      </AppSidebarShellLayout>
    </>
  );
}

function AppShellMessageBridge(): null {
  const scope = useScope(AppScope);
  useMessage(
    "toggle-sidebar",
    () => {
      scope.set(appShellSidebarOpen$, (isOpen) => !isOpen);
    },
    [scope],
  );
  return null;
}

/**
 * Internals for AppSidebarShell that inject shared safe-area padding + motion.
 */
function AppSidebarShellLayout({
  sidebar,
  children,
  sidebarClassName,
  contentClassName,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarClassName?: string;
  contentClassName?: string;
}): ReactElement {
  const isSidebarOpen = useSignal(appShellSidebarOpen$);
  const { isFullWindowCelebrationStyled } = useFullWindowCelebration();
  const safeArea = useWindowControlsSafeArea();
  const isWindowsMenuBarEnabled = useWindowsMenuBarEnabled();
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(
    getInitialSidebarWidth,
  );
  const shellRef = useRef<HTMLDivElement | null>(null);
  const appShellTopOffset = isWindowsMenuBarEnabled
    ? "var(--height-toolbar-sm)"
    : "0px";
  const sidebarTopClassName = isWindowsMenuBarEnabled
    ? "top-0"
    : "top-[var(--inset-toolbar)]";
  const previewSidebarWidth = useCallback((nextWidth: number): void => {
    shellRef.current?.style.setProperty(
      "--spacing-token-sidebar",
      sidebarWidthCss(nextWidth),
    );
  }, []);
  const handleSidebarWidthChange = useCallback((nextWidth: number): void => {
    setSidebarWidth(nextWidth);
    persistSidebarWidth(nextWidth);
  }, []);
  const layoutStyle = {
    "--spacing-token-safe-header-left": `${safeArea.left ?? 0}px`,
    "--spacing-token-safe-header-right": `${safeArea.right ?? 0}px`,
    "--spacing-token-sidebar": sidebarWidthCss(sidebarWidth),
  } as CSSProperties;

  return (
    <div
      ref={shellRef}
      className={clsx(
        "relative h-full",
        isFullWindowCelebrationStyled && "window-fx-celebration",
      )}
      style={layoutStyle}
    >
      {isWindowsMenuBarEnabled ? (
        <div className="app-header-tint draggable group/windows-top-bar fixed inset-x-0 top-0 z-40 flex h-toolbar-sm items-center pr-token-safe-header-right pl-token-safe-header-left">
          <div className="relative flex h-toolbar-sm w-[calc(var(--spacing-token-button-composer)*3+var(--spacing)*5)] shrink-0 items-center">
            <div
              aria-hidden
              className="relative top-px left-1 ml-3 flex h-4 w-4 shrink-0 items-center justify-center transition-opacity group-focus-within/windows-top-bar:opacity-0 group-hover/windows-top-bar:opacity-0"
            >
              <HomeLogoIcon className="h-4 w-4 text-token-foreground opacity-90" />
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center opacity-0 transition-opacity group-focus-within/windows-top-bar:pointer-events-auto group-focus-within/windows-top-bar:opacity-100 group-hover/windows-top-bar:pointer-events-auto group-hover/windows-top-bar:opacity-100">
              <div className="relative top-px -left-0.5">
                <SidebarTrigger />
              </div>
            </div>
          </div>
          <AppUpdateButton />
          <WindowsMenuBar />
        </div>
      ) : null}
      <AppHeaderPortal isResizing={isResizing} topOffset={appShellTopOffset} />
      <div
        className={clsx(
          "fixed inset-x-0 bottom-0",
          isResizing && "cursor-col-resize",
        )}
        style={{ top: appShellTopOffset }}
      >
        {/* z-20 keeps the sidebar + handle above the main surface and header chrome while dragging */}
        <div
          className={clsx(
            "pointer-events-none w-token-sidebar absolute bottom-0 left-0 z-20",
            sidebarTopClassName,
            sidebarClassName,
          )}
        >
          <div
            className={clsx(
              "window-fx-sidebar-surface pointer-events-auto h-full overflow-hidden",
              "duration-relaxed ease-basic [will-change:width]",
              isSidebarOpen ? "w-token-sidebar" : "w-0",
            )}
            style={{
              contain: "strict",
              transitionProperty: isResizing ? "none" : "width",
            }}
          >
            <div
              className={clsx(
                "h-full w-token-sidebar min-w-token-sidebar overflow-hidden",
                "duration-relaxed ease-basic",
                isSidebarOpen ? "opacity-100" : "opacity-0",
              )}
              style={{
                transitionProperty: isResizing ? "none" : "opacity",
              }}
            >
              {sidebar}
            </div>
          </div>
          <div className="pointer-events-auto">
            <SidebarResizer
              isSidebarOpen={isSidebarOpen}
              onResizingChange={setIsResizing}
              previewSidebarWidth={previewSidebarWidth}
              setSidebarWidth={handleSidebarWidthChange}
              sidebarWidth={sidebarWidth}
            />
          </div>
        </div>
        <div
          className={clsx(
            "pt-toolbar main-surface absolute bottom-0 right-0 top-0 translate-x-0",
            "duration-relaxed ease-basic",
            isSidebarOpen ? "left-token-sidebar" : "left-0",
            contentClassName,
          )}
          style={{ transitionProperty: isResizing ? "none" : "left" }}
        >
          <div className="absolute inset-0 top-toolbar">{children}</div>
        </div>
      </div>
    </div>
  );
}
