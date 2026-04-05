import type { ReactElement, ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";

export function OnboardingLoginContent({
  apiKeyValue,
  isApiKeyEntryVisible,
  isApiKeySignInPending,
  isChatGptSignInPending,
  onApiKeySecondaryAction,
  onApiKeySubmit,
  onApiKeyValueChange,
  onChatGptSignIn,
  onShowApiKeyEntry,
  onShowSshEntry,
  apiKeySecondaryActionLabel,
}: {
  apiKeyValue: string;
  isApiKeyEntryVisible: boolean;
  isApiKeySignInPending: boolean;
  isChatGptSignInPending: boolean;
  onApiKeySecondaryAction: () => void;
  onApiKeySubmit: () => void;
  onApiKeyValueChange: (value: string) => void;
  onChatGptSignIn: () => void;
  onShowApiKeyEntry: () => void;
  onShowSshEntry?: () => void;
  apiKeySecondaryActionLabel: ReactNode;
}): ReactElement {
  const intl = useIntl();

  if (isApiKeyEntryVisible) {
    return (
      <div className="flex w-full flex-col gap-3">
        <label className="text-base font-medium text-token-foreground">
          <FormattedMessage
            id="electron.onboarding.login.apikey.label"
            defaultMessage="OpenAI API key"
            description="Label for API key input on desktop onboarding"
          />
          <input
            autoFocus
            className="mt-2 w-full rounded-xl border border-token-border bg-token-input-background px-4 py-2.5 focus:ring-2 focus:ring-black/15 focus:outline-none"
            placeholder={intl.formatMessage({
              id: "electron.onboarding.login.apikey.placeholder",
              defaultMessage: "sk-...",
              description:
                "Placeholder for API key input on desktop onboarding",
            })}
            value={apiKeyValue}
            onChange={(event) => onApiKeyValueChange(event.target.value)}
          />
        </label>
        <div className="flex items-center gap-2">
          <Button
            color="secondary"
            className="flex flex-1 justify-center py-2"
            onClick={onApiKeySecondaryAction}
          >
            {apiKeySecondaryActionLabel}
          </Button>
          <Button
            className="flex flex-1 justify-center py-2"
            onClick={onApiKeySubmit}
            disabled={apiKeyValue.trim().length === 0 || isApiKeySignInPending}
            loading={isApiKeySignInPending}
          >
            <FormattedMessage
              id="electron.onboarding.login.apikey.continue"
              defaultMessage="Continue"
              description="Continue button label for API key sign-in on desktop onboarding"
            />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[200px] flex-col gap-3">
      <Button
        color="primary"
        className="w-full justify-center py-2.5"
        onClick={onChatGptSignIn}
      >
        {isChatGptSignInPending ? (
          <FormattedMessage
            id="electron.onboarding.login.chatgpt.cancel"
            defaultMessage="Cancel sign-in"
            description="Cancel button label while ChatGPT sign-in is in progress on desktop onboarding"
          />
        ) : (
          <FormattedMessage
            id="electron.onboarding.login.chatgpt.continue"
            defaultMessage="Continue with ChatGPT"
            description="Button label to sign in with ChatGPT on desktop onboarding"
          />
        )}
      </Button>
      {!isChatGptSignInPending ? (
        <Button
          color="outline"
          className="w-full justify-center py-2.5"
          onClick={onShowApiKeyEntry}
        >
          <FormattedMessage
            id="electron.onboarding.login.apikey.open"
            defaultMessage="Enter API key"
            description="Button label to open API key entry on desktop onboarding"
          />
        </Button>
      ) : null}
      {!isChatGptSignInPending && onShowSshEntry != null ? (
        <button
          type="button"
          className="mt-5 text-center text-sm text-token-description-foreground hover:underline"
          onClick={onShowSshEntry}
        >
          <FormattedMessage
            id="electron.onboarding.login.devbox"
            defaultMessage="Connect to a remote SSH"
            description="Connect to a remote server with SSH"
          />
        </button>
      ) : null}
    </div>
  );
}
