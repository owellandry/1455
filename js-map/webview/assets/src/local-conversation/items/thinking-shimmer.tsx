import clsx from "clsx";
import { FormattedMessage } from "react-intl";

export function ThinkingShimmer({
  className,
  message,
}: {
  className?: string;
  message?: React.ReactElement;
}): React.ReactElement {
  return (
    <span
      className={clsx(
        "loading-shimmer-pure-text text-size-chat select-none truncate",
        className,
      )}
    >
      {message ?? (
        <FormattedMessage
          id="thinkingShimmer.default"
          defaultMessage="Thinking"
          description="Default placeholder shown while the assistant is thinking"
        />
      )}
    </span>
  );
}
