import { GlobalStateKey } from "protocol";

import { useAuth } from "@/auth/use-auth";
import { useGlobalState } from "@/hooks/use-global-state";
import { useWindowType } from "@/hooks/use-window-type";

export type NuxToShow =
  /** The user has seen all NUXes to date: do not show anything. */
  | "none"

  /**
   * Show the user the full NUX for a ChatGPT-authenticated user.
   * At the end, the user should choose between gpt-5 and gpt-5-codex.
   */
  | "2025-09-15-full-chatgpt-auth"

  /**
   * The user is an authenticated API key user, so show the full NUX, but do
   * not give them the option to choose gpt-5-codex at the end.
   */
  | "2025-09-15-apikey-auth";

/**
 * `undefined` indicates that we are still loading.
 */
export function useNux(): NuxToShow | undefined {
  // TODO(mbolin): Perhaps we should support multi-fetch for global state?
  const { data: hasSeenNux, isLoading: isNuxStateLoading } = useGlobalState(
    GlobalStateKey.NUX_2025_09_15,
  );

  const { authMethod } = useAuth();
  const windowType = useWindowType();

  // Once we have proper nux support for other window types, we can remove this.
  const isExtension = windowType === "extension";
  if (!isExtension) {
    return "none";
  }

  if (isNuxStateLoading) {
    return undefined;
  }

  if (hasSeenNux) {
    return "none";
  }

  switch (authMethod) {
    case "chatgptAuthTokens":
    case "chatgpt":
      return "2025-09-15-full-chatgpt-auth";
    case "apikey":
    case "copilot":
      return "2025-09-15-apikey-auth";
    case null:
      // The user is not logged in, so we can't show them a NUX that
      // requires authentication.
      return "none";
  }
}
