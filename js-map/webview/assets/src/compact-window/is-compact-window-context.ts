import { matchPath } from "react-router";

const COMPACT_WINDOW_PATTERNS = [
  "/thread-overlay",
  "/thread-overlay/*",
  "/hotkey-window",
  "/hotkey-window/*",
] as const;

type RouteContext = { pathname: string; initialRoute: string | null };

/**
 * Compact windows are intentionally a shared renderer category for auxiliary
 * surfaces that should avoid full main-window chrome and background behavior.
 * Today that includes thread overlays and hotkey-window routes.
 */
export function isCompactWindowRoutePath(
  path: string | null | undefined,
): boolean {
  if (!path) {
    return false;
  }
  return COMPACT_WINDOW_PATTERNS.some(
    (pattern) => matchPath({ path: pattern, end: true }, path) != null,
  );
}

export function isCompactWindowContext({
  pathname,
  initialRoute,
}: RouteContext): boolean {
  return (
    isCompactWindowRoutePath(pathname) || isCompactWindowRoutePath(initialRoute)
  );
}

export function isCompactWindowContextFromWindow(): boolean {
  return isCompactWindowContext(readWindowRouteContext());
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
