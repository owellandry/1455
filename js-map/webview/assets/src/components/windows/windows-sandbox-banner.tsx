import clsx from "clsx";
import { type ReactElement, useState } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import { useShowWindowsSandboxBanner } from "@/hooks/use-windows-sandbox-banner";
import {
  useWindowsSandboxSetup,
  type WindowsSandboxSetupPhase,
} from "@/hooks/use-windows-sandbox-setup";
import CheckCircleIcon from "@/icons/check-circle.svg";
import UnlockIcon from "@/icons/unlock.svg";
import XCircleFilledIcon from "@/icons/x-circle-filled.svg";

const WINDOWS_SANDBOX_SUCCESS_DELAY_MS = 5000;

export function WindowsSandboxBannerContent({
  phase,
  showSuccess = false,
  isPending,
  onPrimaryAction,
  onDismiss,
  showRoundedTop = true,
}: {
  phase: WindowsSandboxSetupPhase;
  showSuccess?: boolean;
  isPending: boolean;
  onPrimaryAction: () => void;
  onDismiss: () => void;
  showRoundedTop?: boolean;
}): ReactElement {
  const isRetry = phase === "retryUnelevated" || phase === "failed";
  const isStarting =
    phase === "startingElevated" || phase === "startingUnelevated";
  const isWaiting =
    phase === "waitingElevated" || phase === "waitingUnelevated";
  const isInlinePending = isPending || isStarting || isWaiting;
  const isSuccess = showSuccess && !isInlinePending;
  const showBackupCta = phase === "retryUnelevated" || phase === "failed";

  return (
    <div
      className={clsx(
        "bg-token-input-background/70 text-token-foreground border-token-border/80 relative overflow-clip border-x border-t backdrop-blur-sm",
        showRoundedTop && "rounded-t-2xl",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-row-y">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-token-button-composer-sm w-token-button-composer-sm shrink-0 items-center justify-center">
            {isSuccess ? (
              <CheckCircleIcon className="icon-2xs text-token-charts-green" />
            ) : isInlinePending ? (
              <Spinner className="icon-2xs text-token-description-foreground" />
            ) : isRetry ? (
              <XCircleFilledIcon className="icon-2xs text-token-charts-red" />
            ) : (
              <UnlockIcon className="icon-2xs text-token-foreground" />
            )}
          </div>
          <div className="text-size-chat flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 leading-4">
            <span className="text-token-foreground">
              {isSuccess ? (
                <FormattedMessage
                  id="codex.windowsSandboxBanner.success"
                  defaultMessage="Sandbox is ready"
                  description="Primary status shown when the Windows sandbox has finished setting up"
                />
              ) : isInlinePending ? (
                <FormattedMessage
                  id="codex.windowsSandboxBanner.setupInProgress"
                  defaultMessage="Setting up the sandbox…"
                  description="Primary status shown while the Windows sandbox setup process is in progress"
                />
              ) : isRetry ? (
                <FormattedMessage
                  id="codex.windowsSandboxBanner.setupError"
                  defaultMessage="Couldn't set up admin sandbox"
                  description="Primary status shown when elevated sandbox setup fails and the backup sandbox is available"
                />
              ) : (
                <FormattedMessage
                  id="codex.windowsSandboxBanner.title"
                  defaultMessage="Set up Agent sandbox to continue"
                  description="Primary status shown when Agent mode requires the Windows sandbox to be enabled"
                />
              )}
            </span>
            {isSuccess ? (
              <span className="text-token-description-foreground">
                <FormattedMessage
                  id="codex.windowsSandboxBanner.success.detail"
                  defaultMessage="Codex can now safely edit files and execute commands"
                  description="Secondary status shown after the Windows sandbox finishes setting up"
                />
              </span>
            ) : isInlinePending ? (
              <span className="text-token-description-foreground">
                <FormattedMessage
                  id="codex.windowsSandboxBanner.setupInProgress.detail"
                  defaultMessage="This may take a few minutes"
                  description="Secondary status shown while the Windows sandbox setup process is in progress"
                />
              </span>
            ) : null}
          </div>
        </div>
        {isSuccess ? (
          <Button
            className="shrink-0"
            color="ghostMuted"
            onClick={onDismiss}
            size="composerSm"
            uniform
          >
            <span className="sr-only">
              <FormattedMessage
                id="codex.windowsSandboxBanner.dismiss"
                defaultMessage="Dismiss sandbox setup status"
                description="Screen-reader label for dismissing the compact Windows sandbox status row"
              />
            </span>
            <XCircleFilledIcon
              aria-hidden="true"
              className="icon-xs text-token-muted-foreground"
            />
          </Button>
        ) : isInlinePending ? null : (
          <Button
            className="shrink-0"
            onClick={onPrimaryAction}
            size="composerSm"
          >
            {showBackupCta ? (
              <FormattedMessage
                id="codex.windowsSandboxBanner.backupCta"
                defaultMessage="Use backup sandbox"
                description="Primary button label shown after elevated sandbox setup fails and the backup sandbox is available"
              />
            ) : (
              <FormattedMessage
                id="codex.windowsSandboxBanner.setupCta"
                defaultMessage="Set up"
                description="Primary button label shown in the compact Windows sandbox status row"
              />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export function WindowsSandboxBanner({
  cwd,
  showRoundedTop = true,
}: {
  cwd?: string | null;
  showRoundedTop?: boolean;
}): ReactElement | null {
  const [shouldShowBanner, setShouldShowSandboxBanner] =
    useShowWindowsSandboxBanner();
  const [showSuccess, setShowSuccess] = useState(false);
  const { phase, isPending, startNext, resetError, finalizeEnable } =
    useWindowsSandboxSetup(undefined, cwd);
  if (!shouldShowBanner) {
    return null;
  }
  return (
    <WindowsSandboxBannerContent
      phase={phase}
      showSuccess={showSuccess}
      isPending={isPending}
      showRoundedTop={showRoundedTop}
      onPrimaryAction={() => {
        setShouldShowSandboxBanner(true);
        void (async (): Promise<void> => {
          const sandboxMode = await startNext();
          if (sandboxMode == null) {
            return;
          }
          setShowSuccess(true);
          try {
            await finalizeEnable({
              sandboxMode,
              postEnableDelayMs: WINDOWS_SANDBOX_SUCCESS_DELAY_MS,
              setAgentModeAuto: true,
            });
            setShouldShowSandboxBanner(false);
          } catch {
            setShowSuccess(false);
            // Hook state is already updated with a failure message.
          }
        })();
      }}
      onDismiss={() => {
        setShowSuccess(false);
        resetError();
        setShouldShowSandboxBanner(false);
      }}
    />
  );
}
