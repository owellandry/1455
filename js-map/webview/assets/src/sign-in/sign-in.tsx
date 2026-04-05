import { useScope } from "maitai";
import { maybeErrorToString } from "protocol";
import React, { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { useAuth } from "@/auth/use-auth";
import { useIsCopilotApiAvailable } from "@/auth/use-is-copilot-api-available";
import { Button } from "@/components/button";
import { toast$ } from "@/components/toaster/toast-signal";
import { useGlobalState } from "@/hooks/use-global-state";
import LinkExternalIcon from "@/icons/link-external.svg";
import { AppScope } from "@/scopes/app-scope";
import { fetchFromVSCode } from "@/vscode-api";

import { useDefaultAppServerManager } from "../app-server/app-server-manager-hooks";
import { messageBus } from "../message-bus";
import { AsciiShader } from "./ascii-shader";
import { useAsciiEngine } from "./use-ascii-engine";

export function SignInPage(): React.ReactElement {
  const auth = useAuth();
  const scope = useScope(AppScope);
  const navigate = useNavigate();
  const intl = useIntl();
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const isChatGptSignInPending = abortController != null;
  const isCopilotSignInAvailable = useIsCopilotApiAvailable();
  const [isApiKeySignInVisible, setIsApiKeySignInVisible] = useState(false);
  const [defaultApiKeyFromEnv, setDefaultApiKeyFromEnv] = useState<
    string | null
  >(null);
  const [apiKeyValue, setApiKeyValue] = useState<string>("");
  const [isApiKeyLoginPending, setIsApiKeyLoginPending] = useState(false);
  const completionRef = useRef<Promise<{
    success: boolean;
    error?: string;
  }> | null>(null);
  const apiKeyInputRef = useRef<HTMLInputElement | null>(null);
  const mcpManager = useDefaultAppServerManager();
  const showSignInErrorToast = (rawMessage: string): void => {
    const message = intl.formatMessage(
      {
        id: "codex.signInFailed.message",
        defaultMessage: "Sign-in failed: {rawMessage}",
        description: "Sign-in failure toast message with error details",
      },
      { rawMessage },
    );
    scope.get(toast$).warning(message);
  };

  useEffect(() => {
    if (isApiKeySignInVisible) {
      apiKeyInputRef.current?.focus();
      apiKeyInputRef.current?.select();
    }
  }, [isApiKeySignInVisible]);

  useEffect(() => {
    let canceled = false;
    void (async (): Promise<void> => {
      try {
        const response = await fetchFromVSCode("openai-api-key");
        if (canceled) {
          return;
        }
        const envValue = response?.value ?? null;
        setDefaultApiKeyFromEnv(envValue);
        setApiKeyValue((currentValue) =>
          currentValue.length > 0 ? currentValue : (envValue ?? ""),
        );
      } catch {
        if (!canceled) {
          setDefaultApiKeyFromEnv(null);
        }
      }
    })();
    return (): void => {
      canceled = true;
    };
  }, []);

  const handleChatGptSignIn = async (): Promise<void> => {
    if (isChatGptSignInPending) {
      abortController?.abort();
      setAbortController(null);
      completionRef.current = null;
      return;
    }

    const ac = new AbortController();
    setAbortController(ac);

    try {
      const { authUrl, completion } = await mcpManager.loginWithChatGpt(ac);
      completionRef.current = completion;
      if (authUrl) {
        messageBus.dispatchMessage("open-in-browser", {
          url: authUrl,
        });
      }
      const result = await completion;
      if (result.success) {
        auth.setAuthMethod("chatgpt");
        void navigate("/first-run");
      } else {
        showSignInErrorToast(
          maybeErrorToString(result.error ?? "Unknown error"),
        );
      }
    } catch (err) {
      const maybeAbortErr = err as { name?: string } | undefined;
      if (maybeAbortErr?.name === "AbortError") {
        return;
      }
      showSignInErrorToast(maybeErrorToString(err));
    } finally {
      setAbortController(null);
      completionRef.current = null;
    }
  };

  const { data: showCopilotLoginFirst } = useGlobalState(
    "show-copilot-login-first",
  );
  const { setData: setUseCopilotForCodexLogin } = useGlobalState(
    "use-copilot-auth-if-available",
  );
  const handleCopilotSignIn = async (): Promise<void> => {
    await setUseCopilotForCodexLogin(true);
    auth.setAuthMethod("copilot");
    void navigate("/first-run");
  };

  const handleApiKeySubmit = async (): Promise<void> => {
    const trimmedKey = apiKeyValue.trim();
    if (!trimmedKey || isApiKeyLoginPending) {
      return;
    }
    setIsApiKeyLoginPending(true);
    try {
      await mcpManager.loginWithApiKey(trimmedKey);
      auth.setAuthMethod("apikey");
      void navigate("/first-run");
    } catch (err) {
      showSignInErrorToast(maybeErrorToString(err));
    } finally {
      setIsApiKeyLoginPending(false);
    }
  };

  const isChatGptPrimarySignInButton =
    !isCopilotSignInAvailable || !showCopilotLoginFirst;
  const signInButtons = isChatGptPrimarySignInButton ? (
    <>
      <SignInWithChatGptButton
        isPrimary={true}
        handleChatGptSignIn={handleChatGptSignIn}
        isChatGptSignInPending={isChatGptSignInPending}
      />
      {!isChatGptSignInPending && isCopilotSignInAvailable && (
        <div className="pt-2">
          <SignInWithCopilotButton
            isPrimary={false}
            handleCopilotSignIn={handleCopilotSignIn}
          />
        </div>
      )}
    </>
  ) : (
    <>
      {!isChatGptSignInPending && (
        <SignInWithCopilotButton
          isPrimary={true}
          handleCopilotSignIn={handleCopilotSignIn}
        />
      )}
      {
        <div className="pt-2">
          <SignInWithChatGptButton
            isPrimary={false}
            handleChatGptSignIn={handleChatGptSignIn}
            isChatGptSignInPending={isChatGptSignInPending}
          />
        </div>
      }
    </>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-token-side-bar-background">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="-ml-6 h-full w-full"
          style={{
            WebkitMaskImage:
              "radial-gradient(ellipse at center, rgba(0,0,0,1) 25%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0) 50%)",
            maskImage:
              "radial-gradient(ellipse at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0) 78%)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
          }}
        >
          <AnimatedBackground />
        </div>
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center">
        <div className="pointer-events-none flex w-full flex-1 items-center justify-center pt-5">
          <h1 className="mb-4 max-w-[250px] text-3xl leading-tight font-medium text-token-foreground">
            <FormattedMessage
              id="codex.loggedOut.title"
              defaultMessage="Codex"
              description="Title on logged out screen"
            />
          </h1>
        </div>
        {!isApiKeySignInVisible && (
          <div className="flex w-full justify-center pb-4 sm:pb-6">
            <div className="mx-auto inline-flex w-max flex-col items-stretch">
              {signInButtons}
              {!isChatGptSignInPending && (
                <ApiKeyButton
                  setApiKeyValue={setApiKeyValue}
                  defaultApiKeyFromEnv={defaultApiKeyFromEnv}
                  isCopilotSignInAvailable={isCopilotSignInAvailable}
                  setIsApiKeySignInVisible={setIsApiKeySignInVisible}
                />
              )}
            </div>
          </div>
        )}
        {!isChatGptSignInPending && isApiKeySignInVisible && (
          <ApiKeySignInForm
            apiKeyValue={apiKeyValue}
            setApiKeyValue={setApiKeyValue}
            apiKeyInputRef={apiKeyInputRef}
            isApiKeyLoginPending={isApiKeyLoginPending}
            setIsApiKeyLoginPending={setIsApiKeyLoginPending}
            setIsApiKeySignInVisible={setIsApiKeySignInVisible}
            handleApiKeySubmit={handleApiKeySubmit}
          />
        )}
      </div>
    </div>
  );
}

const AnimatedBackground = React.memo(
  function AnimatedBackground(): React.ReactElement {
    const initialColumns = 130;
    const initialRows = 100;

    const { columns, rows, lines } = useAsciiEngine({
      initialColumns,
      initialRows,
      initialMode: "composite",
      preferredVideoKeyword: "blossom",
    });

    return (
      <AsciiShader lines={lines} columns={columns} rows={rows} autoCover />
    );
  },
);

function SignInWithChatGptButton({
  isPrimary,
  handleChatGptSignIn,
  isChatGptSignInPending,
}: {
  isPrimary: boolean;
  handleChatGptSignIn: () => Promise<void>;
  isChatGptSignInPending: boolean;
}): React.ReactElement {
  return (
    <SignInButton isPrimary={isPrimary} onClick={handleChatGptSignIn}>
      {isChatGptSignInPending ? (
        <FormattedMessage
          id="codex.loggedOut.signIn.cancel"
          defaultMessage="Cancel Sign-in"
          description="Cancel button for sign in"
        />
      ) : (
        <FormattedMessage
          id="codex.loggedOut.signIn"
          defaultMessage="Sign in with ChatGPT"
          description="Sign in button text on logged out screen"
        />
      )}
    </SignInButton>
  );
}

function SignInWithCopilotButton({
  isPrimary,
  handleCopilotSignIn,
}: {
  isPrimary: boolean;
  handleCopilotSignIn: () => Promise<void>;
}): React.ReactElement {
  return (
    <SignInButton isPrimary={isPrimary} onClick={handleCopilotSignIn}>
      <FormattedMessage
        id="codex.loggedOut.signInWithCopilot"
        defaultMessage="Sign in with GitHub Copilot"
        description="Button label for GitHub Copilot sign-in on logged out screen"
      />
    </SignInButton>
  );
}

const PRIMARY_SIGN_IN_BUTTON_CLASS_NAME =
  "w-full cursor-interaction justify-center !rounded-full border px-4 py-2 font-medium";
const SECONDARY_SIGN_IN_BUTTON_CLASS_NAME =
  "bg-token-foreground/10 w-full justify-center !rounded-full px-4 py-2 font-medium backdrop-blur-md";

function SignInButton({
  isPrimary,
  onClick,
  children,
}: {
  isPrimary: boolean;
  onClick: () => unknown;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Button
      color={isPrimary ? "primary" : "outline"}
      className={
        isPrimary
          ? PRIMARY_SIGN_IN_BUTTON_CLASS_NAME
          : SECONDARY_SIGN_IN_BUTTON_CLASS_NAME
      }
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/**
 * Button to show API key sign-in form. Note a small disclaimer is shown below
 * the button.
 */
function ApiKeyButton({
  setApiKeyValue,
  defaultApiKeyFromEnv,
  isCopilotSignInAvailable,
  setIsApiKeySignInVisible,
}: {
  setApiKeyValue: React.Dispatch<React.SetStateAction<string>>;
  defaultApiKeyFromEnv: string | null;
  isCopilotSignInAvailable: boolean;
  setIsApiKeySignInVisible: React.Dispatch<React.SetStateAction<boolean>>;
}): React.ReactElement {
  return (
    <div className="pt-2">
      <Button
        color="outline"
        className="w-full justify-center !rounded-full bg-token-foreground/10 px-4 py-2 font-medium backdrop-blur-md"
        onClick={() => {
          setIsApiKeySignInVisible(true);
          setApiKeyValue((currentValue) =>
            currentValue.length > 0
              ? currentValue
              : (defaultApiKeyFromEnv ?? ""),
          );
        }}
      >
        <FormattedMessage
          id="codex.loggedOut.useApiKey"
          defaultMessage="Use API Key"
          description="Secondary button to use API Key auth method"
        />
      </Button>
      <p className="mt-2 w-full text-center text-[10px] text-token-description-foreground">
        {isCopilotSignInAvailable && (
          <FormattedMessage
            id="codex.loggedOut.cloudTasksDisabledWithCopilotAndApiKey"
            defaultMessage="Cloud tasks disabled with Copilot and API key"
            description="Disclaimer explaining that remote features need ChatGPT sign-in"
          />
        )}
        {!isCopilotSignInAvailable && (
          <FormattedMessage
            id="codex.loggedOut.cloudTasksDisabledWithApiKey"
            defaultMessage="Cloud tasks disabled with API key"
            description="Disclaimer explaining that remote features need ChatGPT sign-in"
          />
        )}
      </p>
    </div>
  );
}

/** Form for entering an OpenAI API key. Shown after clicks API key button. */
function ApiKeySignInForm({
  apiKeyValue,
  setApiKeyValue,
  apiKeyInputRef,
  isApiKeyLoginPending,
  setIsApiKeyLoginPending,
  setIsApiKeySignInVisible,
  handleApiKeySubmit,
}: {
  apiKeyValue: string;
  setApiKeyValue: React.Dispatch<React.SetStateAction<string>>;
  apiKeyInputRef: React.RefObject<HTMLInputElement | null>;
  isApiKeyLoginPending: boolean;
  setIsApiKeyLoginPending: React.Dispatch<React.SetStateAction<boolean>>;
  setIsApiKeySignInVisible: React.Dispatch<React.SetStateAction<boolean>>;
  handleApiKeySubmit: () => Promise<void>;
}): React.ReactElement {
  const intl = useIntl();
  return (
    <div className="mx-auto mt-4 mb-8 w-[min(90vw,640px)] rounded-2xl border border-token-border bg-token-dropdown-background/80 px-4 py-4 backdrop-blur-lg">
      <label className="block text-sm text-token-foreground">
        <FormattedMessage
          id="codex.loggedOut.apiKeyPrompt.inputLabel"
          defaultMessage="Enter your OpenAI API key"
          description="Label for API key input"
        />
        <input
          ref={apiKeyInputRef}
          className="mt-4 w-full rounded-lg border border-token-border bg-token-input-background px-3 py-2 text-sm text-token-foreground focus:border-token-focus-border focus:outline-none"
          placeholder={intl.formatMessage({
            id: "codex.loggedOut.apiKeyPrompt.placeholder",
            defaultMessage: "sk-...",
            description: "Placeholder text hint for API key input field",
          })}
          value={apiKeyValue}
          onChange={(event) => {
            setApiKeyValue(event.target.value);
          }}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
        />
      </label>
      <div className="mt-4 flex items-center justify-end gap-2 min-[280px]:justify-between">
        <button
          type="button"
          className="inline-flex cursor-interaction items-center gap-1 text-sm text-token-text-link-foreground hover:underline max-[280px]:hidden"
          onClick={() => {
            messageBus.dispatchMessage("open-in-browser", {
              url: "https://platform.openai.com/api-keys",
            });
          }}
        >
          <FormattedMessage
            id="codex.loggedOut.apiKeyPrompt.getKey"
            defaultMessage="Get API Key"
            description="Button to open OpenAI API key management page"
          />
          <LinkExternalIcon aria-hidden="true" className="icon-2xs" />
        </button>
        <div className="flex justify-end gap-2">
          <Button
            color="ghost"
            onClick={() => {
              setIsApiKeyLoginPending(false);
              setIsApiKeySignInVisible(false);
            }}
          >
            <FormattedMessage
              id="codex.loggedOut.apiKeyPrompt.cancel"
              defaultMessage="Cancel"
              description="Cancel button for API key login"
            />
          </Button>
          <Button
            className="px-4"
            onClick={handleApiKeySubmit}
            disabled={apiKeyValue.trim().length === 0 || isApiKeyLoginPending}
            loading={isApiKeyLoginPending}
          >
            <FormattedMessage
              id="codex.loggedOut.apiKeyPrompt.confirm"
              defaultMessage="OK"
              description="Confirm button for API key login"
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
