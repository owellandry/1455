import type { BuildFlavor } from "./build-flavor";

export type SentryInitOptions = {
  buildFlavor: BuildFlavor;
  buildNumber: string | null;
  appVersion: string;
  codexAppSessionId: string;
};

export const CODEX_APPS_SENTRY_DSN =
  "https://6719eaa18601933a26ac21499dcaba2f@o33249.ingest.us.sentry.io/4510999349821440";
export const EXTENSION_SENTRY_VERSION_META_NAME = "codex-extension-version";
export const EXTENSION_SENTRY_APP_SESSION_ID_META_NAME = "codex-session-id";
export const EXTENSION_SENTRY_BUILD_FLAVOR_META_NAME = "codex-build-flavor";
export const EXTENSION_WEBVIEW_SENTRY_URL_PREFIX = "codex-webview:///";

export function getSentryDsnOrigin(dsn: string): string {
  return new URL(dsn).origin;
}

export function getBuildFlavorIsSentryTracingEnabled(
  buildFlavor: BuildFlavor,
): boolean {
  void buildFlavor;
  return false;
}

export function getSentryRelease(version: string): string {
  return `codex@${version}`;
}
