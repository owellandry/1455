import type { QueryClient } from "@tanstack/react-query";
import type { MessageForView } from "protocol";
import type { NavigateFunction } from "react-router";

export function handleIpcBroadcastMessage({
  claimAppConnectOAuthCallback,
  isCompactWindow,
  message,
  navigate,
  queryClient,
}: {
  claimAppConnectOAuthCallback: (fullRedirectUrl: string) => boolean;
  isCompactWindow: boolean;
  message: Extract<MessageForView, { type: "ipc-broadcast" }>;
  navigate: NavigateFunction;
  queryClient: QueryClient;
}): void {
  if (message.method === "app-connect-oauth-callback-received") {
    if (claimAppConnectOAuthCallback(message.params.fullRedirectUrl)) {
      void navigate("/connector/oauth_callback", {
        state: {
          fullRedirectUrl: message.params.fullRedirectUrl,
        },
      });
    }
    return;
  }
  if (message.method === "query-cache-invalidate") {
    void queryClient.invalidateQueries({ queryKey: message.params.queryKey });
    return;
  }
  if (
    !isCompactWindow &&
    (message.method === "thread-archived" ||
      message.method === "thread-unarchived")
  ) {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }
}
