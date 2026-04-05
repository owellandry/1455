import { useScope } from "maitai";
import { maybeErrorToString } from "protocol";
import type { ReactElement } from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useAppServerManagerForHost } from "@/app-server/app-server-manager-hooks";
import { Button } from "@/components/button";
import { Dialog, DialogTitle } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { toast$ } from "@/components/toaster/toast-signal";
import XIcon from "@/icons/x.svg";
import { messageBus } from "@/message-bus";
import { OnboardingLoginContent } from "@/onboarding/onboarding-login-content";
import { AppScope } from "@/scopes/app-scope";
import { logger } from "@/utils/logger";

const REMOTE_CONNECTIONS_AUTH_LOG_PREFIX = "[remote-connections/auth]";

export function RemoteConnectionAuthDialog({
  hostId,
  open,
  onOpenChange,
}: {
  hostId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): ReactElement {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const manager = useAppServerManagerForHost(hostId ?? "");
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [isApiKeyEntryVisible, setIsApiKeyEntryVisible] = useState(false);
  const [isApiKeyLoginPending, setIsApiKeyLoginPending] = useState(false);
  const isChatGptSignInPending = abortController != null;

  const resetDialogState = (): void => {
    setAbortController(null);
    setApiKeyValue("");
    setIsApiKeyEntryVisible(false);
    setIsApiKeyLoginPending(false);
  };

  const closeDialog = ({
    abortPendingLogin,
  }: {
    abortPendingLogin: boolean;
  }): void => {
    if (abortPendingLogin) {
      abortController?.abort();
    }
    resetDialogState();
    onOpenChange(false);
  };

  const showSignInErrorToast = (error: unknown): void => {
    scope.get(toast$).warning(
      intl.formatMessage(
        {
          id: "settings.remoteConnections.auth.error",
          defaultMessage: "Sign-in failed: {message}",
          description:
            "Toast shown when remote connection authentication fails",
        },
        {
          message: maybeErrorToString(error),
        },
      ),
    );
  };

  const handleChatGptSignIn = async (): Promise<void> => {
    if (manager == null) {
      showSignInErrorToast("Remote connection manager is unavailable.");
      return;
    }
    if (isChatGptSignInPending) {
      abortController?.abort();
      setAbortController(null);
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const { authUrl, completion } =
        await manager.loginWithChatGpt(controller);
      messageBus.dispatchMessage("open-in-browser", { url: authUrl });
      const result = await completion;
      if (!result.success) {
        logger.warning(
          `${REMOTE_CONNECTIONS_AUTH_LOG_PREFIX} chatgpt_sign_in_failed`,
          {
            safe: {},
            sensitive: { hostId, error: result.error ?? "Unknown error" },
          },
        );
        showSignInErrorToast(result.error ?? "Unknown error");
        return;
      }
      closeDialog({ abortPendingLogin: false });
    } catch (error) {
      if ((error as { name?: string } | null)?.name === "AbortError") {
        return;
      }
      logger.warning(
        `${REMOTE_CONNECTIONS_AUTH_LOG_PREFIX} chatgpt_sign_in_failed`,
        {
          safe: {},
          sensitive: { error, hostId },
        },
      );
      showSignInErrorToast(error);
    } finally {
      setAbortController(null);
    }
  };

  const handleApiKeySubmit = async (): Promise<void> => {
    if (manager == null) {
      showSignInErrorToast("Remote connection manager is unavailable.");
      return;
    }
    const trimmedKey = apiKeyValue.trim();
    if (!trimmedKey || isApiKeyLoginPending) {
      return;
    }

    setIsApiKeyLoginPending(true);
    try {
      await manager.loginWithApiKey(trimmedKey);
      closeDialog({ abortPendingLogin: false });
    } catch (error) {
      logger.warning(
        `${REMOTE_CONNECTIONS_AUTH_LOG_PREFIX} api_key_sign_in_failed`,
        {
          safe: {},
          sensitive: { error, hostId },
        },
      );
      showSignInErrorToast(error);
    } finally {
      setIsApiKeyLoginPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeDialog({ abortPendingLogin: true });
          return;
        }
        onOpenChange(true);
      }}
      contentProps={{ "aria-describedby": undefined }}
      showDialogClose={false}
      size="compact"
    >
      <DialogBody>
        <DialogTitle className="sr-only">
          {intl.formatMessage({
            id: "settings.remoteConnections.auth.title",
            defaultMessage: "Login required",
            description: "Title for the remote connection login dialog",
          })}
        </DialogTitle>
        <DialogSection>
          <div className="flex items-start justify-between gap-3">
            <DialogHeader
              className="min-w-0 flex-1"
              title={
                <FormattedMessage
                  id="settings.remoteConnections.auth.title"
                  defaultMessage="Login required"
                  description="Title for the remote connection login dialog"
                />
              }
              subtitle={
                <FormattedMessage
                  id="settings.remoteConnections.auth.description"
                  defaultMessage="Authenticate this remote Codex connection to continue."
                  description="Description for the remote connection login dialog"
                />
              }
            />
            <Button
              aria-label={intl.formatMessage({
                id: "settings.remoteConnections.auth.closeIcon",
                defaultMessage: "Close",
                description:
                  "Accessible label for the remote connection login dialog close button",
              })}
              className="-mt-1 -mr-1 shrink-0"
              color="ghost"
              size="icon"
              onClick={() => closeDialog({ abortPendingLogin: true })}
            >
              <XIcon className="icon-xs" />
            </Button>
          </div>
        </DialogSection>

        <DialogSection>
          <div className="flex justify-center pt-2">
            <OnboardingLoginContent
              apiKeyValue={apiKeyValue}
              isApiKeyEntryVisible={isApiKeyEntryVisible}
              isApiKeySignInPending={isApiKeyLoginPending}
              isChatGptSignInPending={isChatGptSignInPending}
              onApiKeySecondaryAction={() => {
                setApiKeyValue("");
                setIsApiKeyEntryVisible(false);
              }}
              onApiKeySubmit={handleApiKeySubmit}
              onApiKeyValueChange={setApiKeyValue}
              onChatGptSignIn={handleChatGptSignIn}
              onShowApiKeyEntry={() => setIsApiKeyEntryVisible(true)}
              apiKeySecondaryActionLabel={
                <FormattedMessage
                  id="settings.remoteConnections.auth.back"
                  defaultMessage="Back"
                  description="Back button in the remote connection login dialog"
                />
              }
            />
          </div>
        </DialogSection>

        <DialogSection>
          <DialogFooter>
            <Button
              color="ghost"
              type="button"
              onClick={() => closeDialog({ abortPendingLogin: true })}
            >
              <FormattedMessage
                id="settings.remoteConnections.auth.close"
                defaultMessage="Close"
                description="Close button for the remote connection login dialog"
              />
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </Dialog>
  );
}
