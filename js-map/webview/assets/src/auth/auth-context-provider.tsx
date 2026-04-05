import type { ExtendedAuthMethod } from "protocol";
import type React from "react";
import { type ReactNode, useCallback, useMemo } from "react";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useUpdateAuthNonce } from "@/auth/use-auth";
import { useIsCopilotApiAvailable } from "@/auth/use-is-copilot-api-available";
import { useGlobalState } from "@/hooks/use-global-state";
import { useWindowType } from "@/hooks/use-window-type";
import { resetPersistedAtoms } from "@/utils/persisted-atom";
import { useFetchFromVSCode } from "@/vscode-api";

import type { AuthContextValue } from "./auth-context";
import { AuthContext } from "./auth-context";
import { useAppServerManagerAuth } from "./use-app-server-manager-auth";

/** Provides authentication state sourced from the CLI */
export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const manager = useDefaultAppServerManager();
  const updateAuthNonce = useUpdateAuthNonce();
  const isCopilotApiAvailable = useIsCopilotApiAvailable();
  const windowType = useWindowType();
  const shouldUseWindowsStartupAuthTimeout =
    windowType === "electron" &&
    document.documentElement.dataset.codexOs === "win32";

  const { data: useCopilotAuthQuery, isLoading: isUseCopilotAuthLoading } =
    useGlobalState("use-copilot-auth-if-available");
  const handleLogout = useCallback((): void => {
    updateAuthNonce();
    resetPersistedAtoms();
  }, [updateAuthNonce]);
  const { authState, isLoading, setAuthMethod } = useAppServerManagerAuth(
    manager,
    {
      isCopilotApiAvailable,
      useCopilotAuthIfAvailable: isUseCopilotAuthLoading
        ? false
        : (useCopilotAuthQuery ?? false),
      shouldUseWindowsStartupAuthTimeout,
      onLogout: handleLogout,
    },
  );
  const resolvedAuthState = authState ?? {
    openAIAuth: null,
    authMethod: null,
    requiresAuth: true,
    email: null,
    planAtLogin: null,
  };

  const accountInfoQuery = useFetchFromVSCode("account-info", {
    queryConfig: {
      enabled: resolvedAuthState.authMethod === "chatgpt",
    },
  });
  const accountInfo = accountInfoQuery.data;
  const { openAIAuth, authMethod, requiresAuth } = resolvedAuthState;

  const value: AuthContextValue = useMemo(
    () => ({
      isLoading,
      openAIAuth,
      isCopilotApiAvailable,
      authMethod,
      requiresAuth,
      userId:
        authMethod === "chatgpt" && accountInfoQuery.isSuccess
          ? (accountInfo?.userId ?? null)
          : null,
      accountId:
        authMethod === "chatgpt" && accountInfoQuery.isSuccess
          ? (accountInfo?.accountId ?? null)
          : null,
      email:
        authMethod === "chatgpt"
          ? accountInfoQuery.isSuccess
            ? (accountInfo?.email ?? null)
            : resolvedAuthState.email
          : null,
      planAtLogin:
        authMethod === "chatgpt"
          ? accountInfoQuery.isSuccess
            ? (accountInfo?.plan ?? null)
            : resolvedAuthState.planAtLogin
          : null,
      setAuthMethod: (method: ExtendedAuthMethod): void => {
        setAuthMethod(method);
      },
    }),
    [
      isLoading,
      openAIAuth,
      isCopilotApiAvailable,
      authMethod,
      requiresAuth,
      accountInfo?.userId,
      accountInfo?.accountId,
      accountInfo?.email,
      accountInfo?.plan,
      accountInfoQuery.isSuccess,
      resolvedAuthState.email,
      resolvedAuthState.planAtLogin,
      setAuthMethod,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
