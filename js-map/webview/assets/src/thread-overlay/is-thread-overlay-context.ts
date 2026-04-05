type RouteContext = { pathname: string; initialRoute: string | null };

const THREAD_OVERLAY_ROUTE_PREFIX = "/thread-overlay";

export function isThreadOverlayRoutePath(
  path: string | null | undefined,
): boolean {
  return isRoutePathWithPrefix(path, THREAD_OVERLAY_ROUTE_PREFIX);
}

export function isThreadOverlayContext({
  pathname,
  initialRoute,
}: RouteContext): boolean {
  return (
    isThreadOverlayRoutePath(pathname) || isThreadOverlayRoutePath(initialRoute)
  );
}

export function isThreadOverlayContextFromWindow(): boolean {
  return isThreadOverlayContext(readWindowRouteContext());
}

function isRoutePathWithPrefix(
  path: string | null | undefined,
  prefix: string,
): boolean {
  if (!path) {
    return false;
  }
  return path === prefix || path.startsWith(`${prefix}/`);
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
