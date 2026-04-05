import { useEffect } from "react";

import { useAuth } from "./auth/use-auth";
import { isCompactWindowContextFromWindow } from "./compact-window/is-compact-window-context";
import { messageBus } from "./message-bus";
import type { MessageToExtensionOfType } from "./message-bus";
import { useAnalyticsEnabled } from "./queries/config-queries";
import { setRendererSentryUser } from "./sentry-init";

export function TelemetryUserReporter(): null {
  const isCompactWindow = isCompactWindowContextFromWindow();
  const auth = useAuth();
  const { authMethod, userId } = auth;
  const {
    data: analyticsEnabled,
    isLoading: isAnalyticsSettingLoading,
    isError: isAnalyticsSettingError,
  } = useAnalyticsEnabled(!isCompactWindow);

  const isSentryUserReady =
    !isCompactWindow &&
    !auth.isLoading &&
    !isAnalyticsSettingLoading &&
    !isAnalyticsSettingError;

  useEffect(() => {
    if (!isSentryUserReady) {
      return;
    }

    const telemetryUser: Omit<
      MessageToExtensionOfType<"set-telemetry-user">,
      "type"
    > = {
      authMethod,
      userId: analyticsEnabled ? (userId ?? null) : null,
      // Don't send email to Sentry or Datadog.
      email: null,
    };

    setRendererSentryUser(telemetryUser);
    messageBus.dispatchMessage("set-telemetry-user", telemetryUser);
  }, [analyticsEnabled, authMethod, userId, isSentryUserReady]);

  return null;
}
