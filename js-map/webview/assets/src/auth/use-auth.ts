import { useContext } from "react";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { useAppServerManagerForHost } from "@/app-server/app-server-manager-hooks";
import { useIsCopilotApiAvailable } from "@/auth/use-is-copilot-api-available";
import { useGlobalState } from "@/hooks/use-global-state";
import { useWindowType } from "@/hooks/use-window-type";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";

import { AuthContext, type AuthContextValue } from "./auth-context";
import { AuthNonceContext } from "./auth-nonce-context";
import { useAppServerManagerAuth } from "./use-app-server-manager-auth";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function useAuthForHost(hostId: string): AuthContextValue | null {
  const manager = useAppServerManagerForHost(hostId);
  return useAuthForAppServerManager(manager);
}

export function useAuthForAppServerManager(
  manager: AppServerManager | null,
): AuthContextValue | null {
  const isDefaultManager = manager?.getHostId() === DEFAULT_HOST_ID;
  const isCopilotApiAvailable = useIsCopilotApiAvailable();
  const windowType = useWindowType();
  const { data: useCopilotAuthQuery, isLoading: isUseCopilotAuthLoading } =
    useGlobalState("use-copilot-auth-if-available");
  const { authState, isLoading, setAuthMethod } = useAppServerManagerAuth(
    manager,
    {
      isCopilotApiAvailable: isDefaultManager ? isCopilotApiAvailable : false,
      useCopilotAuthIfAvailable:
        isDefaultManager && !isUseCopilotAuthLoading
          ? (useCopilotAuthQuery ?? false)
          : false,
      shouldUseWindowsStartupAuthTimeout:
        isDefaultManager &&
        windowType === "electron" &&
        document.documentElement.dataset.codexOs === "win32",
    },
  );

  if (manager == null) {
    return null;
  }

  const resolvedAuthState = authState ?? {
    openAIAuth: null,
    authMethod: null,
    requiresAuth: true,
    email: null,
    planAtLogin: null,
  };

  return {
    ...resolvedAuthState,
    isLoading,
    isCopilotApiAvailable: isDefaultManager ? isCopilotApiAvailable : false,
    accountId: null,
    userId: null,
    setAuthMethod,
  };
}

/**
 * Returns a function that, when called, bumps the auth nonce.
 * This forces a remount of UI keyed by the nonce, resetting per-login state.
 */
export function useUpdateAuthNonce(): () => void {
  const updateNonce = useContext(AuthNonceContext);
  if (!updateNonce) {
    throw new Error("useUpdateAuthNonce must be used within AuthNonceProvider");
  }
  return updateNonce;
}
