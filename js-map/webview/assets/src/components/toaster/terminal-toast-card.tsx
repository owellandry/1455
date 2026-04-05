import type { CommandExecutionOutput } from "protocol";
import type { ReactElement, ReactNode } from "react";
import { useIntl } from "react-intl";

import CopyIcon from "@/icons/copy.svg";
import XIcon from "@/icons/x.svg";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

import { ToastTerminalOutput } from "./toast-terminal-output";

export function TerminalToastCard({
  title,
  message,
  execOutput,
  actions,
  onClose,
}: {
  title: ReactNode;
  message: string | null;
  execOutput?: CommandExecutionOutput;
  actions?: ReactNode;
  onClose?: () => void;
}): ReactElement {
  const intl = useIntl();
  const trimmedOutput = execOutput?.output?.trim() ?? "";
  const trimmedMessage = message?.trim() ?? "";
  const copyText = [
    execOutput?.command != null && execOutput.command.length > 0
      ? `$ ${execOutput.command}`
      : null,
    trimmedOutput.length > 0 ? trimmedOutput : null,
    trimmedMessage.length > 0 && trimmedMessage !== trimmedOutput
      ? trimmedMessage
      : null,
  ]
    .filter((text) => text != null)
    .join("\n");

  return (
    <div className="pointer-events-auto w-[min(390px,calc(100vw-32px))] overflow-hidden rounded-xl border border-token-border bg-token-dropdown-background text-start shadow-lg">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-token-input-validation-error-border"
          aria-hidden="true"
        />
        <div className="text-size-chat-sm min-w-0 flex-1 font-medium text-token-foreground">
          {title}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 cursor-interaction rounded-full opacity-50 transition-opacity hover:bg-token-button-secondary-hover-background/5 hover:opacity-80"
            aria-label={intl.formatMessage({
              id: "codex.alert.closeAriaLabel",
              defaultMessage: "Close",
              description:
                "Aria label for the close button on an alert/toast component",
            })}
          >
            <XIcon className="icon-xs" />
          </button>
        ) : null}
      </div>
      <div className="border-t border-token-border/60 px-3 pt-2 pb-2.5">
        <div className="relative">
          <ToastTerminalOutput
            command={execOutput?.command}
            output={execOutput?.output}
            message={message}
          />
          {copyText.length > 0 ? (
            <button
              type="button"
              className="absolute top-1 right-1 flex h-6 w-6 cursor-interaction items-center justify-center rounded-md text-token-description-foreground opacity-80 hover:bg-token-list-hover-background hover:opacity-100"
              aria-label={intl.formatMessage({
                id: "codex.terminalToast.copyError",
                defaultMessage: "Copy error",
                description:
                  "Aria label for copying terminal error content from a toast",
              })}
              onClick={(event) => {
                void copyToClipboard(copyText, event);
              }}
            >
              <CopyIcon className="icon-2xs" />
            </button>
          ) : null}
        </div>
        {actions ? (
          <div className="mt-2 flex items-center justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
