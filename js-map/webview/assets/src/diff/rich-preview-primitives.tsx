import clsx from "clsx";
import { FormattedMessage } from "react-intl";

import { Spinner } from "@/components/spinner";

export function RichPreviewLoadingContent({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        "text-token-text-secondary flex items-center gap-2",
        className,
      )}
    >
      <Spinner className="icon-xs text-token-input-placeholder-foreground" />
      <FormattedMessage
        id="codex.diffView.richPreviewLoading"
        defaultMessage="Loading preview…"
        description="Loading label while rich preview renders in the diff view"
      />
    </div>
  );
}

export function RichPreviewMessage({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <span className={clsx("text-token-text-secondary text-xs", className)}>
      {children}
    </span>
  );
}

export function RichPreviewPanel({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex min-h-40 flex-col">
      <div className="flex flex-1 items-center justify-center overflow-auto p-3 text-sm">
        {children}
      </div>
    </div>
  );
}
