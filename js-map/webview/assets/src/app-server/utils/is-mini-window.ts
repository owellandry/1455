export function isMiniWindow(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (window.location.pathname.startsWith("/thread-overlay/")) {
    return true;
  }
  const params = new URLSearchParams(window.location.search);
  const initialRoute = params.get("initialRoute");
  return initialRoute?.startsWith("/thread-overlay/") ?? false;
}
