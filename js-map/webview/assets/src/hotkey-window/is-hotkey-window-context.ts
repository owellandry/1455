import { HOTKEY_WINDOW_ROUTE_PREFIX, isHotkeyWindowRoutePath } from "protocol";

type RouteContext = { pathname: string; initialRoute: string | null };

export { HOTKEY_WINDOW_ROUTE_PREFIX, isHotkeyWindowRoutePath };

export function isHotkeyWindowContext({
  pathname,
  initialRoute,
}: RouteContext): boolean {
  return (
    isHotkeyWindowRoutePath(pathname) || isHotkeyWindowRoutePath(initialRoute)
  );
}

export function isHotkeyWindowContextFromWindow(): boolean {
  return isHotkeyWindowContext(readWindowRouteContext());
}

function readWindowRouteContext(): RouteContext {
  if (typeof window === "undefined") {
    return { pathname: "", initialRoute: null };
  }
  const url = new URL(window.location.href);
  return {
    pathname: url.pathname,
    initialRoute: url.searchParams.get("initialRoute"),
  };
}
