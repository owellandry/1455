import {
  captureException,
  init as initSentry,
  setTag,
  setUser,
} from "@sentry/browser";
import {
  BuildFlavor,
  CODEX_APPS_SENTRY_DSN,
  EXTENSION_SENTRY_APP_SESSION_ID_META_NAME,
  EXTENSION_SENTRY_BUILD_FLAVOR_META_NAME,
  EXTENSION_SENTRY_VERSION_META_NAME,
  EXTENSION_WEBVIEW_SENTRY_URL_PREFIX,
  type ExtendedAuthMethod,
  getSentryRelease,
} from "protocol";

import { getRendererErrorBoundaryCapture } from "./sentry-error-reporting";

type ExtensionSentryMetadata = {
  buildFlavor: BuildFlavor | null;
  codexAppSessionId: string | null;
  extensionVersion: string | null;
};

const ENVIRONMENT = __DEV__ ? "dev" : "prod";
const IS_SENTRY_DISABLED = __STORYBOOK__ || __TEST__;

let didInit = false;

export function initRendererSentry(): void {
  if (IS_SENTRY_DISABLED || didInit) {
    return;
  }
  didInit = true;

  const { buildFlavor, codexAppSessionId, extensionVersion } =
    getExtensionSentryMetadata();

  initSentry({
    dsn: CODEX_APPS_SENTRY_DSN,
    environment: ENVIRONMENT,
    release:
      extensionVersion == null ? undefined : getSentryRelease(extensionVersion),
  });

  setTag("bundle", "webview");
  setTag("host", "extension");
  if (codexAppSessionId != null) {
    setTag("sessionId", codexAppSessionId);
  }
  if (buildFlavor != null) {
    setTag("buildFlavor", buildFlavor);
  }
}

export function setRendererSentryUser(user: {
  authMethod: ExtendedAuthMethod | null;
  userId: string | null;
}): void {
  if (IS_SENTRY_DISABLED) {
    return;
  }

  setUser(user?.userId == null ? null : { ...user, email: undefined });
}

export function reportRendererErrorBoundary(
  error: Error,
  options: { boundaryName: string; componentStack: string },
): string {
  return captureRendererException(error, {
    boundaryName: options.boundaryName,
    componentStack: options.componentStack,
  });
}

function captureRendererException(
  error: Error,
  options?: {
    boundaryName?: string;
    componentStack?: string;
  },
): string {
  if (IS_SENTRY_DISABLED) {
    return "";
  }

  try {
    if (options?.boundaryName != null && options.componentStack != null) {
      const captureContext = getRendererErrorBoundaryCapture(error, {
        boundaryName: options.boundaryName,
        componentStack: options.componentStack,
        transformStack: getStackTraceWithStableAssetUrls,
      });
      return captureException(captureContext.error, captureContext);
    }

    const reportableError = new Error(error.message);
    reportableError.name = error.name;
    reportableError.stack = getStackTraceWithStableAssetUrls(error.stack) ?? "";
    return captureException(reportableError);
  } catch {
    // Never throw while attempting to report telemetry.
    return "";
  }
}

function getStackTraceWithStableAssetUrls(
  stack: string | undefined,
): string | null {
  if (stack == null) {
    return null;
  }

  return stack.replace(/(?:\w[\w+.-]*):\/\/[^\s)]+/g, (url): string => {
    const assetIndex = url.indexOf("/assets/");
    if (assetIndex === -1) {
      return url;
    }

    return `${EXTENSION_WEBVIEW_SENTRY_URL_PREFIX}${url.slice(assetIndex + 1)}`;
  });
}

function getExtensionSentryMetadata(): ExtensionSentryMetadata {
  return {
    buildFlavor: getBuildFlavorMetaContent(),
    codexAppSessionId: getMetaContent(
      EXTENSION_SENTRY_APP_SESSION_ID_META_NAME,
    ),
    extensionVersion: getMetaContent(EXTENSION_SENTRY_VERSION_META_NAME),
  };
}

function getBuildFlavorMetaContent(): BuildFlavor | null {
  const buildFlavor = getMetaContent(EXTENSION_SENTRY_BUILD_FLAVOR_META_NAME);
  if (buildFlavor == null) {
    return null;
  }
  return BuildFlavor.parse(buildFlavor);
}

function getMetaContent(name: string): string | null {
  return (
    document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ??
    null
  );
}
