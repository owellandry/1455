import { useSetAtom } from "jotai";
import { useScope } from "maitai";
import { maybeErrorToString } from "protocol";
import type { ReactElement, ReactNode } from "react";
import { useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useAuth } from "@/auth/use-auth";
import { AnimatedIcon } from "@/components/animated-icon";
import { Button } from "@/components/button";
import { toast$ } from "@/components/toaster/toast-signal";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { messageBus } from "@/message-bus";
import { aPostLoginWelcomePending } from "@/onboarding/onboarding-state";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";
import { useGate } from "@/statsig/statsig";

import { OnboardingLoginContent } from "./onboarding-login-content";
import { OnboardingShell } from "./onboarding-shell";
import { SnakeGame } from "./snake-game";

export function OnboardingLoginPage(): ReactElement {
  const prefersReducedMotion = useReducedMotion();
  const auth = useAuth();
  const navigate = useNavigate();
  const intl = useIntl();
  const scope = useScope(AppScope);
  const mcpManager = useDefaultAppServerManager();
  const setPostLoginWelcomePending = useSetAtom(aPostLoginWelcomePending);

  const showSignInErrorToast = (rawMessage: string): void => {
    scope.get(toast$).warning(
      intl.formatMessage(
        {
          id: "electron.onboarding.login.error",
          defaultMessage: "Sign-in failed: {rawMessage}",
          description:
            "Toast shown when sign-in fails on the desktop onboarding page",
        },
        { rawMessage },
      ),
    );
  };

  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const isChatGptSignInPending = abortController != null;
  const [isSSHConfigEntryVisible, setIsSSHConfigEntryVisible] =
    useState<boolean>(false);
  const [isApiKeyEntryVisible, setIsApiKeyEntryVisible] =
    useState<boolean>(false);
  const [isSnakeActive, setIsSnakeActive] = useState<boolean>(false);
  const [apiKeyValue, setApiKeyValue] = useState<string>("");
  const [sshConfigValue, setSshConfigValue] = useState<string>("");
  const [isApiKeySignInPending, setIsApiKeySignInPending] =
    useState<boolean>(false);
  const snakeAudioContextRef = useRef<AudioContext | null>(null);
  const exitSnakeGame = (): void => {
    setIsSnakeActive(false);
  };
  const ensureSnakeAudioReady = (): void => {
    if (snakeAudioContextRef.current != null) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (!("AudioContext" in window)) {
      return;
    }
    snakeAudioContextRef.current = new window.AudioContext();
    if (snakeAudioContextRef.current.state === "suspended") {
      void snakeAudioContextRef.current.resume();
    }
  };

  const isRemoteSshEnabled = useGate(
    __statsigName("codex-app-enable-remote-ssh"),
  );

  const handleChatGptSignIn = async (): Promise<void> => {
    if (isChatGptSignInPending) {
      abortController?.abort();
      setAbortController(null);
      return;
    }

    scope.get(productEventLogger$).log({
      eventName: "codex_onboarding_login_method_selected",
      metadata: { method: "chatgpt" },
    });
    const controller = new AbortController();
    setAbortController(controller);
    try {
      const { authUrl, completion } =
        await mcpManager.loginWithChatGpt(controller);
      if (authUrl) {
        messageBus.dispatchMessage("open-in-browser", { url: authUrl });
      }
      const result = await completion;
      if (result.success) {
        scope.get(productEventLogger$).log({
          eventName: "codex_onboarding_login_completed",
          metadata: { method: "chatgpt", success: true },
        });
        auth.setAuthMethod("chatgpt");
        setPostLoginWelcomePending(true);
        void navigate("/welcome", { replace: true });
      } else {
        scope.get(productEventLogger$).log({
          eventName: "codex_onboarding_login_completed",
          metadata: {
            method: "chatgpt",
            success: false,
            error_kind: classifyOnboardingErrorKind(result.error),
          },
        });
        showSignInErrorToast(
          maybeErrorToString(result.error ?? "Unknown error"),
        );
      }
    } catch (error) {
      if ((error as { name?: string } | null)?.name === "AbortError") {
        scope.get(productEventLogger$).log({
          eventName: "codex_onboarding_login_completed",
          metadata: {
            method: "chatgpt",
            success: false,
            error_kind: "abort",
          },
        });
        return;
      }
      scope.get(productEventLogger$).log({
        eventName: "codex_onboarding_login_completed",
        metadata: {
          method: "chatgpt",
          success: false,
          error_kind: classifyOnboardingErrorKind(error),
        },
      });
      showSignInErrorToast(maybeErrorToString(error));
    } finally {
      setAbortController(null);
    }
  };

  const handleApiKeySubmit = async (): Promise<void> => {
    const trimmedKey = apiKeyValue.trim();
    if (!trimmedKey || isApiKeySignInPending) {
      return;
    }
    setIsApiKeySignInPending(true);
    try {
      await mcpManager.loginWithApiKey(trimmedKey);
      scope.get(productEventLogger$).log({
        eventName: "codex_onboarding_login_completed",
        metadata: { method: "apikey", success: true },
      });
      auth.setAuthMethod("apikey");
      setPostLoginWelcomePending(true);
      void navigate("/welcome", { replace: true });
    } catch (error) {
      scope.get(productEventLogger$).log({
        eventName: "codex_onboarding_login_completed",
        metadata: {
          method: "apikey",
          success: false,
          error_kind: classifyOnboardingErrorKind(error),
        },
      });
      showSignInErrorToast(maybeErrorToString(error));
    } finally {
      setIsApiKeySignInPending(false);
    }
  };

  const handleSshConfigSubmit = (): void => {
    const trimmedConfig = sshConfigValue.trim();
    if (!trimmedConfig) {
      return;
    }
    messageBus.dispatchMessage("electron-add-ssh-host", {
      host: trimmedConfig,
      openWindow: true,
    });
    setIsSSHConfigEntryVisible(false);
    setSshConfigValue("");
  };

  const handleSshConfigCancel = (): void => {
    setIsSSHConfigEntryVisible(false);
    setSshConfigValue("");
  };

  const sshConfigEntry = (): ReactNode => (
    <div className="flex w-full flex-col gap-3">
      <label className="text-base font-medium text-token-foreground">
        <FormattedMessage
          id="electron.onboarding.login.sshConfig.hostnameLabel"
          defaultMessage="SSH Hostname"
          description="Label for SSH hostname to connect to"
        />
        <input
          autoFocus
          className="mt-2 w-full rounded-xl border border-token-border bg-token-input-background px-4 py-2.5 focus:ring-2 focus:ring-black/15 focus:outline-none"
          placeholder={intl.formatMessage({
            id: "electron.onboarding.login.sshConfig.hostnamePlaceholder",
            defaultMessage: "devbox.openai.com",
            description: "Placeholder for the ssh hostname input to connect to",
          })}
          value={sshConfigValue}
          onChange={(event) => setSshConfigValue(event.target.value)}
        />
      </label>
      <div className="flex items-center gap-2">
        <Button
          color="secondary"
          className="flex flex-1 justify-center py-2"
          onClick={handleSshConfigCancel}
        >
          <FormattedMessage
            id="electron.onboarding.login.sshConfig.cancel"
            defaultMessage="Cancel"
            description="Cancel button label for SSH config entry on desktop onboarding"
          />
        </Button>
        <Button
          className="flex flex-1 justify-center py-2"
          onClick={handleSshConfigSubmit}
          disabled={sshConfigValue.trim().length === 0}
        >
          <FormattedMessage
            id="electron.onboarding.login.sshConfig.continue"
            defaultMessage="Continue"
            description="Continue button label for SSH config sign-in on desktop onboarding"
          />
        </Button>
      </div>
    </div>
  );

  return (
    <OnboardingShell fullBleed={isSnakeActive} hideHeader={isSnakeActive}>
      <div
        className={
          isSnakeActive
            ? "flex h-full w-full"
            : "mt-32 flex h-full w-full max-w-[320px] flex-col items-center"
        }
      >
        {!isSnakeActive ? (
          <button
            className="group flex items-center justify-center rounded-full p-2"
            type="button"
            aria-label={intl.formatMessage({
              id: "electron.onboarding.login.snake.start",
              defaultMessage: "Play Snake",
              description:
                "Aria label for the Codex logo button to start Snake",
            })}
            onClick={() => {
              ensureSnakeAudioReady();
              setIsSnakeActive(true);
            }}
          >
            <AnimatedIcon
              className="text-token-foreground"
              animation="hello"
              animated={!prefersReducedMotion}
              size={48}
            />
          </button>
        ) : null}
        {!isSnakeActive ? (
          <>
            <span className="mt-4 text-center text-[24px] font-medium text-token-foreground">
              <FormattedMessage
                id="electron.onboarding.login.title"
                defaultMessage="Welcome to Codex"
                description="Title on the desktop onboarding login page"
              />
            </span>
            <span className="mt-1 text-center text-lg text-token-description-foreground">
              <FormattedMessage
                id="electron.onboarding.login.subtitle"
                defaultMessage="The best way to build with agents"
                description="Subtitle on the desktop onboarding login page"
              />
            </span>
          </>
        ) : null}

        <div
          className={
            isSnakeActive
              ? "flex h-full w-full"
              : "mt-8 flex w-full flex-col items-center"
          }
        >
          {isSnakeActive ? (
            <SnakeGame
              onExit={exitSnakeGame}
              audioContextRef={snakeAudioContextRef}
            />
          ) : (
            <>
              {!isSSHConfigEntryVisible ? (
                <OnboardingLoginContent
                  apiKeyValue={apiKeyValue}
                  isApiKeyEntryVisible={isApiKeyEntryVisible}
                  isApiKeySignInPending={isApiKeySignInPending}
                  isChatGptSignInPending={isChatGptSignInPending}
                  onApiKeySecondaryAction={() => {
                    setIsApiKeyEntryVisible(false);
                    setIsApiKeySignInPending(false);
                    setApiKeyValue("");
                  }}
                  onApiKeySubmit={handleApiKeySubmit}
                  onApiKeyValueChange={setApiKeyValue}
                  onChatGptSignIn={handleChatGptSignIn}
                  onShowApiKeyEntry={() => {
                    scope.get(productEventLogger$).log({
                      eventName: "codex_onboarding_login_method_selected",
                      metadata: { method: "apikey" },
                    });
                    setIsApiKeyEntryVisible(true);
                  }}
                  onShowSshEntry={
                    isRemoteSshEnabled
                      ? (): void => {
                          scope.get(productEventLogger$).log({
                            eventName: "codex_onboarding_login_method_selected",
                            metadata: { method: "ssh" },
                          });
                          setIsSSHConfigEntryVisible(true);
                        }
                      : undefined
                  }
                  apiKeySecondaryActionLabel={
                    <FormattedMessage
                      id="electron.onboarding.login.apikey.cancel"
                      defaultMessage="Cancel"
                      description="Cancel button label for API key entry on desktop onboarding"
                    />
                  }
                />
              ) : null}
              {isSSHConfigEntryVisible && sshConfigEntry()}
            </>
          )}
        </div>
      </div>
    </OnboardingShell>
  );
}

function classifyOnboardingErrorKind(
  error: unknown,
): "abort" | "network" | "auth" | "unknown" {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";
  if (!message) {
    return "unknown";
  }
  const normalizedMessage = message.toLowerCase();
  if (
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("fetch") ||
    normalizedMessage.includes("timeout")
  ) {
    return "network";
  }
  if (
    normalizedMessage.includes("auth") ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("forbidden") ||
    normalizedMessage.includes("invalid api key") ||
    normalizedMessage.includes("401") ||
    normalizedMessage.includes("403")
  ) {
    return "auth";
  }
  return "unknown";
}
