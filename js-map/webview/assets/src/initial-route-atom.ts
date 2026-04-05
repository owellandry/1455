function getInitialRoute(): string | null {
  const meta = document.querySelector(
    'meta[name="initial-route"]',
  ) as HTMLMetaElement | null;
  if (meta?.content?.trim()) {
    return meta.content.trim();
  }
  const searchRoute = new URL(window.location.href).searchParams.get(
    "initialRoute",
  );
  return searchRoute ? searchRoute.trim() : null;
}

/**
 * This will be set when an initial route meta tag is injected into the document.
 * When set, this webview should try to stay on the route it started on because when vs code reloads, it will reload this initial route.
 * Instead, when navigating, use the `navigate-in-new-editor-tab` message bus message to navigate to a new editor tab.
 */
export const initialRoute = getInitialRoute();
