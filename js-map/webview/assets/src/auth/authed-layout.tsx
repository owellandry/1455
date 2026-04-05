import type { ReactElement } from "react";
import { Outlet, useLocation, useMatch } from "react-router";

import { isCompactWindowRoutePath } from "@/compact-window/is-compact-window-context";
import { AppSidebarShell } from "@/components/app/app-sidebar-shell";
import { useWindowType } from "@/hooks/use-window-type";
import { SidebarBrowser } from "@/sidebar/sidebar-browser";

import { SidebarElectron } from "../sidebar/sidebar-electron";

export function AuthedLayout(): ReactElement {
  const windowType = useWindowType();
  const location = useLocation();
  const isSettingsRoute = useMatch("/settings/*") != null;
  const isCompactRoute = isCompactWindowRoutePath(location.pathname);
  if (windowType === "extension") {
    return <Outlet />;
  }

  if (isSettingsRoute || isCompactRoute) {
    return <Outlet />;
  }

  let sidebar: ReactElement;
  if (windowType === "electron") {
    sidebar = <SidebarElectron />;
  } else {
    sidebar = <SidebarBrowser />;
  }

  return (
    <AppSidebarShell sidebar={sidebar}>
      <Outlet />
    </AppSidebarShell>
  );
}
