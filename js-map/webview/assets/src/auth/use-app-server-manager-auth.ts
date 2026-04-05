import type * as AppServer from "app-server-types";
import { useEffect, useState } from "react";

import type { AppServerManager } from "@/app-server/app-server-manager";

const WINDOWS_STARTUP_AUTH_TIMEOUT_MS = 2_000;

type ManagerAuthState = {
  openAIAuth: AppServer.AuthMode | null;
  authMethod: AppServer.AuthMode | "copilot" | null;
  requiresAuth: boolean;
  email: string | null;
  planAtLogin: string | null;
};

function getAuthModeFromAccount(
  account: AppServer.v2.Account | null,
): AppServer.AuthMode | null {
  if (account == null) {
    return null;
  }
  if (account.type === "chatgpt") {
    return "chatgpt";
  }
  return "apikey";
}

export function useAppServerManagerAuth(
  manager: AppServerManager | null,
  options: {
    isCopilotApiAvailable: boolean;
    useCopilotAuthIfAvailable: boolean;
    shouldUseWindowsStartupAuthTimeout: boolean;
    onLogout?: () => void;
  },
): {
  isLoading: boolean;
  authState: ManagerAuthState | null;
  setAuthMethod: (method: AppServer.AuthMode | "copilot") => void;
} {
  const {
    isCopilotApiAvailable,
    useCopilotAuthIfAvailable,
    shouldUseWindowsStartupAuthTimeout,
    onLogout,
  } = options;
  const [isLoading, setIsLoading] = useState<boolean>(manager != null);
  const [authState, setAuthState] = useState<ManagerAuthState | null>(null);

  useEffect(() => {
    if (manager == null) {
      setAuthState(null);
      setIsLoading(false);
      return;
    }
    setAuthState(null);
    setIsLoading(true);
  }, [manager]);

  useEffect(() => {
    if (manager == null) {
      return;
    }

    let canceled = false;
    let accountLoaded = false;
    let startupAuthTimeout: ReturnType<typeof setTimeout> | null = null;

    const refreshAccount = (): void => {
      void manager
        .getAccount()
        .then((response) => {
          accountLoaded = true;
          if (startupAuthTimeout != null) {
            clearTimeout(startupAuthTimeout);
          }
          if (canceled) {
            return;
          }
          setIsLoading(false);
          setAuthState(
            buildAuthStateFromAccount(response, {
              isCopilotApiAvailable,
              useCopilotAuthIfAvailable,
            }),
          );
        })
        .catch(() => {
          accountLoaded = true;
          if (startupAuthTimeout != null) {
            clearTimeout(startupAuthTimeout);
          }
          if (!canceled) {
            setIsLoading(false);
            setAuthState((prev) => prev ?? buildDefaultAuthState());
          }
        });
    };

    if (shouldUseWindowsStartupAuthTimeout) {
      startupAuthTimeout = setTimeout(() => {
        if (canceled || accountLoaded) {
          return;
        }
        setIsLoading(false);
        setAuthState((prev) => prev ?? buildDefaultAuthState());
      }, WINDOWS_STARTUP_AUTH_TIMEOUT_MS);
    }

    refreshAccount();

    const onAuthStatus = (status: {
      authMethod: AppServer.AuthMode | null;
    }): void => {
      setAuthState((prev) => {
        if (status.authMethod == null && prev?.authMethod != null) {
          onLogout?.();
          return buildDefaultAuthState();
        }

        if (prev == null) {
          if (status.authMethod == null) {
            return prev;
          }
          return {
            ...buildDefaultAuthState(),
            authMethod: status.authMethod,
          };
        }

        return {
          ...prev,
          authMethod: status.authMethod ?? null,
        };
      });
      refreshAccount();
    };

    manager.addAuthStatusCallback(onAuthStatus);
    return (): void => {
      canceled = true;
      if (startupAuthTimeout != null) {
        clearTimeout(startupAuthTimeout);
      }
      manager.removeAuthStatusCallback(onAuthStatus);
    };
  }, [
    manager,
    isCopilotApiAvailable,
    onLogout,
    shouldUseWindowsStartupAuthTimeout,
    useCopilotAuthIfAvailable,
  ]);

  return {
    isLoading,
    authState,
    setAuthMethod: (method): void => {
      setAuthState((prev) => ({
        ...(prev ?? buildDefaultAuthState()),
        authMethod: method,
      }));
    },
  };
}

function buildDefaultAuthState(): ManagerAuthState {
  return {
    openAIAuth: null,
    authMethod: null,
    requiresAuth: true,
    email: null,
    planAtLogin: null,
  };
}

function buildAuthStateFromAccount(
  response: AppServer.v2.GetAccountResponse,
  options: {
    isCopilotApiAvailable: boolean;
    useCopilotAuthIfAvailable: boolean;
  },
): ManagerAuthState {
  const openAIAuth = getAuthModeFromAccount(response.account);
  const authMethod =
    options.useCopilotAuthIfAvailable && options.isCopilotApiAvailable
      ? "copilot"
      : openAIAuth;

  return {
    openAIAuth,
    authMethod,
    requiresAuth:
      authMethod === "copilot" || (response.requiresOpenaiAuth ?? true),
    email: response.account?.type === "chatgpt" ? response.account.email : null,
    planAtLogin:
      response.account?.type === "chatgpt" ? response.account.planType : null,
  };
}
