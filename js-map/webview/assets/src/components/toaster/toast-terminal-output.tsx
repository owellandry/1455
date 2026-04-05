import type { ReactElement } from "react";

export function ToastTerminalOutput({
  command,
  output,
  message,
}: {
  command?: string | null;
  output?: string | null;
  message?: string | null;
}): ReactElement | null {
  const trimmedOutput = output?.trim() ?? "";
  const trimmedMessage = message?.trim() ?? "";
  const promptGlyph = String.fromCharCode(36);
  const hasCommand = command != null && command.length > 0;
  const hasOutput = trimmedOutput.length > 0;
  const shouldShowMessage =
    trimmedMessage.length > 0 && trimmedMessage !== trimmedOutput;

  if (!hasCommand && !hasOutput && !shouldShowMessage) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-token-terminal-border bg-token-terminal-background px-2.5 py-1.5 pr-8">
      {hasCommand ? (
        <div className="font-vscode-editor text-size-code-sm flex items-start gap-1.5 leading-5 text-token-description-foreground">
          <span className="shrink-0 select-none" aria-hidden="true">
            {promptGlyph}
          </span>
          <pre className="m-0 whitespace-pre-wrap">{command}</pre>
        </div>
      ) : null}
      {hasOutput ? (
        <div className="max-h-20 overflow-auto">
          <pre className="font-vscode-editor text-size-code-sm m-0 whitespace-pre-wrap text-token-terminal-foreground">
            {trimmedOutput}
          </pre>
        </div>
      ) : null}
      {shouldShowMessage ? (
        <div className="text-size-chat-sm text-token-input-validation-error-foreground/85">
          {trimmedMessage}
        </div>
      ) : null}
    </div>
  );
}
