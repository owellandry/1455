import clsx from "clsx";
import type { ReactElement } from "react";

export function TerminalOutputBlock({
  command,
  output,
  className,
}: {
  command?: string | null;
  output: string;
  className?: string;
}): ReactElement {
  const content = command ? `$ ${command}\n${output}` : output;
  return (
    <div
      className={clsx(
        "bg-token-terminal-background border-token-terminal-border text-token-terminal-foreground max-h-[36vh] overflow-auto rounded-xl border px-3 py-2",
        className,
      )}
    >
      <pre className="font-mono text-xs leading-5 whitespace-pre">
        {content}
      </pre>
    </div>
  );
}
