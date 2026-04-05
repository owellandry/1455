import type { ReactElement, ReactNode } from "react";
import { useLayoutEffect, useReducer } from "react";
import { createPortal } from "react-dom";

import {
  APP_HEADER_DIVIDER_PORTAL_ID,
  APP_HEADER_MAIN_PORTAL_ID,
  APP_HEADER_SIDEBAR_PORTAL_ID,
} from "./app-header-portal";

function usePortalNode(id: string): HTMLElement | null {
  const [node, dispatch] = useReducer(
    (_: HTMLElement | null, next: HTMLElement | null) => next,
    null,
  );
  useLayoutEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    dispatch(document.getElementById(id));
  }, [id]);
  return node;
}

export function AppHeader({
  children,
  sidebar,
  hideDivider = false,
}: {
  children?: ReactNode;
  sidebar?: ReactNode;
  hideDivider?: boolean;
}): ReactElement | null {
  const sidebarNode = usePortalNode(APP_HEADER_SIDEBAR_PORTAL_ID);
  const mainNode = usePortalNode(APP_HEADER_MAIN_PORTAL_ID);
  const dividerNode = usePortalNode(APP_HEADER_DIVIDER_PORTAL_ID);

  return (
    <>
      {sidebar && sidebarNode ? createPortal(sidebar, sidebarNode) : sidebar}
      {children && mainNode ? createPortal(children, mainNode) : children}
      {dividerNode
        ? createPortal(
            <div
              className={`app-header-divider h-px w-full border-b border-token-border transition-opacity ${hideDivider ? "opacity-0" : "opacity-100"}`}
              style={{
                transition:
                  "opacity var(--transition-duration-relaxed) var(--cubic-enter)",
              }}
            />,
            dividerNode,
          )
        : null}
    </>
  );
}
