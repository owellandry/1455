import type * as AppServer from "app-server-types";
import type { ExtendedAuthMethod } from "protocol";
import { createContext } from "react";

export interface AuthContextValue {
  /** Is the auth state still being loaded? */
  isLoading: boolean;

  /**
   * Set if user has an OpenAI auth method available to them.
   * Whether it is in use is determined by `authMethod`.
   */
  openAIAuth: AppServer.AuthMode | null;

  /**
   * True if user has the Copilot API available to them (which implies they are
   * authenticated to use it). Whether it is in use is determined by
   * `authMethod`.
   */
  isCopilotApiAvailable: boolean;

  /** Authentication method is in use; undefined if not logged in */
  authMethod: ExtendedAuthMethod | null;

  /** Does the use of the server require authentication of some form?
   * This can be false if using a custom provider.
   */
  requiresAuth: boolean;

  /**
   * ChatGPT account ID for the current user.
   * Present only when `authMethod === "chatgpt"` and available.
   */
  accountId: string | null;

  /**
   * ChatGPT user ID for the current user.
   * Present only when `authMethod === "chatgpt"` and available.
   */
  userId: string | null;

  /**
   * Email address of the currently logged-in user.
   * Present only when `authMethod === "chatgpt"` and available.
   */
  email: string | null;

  /**
   * ChatGPT plan for the current user (e.g., "free", "plus", etc.).
   * Present only when `authMethod === "chatgpt"` and available. This
   * information might be stale. Use as fallback only if
   * useCurrentAccount fails to provide an up-to-date plan.
   */
  planAtLogin: string | null;

  setAuthMethod: (method: ExtendedAuthMethod) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
