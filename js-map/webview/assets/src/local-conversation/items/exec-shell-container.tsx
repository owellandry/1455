import type React from "react";
import { FormattedMessage } from "react-intl";

import { Shell } from "@/components/shell";
import CheckIcon from "@/icons/check-md.svg";

function ExecShellContainerBase({
  command,
  cwd,
  output,
  isInProgress = false,
  footer,
  autoScrollToBottom = false,
}: {
  command: string;
  cwd?: string;
  output: string;
  isInProgress?: boolean;
  footer?: React.ReactNode;
  autoScrollToBottom?: boolean;
}): React.ReactElement {
  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-token-input-background bg-token-text-code-block-background">
      <Shell
        variant="embedded"
        cwd={cwd}
        command={command}
        output={output}
        isInProgress={isInProgress}
        autoScrollToBottom={autoScrollToBottom}
      />
      {footer}
    </div>
  );
}

function ExecShellFooter({
  isInProgress,
  isSuccess,
  exitCode,
  wasInterrupted = false,
}: {
  isInProgress: boolean;
  isSuccess: boolean;
  exitCode: number | undefined;
  wasInterrupted?: boolean;
}): React.ReactElement {
  if (isInProgress) {
    return <div className="text-size-chat px-2.5 pt-0.5 pb-1" />;
  }
  if (wasInterrupted) {
    return (
      <div className="text-size-chat flex items-center gap-2 px-2.5 pt-0.5 pb-1 text-token-input-placeholder-foreground">
        <span className="ml-auto">
          <FormattedMessage
            id="execFooter.stopped"
            defaultMessage="Stopped"
            description="Exec footer label when a command was interrupted"
          />
        </span>
      </div>
    );
  }
  const codeValue =
    exitCode === undefined ? (
      <FormattedMessage
        id="execFooter.exitCode.unknown"
        defaultMessage="unknown"
        description="Placeholder when an exec command does not report an exit code"
      />
    ) : (
      exitCode
    );

  return (
    <div className="text-size-chat flex items-center gap-2 px-2.5 pt-0.5 pb-1 text-token-input-placeholder-foreground">
      {isSuccess ? (
        <span className="ml-auto flex items-center gap-1">
          <CheckIcon className="icon-xxs" />
          <FormattedMessage
            id="execFooter.success"
            defaultMessage="Success"
            description="Exec footer label when a command succeeds"
          />
        </span>
      ) : (
        <span className="ml-auto">
          <FormattedMessage
            id="execFooter.exitCode"
            defaultMessage="Exit code {code}"
            description="Exec footer label when a command fails"
            values={{
              code: codeValue,
            }}
          />
        </span>
      )}
    </div>
  );
}

export const ExecShellContainer = Object.assign(ExecShellContainerBase, {
  Footer: ExecShellFooter,
});
